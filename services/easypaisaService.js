const crypto = require('crypto');
const axios = require('axios');

class EasyPaisaService {
  constructor() {
    this.baseUrl = process.env.EASYPAISA_BASE_URL || 'https://easypay.easypaisa.com.pk';
    this.storeId = process.env.EASYPAISA_STORE_ID;
    this.storePassword = process.env.EASYPAISA_STORE_PASSWORD;
    this.returnUrl = process.env.EASYPAISA_RETURN_URL || 'http://localhost:3000/payment/easypaisa/callback';
    this.notifyUrl = process.env.EASYPAISA_NOTIFY_URL || 'http://localhost:4000/api/payments/easypaisa/webhook';
    this.apiKey = process.env.EASYPAISA_API_KEY;
  }

  /**
   * Generate EasyPaisa payment request
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
        storeId: this.storeId,
        orderId: orderId,
        transactionAmount: Math.round(amount * 100), // Convert to paisa
        transactionType: 'MA',
        transactionReferenceNumber: transactionId,
        transactionDateTime: new Date().toISOString(),
        transactionExpiryDateTime: this.getExpiryDateTime(),
        shortDescription: description,
        mobileAccountNo: customerPhone,
        emailAddress: customerEmail,
        customerName: customerName,
        returnURL: this.returnUrl,
        notifyURL: this.notifyUrl,
        hashKey: '',
        postBackURL: this.notifyUrl
      };

      // Generate hash key
      paymentRequest.hashKey = this.generateHashKey(paymentRequest);

      // Store payment request in database for verification
      await this.storePaymentRequest(transactionId, paymentRequest, paymentData);

      return {
        success: true,
        transactionId,
        paymentRequest,
        redirectUrl: `${this.baseUrl}/easypay/Index.js`
      };

    } catch (error) {
      console.error('EasyPaisa payment request creation error:', error);
      throw new Error('Failed to create EasyPaisa payment request');
    }
  }

  /**
   * Verify EasyPaisa payment response
   * @param {Object} responseData - Response from EasyPaisa
   * @returns {Object} Verification result
   */
  async verifyPaymentResponse(responseData) {
    try {
      const {
        orderId,
        transactionReferenceNumber,
        transactionAmount,
        transactionStatus,
        transactionDateTime,
        transactionType,
        paymentMethod,
        paymentToken,
        hashKey
      } = responseData;

      // Verify hash key
      const calculatedHash = this.generateHashKey(responseData);
      if (calculatedHash !== hashKey) {
        throw new Error('Invalid hash key');
      }

      // Check transaction status
      const isSuccess = transactionStatus === 'Success';
      
      // Update payment status in database
      await this.updatePaymentStatus(transactionReferenceNumber, {
        status: isSuccess ? 'completed' : 'failed',
        transactionStatus,
        paymentMethod,
        paymentToken,
        verifiedAt: new Date()
      });

      return {
        success: isSuccess,
        transactionId: transactionReferenceNumber,
        orderId,
        amount: transactionAmount / 100, // Convert back from paisa
        status: transactionStatus,
        paymentMethod,
        paymentToken,
        transactionDateTime
      };

    } catch (error) {
      console.error('EasyPaisa payment verification error:', error);
      throw new Error('Failed to verify EasyPaisa payment');
    }
  }

  /**
   * Generate hash key for EasyPaisa
   * @param {Object} data - Data to hash
   * @returns {String} Hash key
   */
  generateHashKey(data) {
    const hashString = [
      data.storeId,
      data.orderId,
      data.transactionAmount,
      data.transactionType,
      data.transactionReferenceNumber,
      data.transactionDateTime,
      this.storePassword
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
    return `EP${timestamp}${random}`.toUpperCase();
  }

  /**
   * Get expiry date time (24 hours from now)
   * @returns {String} Expiry date time
   */
  getExpiryDateTime() {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    return expiryDate.toISOString();
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
        paymentMethod: 'easypaisa',
        status: 'pending',
        transactionId,
        description: originalData.description,
        type: originalData.type || 'course',
        externalPaymentId: transactionId,
        paymentDetails: {
          easypaisaTransactionId: transactionId,
          customerEmail: originalData.customerEmail,
          customerPhone: originalData.customerPhone,
          customerName: originalData.customerName
        },
        metadata: {
          easypaisaRequest: paymentRequest,
          originalData
        }
      });

      await payment.save();
      return payment;
    } catch (error) {
      console.error('Error storing EasyPaisa payment request:', error);
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
      console.error('Error updating EasyPaisa payment status:', error);
      throw error;
    }
  }

  /**
   * Refund EasyPaisa payment
   * @param {String} transactionId - Transaction ID
   * @param {Number} amount - Refund amount
   * @param {String} reason - Refund reason
   * @returns {Object} Refund result
   */
  async refundPayment(transactionId, amount, reason) {
    try {
      // EasyPaisa refund implementation
      const refundData = {
        storeId: this.storeId,
        orderId: transactionId,
        transactionAmount: Math.round(amount * 100),
        transactionType: 'REFUND',
        transactionReferenceNumber: transactionId,
        transactionDateTime: new Date().toISOString(),
        refundReason: reason,
        hashKey: ''
      };

      refundData.hashKey = this.generateHashKey(refundData);

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
      console.error('EasyPaisa refund error:', error);
      throw new Error('Failed to process EasyPaisa refund');
    }
  }

  /**
   * Get payment status from EasyPaisa
   * @param {String} transactionId - Transaction ID
   * @returns {Object} Payment status
   */
  async getPaymentStatus(transactionId) {
    try {
      const statusData = {
        storeId: this.storeId,
        orderId: transactionId,
        transactionReferenceNumber: transactionId,
        transactionDateTime: new Date().toISOString(),
        hashKey: ''
      };

      statusData.hashKey = this.generateHashKey(statusData);

      // Call EasyPaisa inquiry API
      const response = await axios.post(`${this.baseUrl}/easypay/Inquiry.js`, statusData);
      
      return {
        success: true,
        status: response.data.transactionStatus === 'Success' ? 'completed' : 'failed',
        transactionStatus: response.data.transactionStatus,
        responseMessage: response.data.responseMessage
      };

    } catch (error) {
      console.error('EasyPaisa status inquiry error:', error);
      throw new Error('Failed to get EasyPaisa payment status');
    }
  }

  /**
   * Generate payment QR code for EasyPaisa
   * @param {Object} paymentData - Payment details
   * @returns {Object} QR code data
   */
  async generateQRCode(paymentData) {
    try {
      const qrData = {
        storeId: this.storeId,
        orderId: paymentData.orderId,
        transactionAmount: Math.round(paymentData.amount * 100),
        transactionType: 'QR',
        transactionReferenceNumber: this.generateTransactionId(),
        transactionDateTime: new Date().toISOString(),
        shortDescription: paymentData.description,
        hashKey: ''
      };

      qrData.hashKey = this.generateHashKey(qrData);

      // Generate QR code URL
      const qrCodeUrl = `${this.baseUrl}/easypay/QRCode.js?${new URLSearchParams(qrData).toString()}`;

      return {
        success: true,
        qrCodeUrl,
        transactionId: qrData.transactionReferenceNumber,
        amount: paymentData.amount
      };

    } catch (error) {
      console.error('EasyPaisa QR code generation error:', error);
      throw new Error('Failed to generate EasyPaisa QR code');
    }
  }
}

module.exports = EasyPaisaService;

