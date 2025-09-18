const crypto = require('crypto');
const axios = require('axios');

class JazzCashService {
  constructor() {
    this.baseUrl = process.env.JAZZCASH_BASE_URL || 'https://sandbox.jazzcash.com.pk';
    this.merchantId = process.env.JAZZCASH_MERCHANT_ID;
    this.password = process.env.JAZZCASH_PASSWORD;
    this.integrationId = process.env.JAZZCASH_INTEGRATION_ID;
    this.returnUrl = process.env.JAZZCASH_RETURN_URL || 'http://localhost:3000/payment/jazzcash/callback';
    this.notifyUrl = process.env.JAZZCASH_NOTIFY_URL || 'http://localhost:4000/api/payments/jazzcash/webhook';
  }

  /**
   * Generate JazzCash payment request
   * @param {Object} paymentData - Payment details
   * @returns {Object} Payment request data
   */
  async createPaymentRequest(paymentData) {
    try {
      const {
        amount,
        orderId,
        description,
        customerEmail,
        customerPhone,
        customerName,
        currency = 'PKR'
      } = paymentData;

      // Generate unique transaction ID
      const transactionId = this.generateTransactionId();
      
      // Prepare payment data
      const paymentRequest = {
        pp_Version: '1.1',
        pp_TxnType: 'MWALLET',
        pp_Language: 'EN',
        pp_MerchantID: this.merchantId,
        pp_Password: this.password,
        pp_TxnRefNo: transactionId,
        pp_Amount: Math.round(amount * 100), // Convert to paisa
        pp_TxnCurrency: currency,
        pp_TxnDateTime: new Date().toISOString().replace(/[-:]/g, '').split('.')[0],
        pp_BillReference: orderId,
        pp_Description: description,
        pp_TxnExpiryDateTime: this.getExpiryDateTime(),
        pp_ReturnURL: this.returnUrl,
        pp_SecureHash: '',
        ppmpf_1: customerEmail,
        ppmpf_2: customerPhone,
        ppmpf_3: customerName,
        ppmpf_4: 'WEB',
        ppmpf_5: 'PAKISTAN'
      };

      // Generate secure hash
      paymentRequest.pp_SecureHash = this.generateSecureHash(paymentRequest);

      // Store payment request in database for verification
      await this.storePaymentRequest(transactionId, paymentRequest, paymentData);

      return {
        success: true,
        transactionId,
        paymentRequest,
        redirectUrl: `${this.baseUrl}/ApplicationAPI/API/Payment/DoTransaction`
      };

    } catch (error) {
      console.error('JazzCash payment request creation error:', error);
      throw new Error('Failed to create JazzCash payment request');
    }
  }

  /**
   * Verify JazzCash payment response
   * @param {Object} responseData - Response from JazzCash
   * @returns {Object} Verification result
   */
  async verifyPaymentResponse(responseData) {
    try {
      const {
        pp_TxnRefNo,
        pp_ResponseCode,
        pp_ResponseMessage,
        pp_TxnDateTime,
        pp_SettlementDate,
        pp_TxnCurrency,
        pp_Amount,
        pp_AuthCode,
        pp_SecureHash,
        pp_BillReference
      } = responseData;

      // Verify secure hash
      const calculatedHash = this.generateSecureHash(responseData);
      if (calculatedHash !== pp_SecureHash) {
        throw new Error('Invalid secure hash');
      }

      // Check response code
      const isSuccess = pp_ResponseCode === '000';
      
      // Update payment status in database
      await this.updatePaymentStatus(pp_TxnRefNo, {
        status: isSuccess ? 'completed' : 'failed',
        responseCode: pp_ResponseCode,
        responseMessage: pp_ResponseMessage,
        authCode: pp_AuthCode,
        settlementDate: pp_SettlementDate,
        verifiedAt: new Date()
      });

      return {
        success: isSuccess,
        transactionId: pp_TxnRefNo,
        responseCode: pp_ResponseCode,
        responseMessage: pp_ResponseMessage,
        amount: pp_Amount / 100, // Convert back from paisa
        currency: pp_TxnCurrency,
        authCode: pp_AuthCode,
        settlementDate: pp_SettlementDate
      };

    } catch (error) {
      console.error('JazzCash payment verification error:', error);
      throw new Error('Failed to verify JazzCash payment');
    }
  }

  /**
   * Generate secure hash for JazzCash
   * @param {Object} data - Data to hash
   * @returns {String} Secure hash
   */
  generateSecureHash(data) {
    const hashString = [
      data.pp_Version,
      data.pp_TxnType,
      data.pp_Language,
      data.pp_MerchantID,
      data.pp_Password,
      data.pp_TxnRefNo,
      data.pp_Amount,
      data.pp_TxnCurrency,
      data.pp_TxnDateTime,
      data.pp_BillReference,
      data.pp_ReturnURL,
      data.ppmpf_1,
      data.ppmpf_2,
      data.ppmpf_3,
      data.ppmpf_4,
      data.ppmpf_5
    ].join('&');

    return crypto.createHash('sha256').update(hashString).digest('hex').toUpperCase();
  }

  /**
   * Generate unique transaction ID
   * @returns {String} Transaction ID
   */
  generateTransactionId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `JC${timestamp}${random}`.toUpperCase();
  }

  /**
   * Get expiry date time (24 hours from now)
   * @returns {String} Expiry date time
   */
  getExpiryDateTime() {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    return expiryDate.toISOString().replace(/[-:]/g, '').split('.')[0];
  }

  /**
   * Store payment request in database
   * @param {String} transactionId - Transaction ID
   * @param {Object} paymentRequest - Payment request data
   * @param {Object} originalData - Original payment data
   */
  async storePaymentRequest(transactionId, paymentRequest, originalData) {
    try {
      const Payment = require('../models/Payment');
      
      const payment = new Payment({
        user: originalData.userId,
        course: originalData.courseId,
        amount: originalData.amount,
        currency: originalData.currency || 'PKR',
        paymentMethod: 'jazzcash',
        status: 'pending',
        transactionId,
        description: originalData.description,
        type: originalData.type || 'course',
        externalPaymentId: transactionId,
        paymentDetails: {
          jazzcashTransactionId: transactionId,
          customerEmail: originalData.customerEmail,
          customerPhone: originalData.customerPhone,
          customerName: originalData.customerName
        },
        metadata: {
          jazzcashRequest: paymentRequest,
          originalData
        }
      });

      await payment.save();
      return payment;
    } catch (error) {
      console.error('Error storing JazzCash payment request:', error);
      throw error;
    }
  }

  /**
   * Update payment status in database
   * @param {String} transactionId - Transaction ID
   * @param {Object} updateData - Update data
   */
  async updatePaymentStatus(transactionId, updateData) {
    try {
      const Payment = require('../models/Payment');
      
      const payment = await Payment.findOne({ transactionId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      Object.assign(payment, updateData);
      await payment.save();
      
      return payment;
    } catch (error) {
      console.error('Error updating JazzCash payment status:', error);
      throw error;
    }
  }

  /**
   * Refund JazzCash payment
   * @param {String} transactionId - Transaction ID
   * @param {Number} amount - Refund amount
   * @param {String} reason - Refund reason
   * @returns {Object} Refund result
   */
  async refundPayment(transactionId, amount, reason) {
    try {
      // JazzCash refund implementation
      // This would typically involve calling JazzCash refund API
      
      const refundData = {
        pp_Version: '1.1',
        pp_TxnType: 'REFUND',
        pp_Language: 'EN',
        pp_MerchantID: this.merchantId,
        pp_Password: this.password,
        pp_TxnRefNo: transactionId,
        pp_Amount: Math.round(amount * 100),
        pp_TxnCurrency: 'PKR',
        pp_TxnDateTime: new Date().toISOString().replace(/[-:]/g, '').split('.')[0],
        pp_Description: reason,
        pp_SecureHash: ''
      };

      refundData.pp_SecureHash = this.generateSecureHash(refundData);

      // Update payment status
      await this.updatePaymentStatus(transactionId, {
        status: 'refunded',
        refundAmount: amount,
        refundReason: reason,
        refundedAt: new Date()
      });

      return {
        success: true,
        transactionId,
        refundAmount: amount,
        refundReason: reason
      };

    } catch (error) {
      console.error('JazzCash refund error:', error);
      throw new Error('Failed to process JazzCash refund');
    }
  }

  /**
   * Get payment status from JazzCash
   * @param {String} transactionId - Transaction ID
   * @returns {Object} Payment status
   */
  async getPaymentStatus(transactionId) {
    try {
      const statusData = {
        pp_Version: '1.1',
        pp_TxnType: 'INQUIRY',
        pp_Language: 'EN',
        pp_MerchantID: this.merchantId,
        pp_Password: this.password,
        pp_TxnRefNo: transactionId,
        pp_TxnDateTime: new Date().toISOString().replace(/[-:]/g, '').split('.')[0],
        pp_SecureHash: ''
      };

      statusData.pp_SecureHash = this.generateSecureHash(statusData);

      // Call JazzCash inquiry API
      const response = await axios.post(`${this.baseUrl}/ApplicationAPI/API/Payment/Inquiry`, statusData);
      
      return {
        success: true,
        status: response.data.pp_ResponseCode === '000' ? 'completed' : 'failed',
        responseCode: response.data.pp_ResponseCode,
        responseMessage: response.data.pp_ResponseMessage
      };

    } catch (error) {
      console.error('JazzCash status inquiry error:', error);
      throw new Error('Failed to get JazzCash payment status');
    }
  }
}

module.exports = JazzCashService;

