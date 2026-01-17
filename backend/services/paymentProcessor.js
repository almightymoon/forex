const StripeService = require('../config/stripe');
const JazzCashService = require('./jazzcashService');
const EasyPaisaService = require('./easypaisaService');
const Payment = require('../models/Payment');
const PromoCode = require('../models/PromoCode');

class PaymentProcessor {
  constructor() {
    this.stripe = StripeService;
    this.jazzcash = new JazzCashService();
    this.easypaisa = new EasyPaisaService();
  }

  /**
   * Process payment with the specified method
   * @param {Object} paymentData - Payment details
   * @returns {Object} Payment result
   */
  async processPayment(paymentData) {
    try {
      const {
        userId,
        courseId,
        amount,
        currency = 'USD',
        paymentMethod,
        description,
        customerEmail,
        customerPhone,
        customerName,
        promoCode,
        type = 'course'
      } = paymentData;

      // Validate payment data
      this.validatePaymentData(paymentData);

      // Calculate final amount with discounts
      const finalAmount = await this.calculateFinalAmount(amount, promoCode, type);

      // Create payment record
      const payment = await this.createPaymentRecord({
        userId,
        courseId,
        amount,
        finalAmount,
        currency,
        paymentMethod,
        description,
        type,
        promoCode
      });

      // Process payment based on method
      let result;
      switch (paymentMethod.toLowerCase()) {
        case 'stripe':
        case 'credit_card':
        case 'card':
          result = await this.processStripePayment(payment, paymentData);
          break;
        case 'jazzcash':
          result = await this.processJazzCashPayment(payment, paymentData);
          break;
        case 'easypaisa':
          result = await this.processEasyPaisaPayment(payment, paymentData);
          break;
        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

      return {
        success: true,
        paymentId: payment._id,
        transactionId: result.transactionId,
        amount: finalAmount,
        currency,
        paymentMethod,
        redirectUrl: result.redirectUrl,
        clientSecret: result.clientSecret,
        qrCodeUrl: result.qrCodeUrl
      };

    } catch (error) {
      console.error('Payment processing error:', error);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Process Stripe payment
   * @param {Object} payment - Payment record
   * @param {Object} paymentData - Payment data
   * @returns {Object} Stripe payment result
   */
  async processStripePayment(payment, paymentData) {
    try {
      const { customerEmail, customerName } = paymentData;

      // Create Stripe customer
      const customer = await this.stripe.createCustomer(customerEmail, customerName, {
        userId: payment.user.toString(),
        paymentId: payment._id.toString()
      });

      // Create payment intent
      const paymentIntent = await this.stripe.createPaymentIntent(
        payment.finalAmount,
        payment.currency.toLowerCase(),
        {
          userId: payment.user.toString(),
          paymentId: payment._id.toString(),
          courseId: payment.course?.toString()
        }
      );

      // Update payment record
      payment.status = 'processing';
      payment.externalPaymentId = paymentIntent.id;
      payment.paymentDetails = {
        paymentIntentId: paymentIntent.id,
        customerId: customer.id
      };
      await payment.save();

      return {
        transactionId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        redirectUrl: null
      };

    } catch (error) {
      console.error('Stripe payment processing error:', error);
      await payment.failPayment(error.message, 'STRIPE_ERROR');
      throw error;
    }
  }

  /**
   * Process JazzCash payment
   * @param {Object} payment - Payment record
   * @param {Object} paymentData - Payment data
   * @returns {Object} JazzCash payment result
   */
  async processJazzCashPayment(payment, paymentData) {
    try {
      const jazzcashData = {
        ...paymentData,
        userId: payment.user.toString(),
        courseId: payment.course?.toString(),
        amount: payment.finalAmount,
        orderId: payment._id.toString()
      };

      const result = await this.jazzcash.createPaymentRequest(jazzcashData);

      return {
        transactionId: result.transactionId,
        redirectUrl: result.redirectUrl,
        clientSecret: null
      };

    } catch (error) {
      console.error('JazzCash payment processing error:', error);
      await payment.failPayment(error.message, 'JAZZCASH_ERROR');
      throw error;
    }
  }

  /**
   * Process EasyPaisa payment
   * @param {Object} payment - Payment record
   * @param {Object} paymentData - Payment data
   * @returns {Object} EasyPaisa payment result
   */
  async processEasyPaisaPayment(payment, paymentData) {
    try {
      const easypaisaData = {
        ...paymentData,
        userId: payment.user.toString(),
        courseId: payment.course?.toString(),
        amount: payment.finalAmount,
        orderId: payment._id.toString()
      };

      const result = await this.easypaisa.createPaymentRequest(easypaisaData);

      return {
        transactionId: result.transactionId,
        redirectUrl: result.redirectUrl,
        clientSecret: null
      };

    } catch (error) {
      console.error('EasyPaisa payment processing error:', error);
      await payment.failPayment(error.message, 'EASYPAISA_ERROR');
      throw error;
    }
  }

  /**
   * Confirm payment completion
   * @param {String} paymentId - Payment ID
   * @param {Object} confirmationData - Confirmation data
   * @returns {Object} Confirmation result
   */
  async confirmPayment(paymentId, confirmationData) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      switch (payment.paymentMethod.toLowerCase()) {
        case 'stripe':
        case 'credit_card':
        case 'card':
          return await this.confirmStripePayment(payment, confirmationData);
        case 'jazzcash':
          return await this.confirmJazzCashPayment(payment, confirmationData);
        case 'easypaisa':
          return await this.confirmEasyPaisaPayment(payment, confirmationData);
        default:
          throw new Error(`Unsupported payment method: ${payment.paymentMethod}`);
      }

    } catch (error) {
      console.error('Payment confirmation error:', error);
      throw error;
    }
  }

  /**
   * Confirm Stripe payment
   * @param {Object} payment - Payment record
   * @param {Object} confirmationData - Confirmation data
   * @returns {Object} Confirmation result
   */
  async confirmStripePayment(payment, confirmationData) {
    try {
      const { paymentIntentId } = confirmationData;
      
      // Retrieve payment intent from Stripe
      const paymentIntent = await this.stripe.retrievePaymentIntent(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        await payment.completePayment();
        return {
          success: true,
          paymentId: payment._id,
          status: 'completed',
          amount: payment.finalAmount
        };
      } else {
        await payment.failPayment('Payment not completed', 'INCOMPLETE');
        return {
          success: false,
          paymentId: payment._id,
          status: 'failed',
          error: 'Payment not completed'
        };
      }

    } catch (error) {
      console.error('Stripe payment confirmation error:', error);
      await payment.failPayment(error.message, 'CONFIRMATION_ERROR');
      throw error;
    }
  }

  /**
   * Confirm JazzCash payment
   * @param {Object} payment - Payment record
   * @param {Object} confirmationData - Confirmation data
   * @returns {Object} Confirmation result
   */
  async confirmJazzCashPayment(payment, confirmationData) {
    try {
      const result = await this.jazzcash.verifyPaymentResponse(confirmationData);
      
      if (result.success) {
        await payment.completePayment();
        return {
          success: true,
          paymentId: payment._id,
          status: 'completed',
          amount: result.amount
        };
      } else {
        await payment.failPayment(result.responseMessage, result.responseCode);
        return {
          success: false,
          paymentId: payment._id,
          status: 'failed',
          error: result.responseMessage
        };
      }

    } catch (error) {
      console.error('JazzCash payment confirmation error:', error);
      await payment.failPayment(error.message, 'CONFIRMATION_ERROR');
      throw error;
    }
  }

  /**
   * Confirm EasyPaisa payment
   * @param {Object} payment - Payment record
   * @param {Object} confirmationData - Confirmation data
   * @returns {Object} Confirmation result
   */
  async confirmEasyPaisaPayment(payment, confirmationData) {
    try {
      const result = await this.easypaisa.verifyPaymentResponse(confirmationData);
      
      if (result.success) {
        await payment.completePayment();
        return {
          success: true,
          paymentId: payment._id,
          status: 'completed',
          amount: result.amount
        };
      } else {
        await payment.failPayment(result.status, 'EASYPAISA_ERROR');
        return {
          success: false,
          paymentId: payment._id,
          status: 'failed',
          error: result.status
        };
      }

    } catch (error) {
      console.error('EasyPaisa payment confirmation error:', error);
      await payment.failPayment(error.message, 'CONFIRMATION_ERROR');
      throw error;
    }
  }

  /**
   * Calculate final amount with discounts
   * @param {Number} amount - Original amount
   * @param {String} promoCode - Promo code
   * @param {String} type - Payment type
   * @returns {Number} Final amount
   */
  async calculateFinalAmount(amount, promoCode, type) {
    let finalAmount = amount;
    let discountAmount = 0;

    if (promoCode) {
      const promo = await PromoCode.findOne({ 
        code: promoCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() },
        $or: [
          { applicableTo: 'all' },
          { applicableTo: type }
        ]
      });

      if (promo && promo.currentUses < promo.maxUses) {
        if (promo.discountType === 'percentage') {
          discountAmount = (amount * promo.discountValue) / 100;
        } else {
          discountAmount = promo.discountValue;
        }
        
        finalAmount = Math.max(0, amount - discountAmount);
      }
    }

    return finalAmount;
  }

  /**
   * Create payment record
   * @param {Object} data - Payment data
   * @returns {Object} Payment record
   */
  async createPaymentRecord(data) {
    const payment = new Payment({
      user: data.userId,
      course: data.courseId,
      amount: data.amount,
      currency: data.currency,
      paymentMethod: data.paymentMethod,
      status: 'pending',
      description: data.description,
      type: data.type || 'signup',
      package: data.package ? {
        name: data.package.name,
        price: data.package.price || data.amount
      } : undefined,
      promoCode: data.promoCode,
      discountAmount: data.amount - data.finalAmount,
      finalAmount: data.finalAmount
    });

    await payment.save();
    return payment;
  }

  /**
   * Validate payment data
   * @param {Object} data - Payment data
   */
  validatePaymentData(data) {
    const required = ['userId', 'amount', 'paymentMethod'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (data.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const validMethods = ['stripe', 'credit_card', 'card', 'jazzcash', 'easypaisa'];
    if (!validMethods.includes(data.paymentMethod.toLowerCase())) {
      throw new Error(`Invalid payment method: ${data.paymentMethod}`);
    }
  }

  /**
   * Refund payment
   * @param {String} paymentId - Payment ID
   * @param {Number} amount - Refund amount
   * @param {String} reason - Refund reason
   * @returns {Object} Refund result
   */
  async refundPayment(paymentId, amount, reason) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Only completed payments can be refunded');
      }

      let result;
      switch (payment.paymentMethod.toLowerCase()) {
        case 'stripe':
        case 'credit_card':
        case 'card':
          result = await this.stripe.refundPayment(payment.externalPaymentId, amount, reason);
          break;
        case 'jazzcash':
          result = await this.jazzcash.refundPayment(payment.transactionId, amount, reason);
          break;
        case 'easypaisa':
          result = await this.easypaisa.refundPayment(payment.transactionId, amount, reason);
          break;
        default:
          throw new Error(`Unsupported payment method: ${payment.paymentMethod}`);
      }

      await payment.refundPayment(amount, reason, payment.user);

      return {
        success: true,
        paymentId,
        refundAmount: amount,
        refundReason: reason
      };

    } catch (error) {
      console.error('Refund processing error:', error);
      throw error;
    }
  }
}

module.exports = PaymentProcessor;


