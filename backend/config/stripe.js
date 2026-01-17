// STRIPE PAYMENTS TEMPORARILY DISABLED
// All payment processing is disabled - functions return errors immediately

// Helper function to create payment intent - DISABLED
const createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  // Payments disabled - return error immediately WITHOUT calling Stripe
  console.log('⚠️ Payment intent creation attempted but payments are DISABLED');
  console.log('⚠️ This function should not be called. Check your code for payment processing.');
  const error = new Error('Payment processing is currently disabled. Please remove payment method selection.');
  error.code = 'PAYMENTS_DISABLED';
  throw error;
  
  // OLD CODE - DISABLED
  // if (!stripe) {
  //   throw new Error('Stripe is not configured');
  // }
  // try {
  //   const paymentIntent = await stripe.paymentIntents.create({
  //     amount: Math.round(amount * 100), // Convert to cents
  //     currency: currency.toLowerCase(),
  //     metadata: metadata,
  //     automatic_payment_methods: {
  //       enabled: true,
  //     },
  //   });
  //   return paymentIntent;
  // } catch (error) {
  //   console.error('Stripe payment intent creation error:', error);
  //   throw new Error('Failed to create payment intent');
  // }
};

// Helper function to create customer - DISABLED
const createCustomer = async (email, name, metadata = {}) => {
  console.log('Customer creation attempted but payments are disabled');
  throw new Error('Payment processing is currently disabled');
};

// Helper function to create subscription - DISABLED
const createSubscription = async (customerId, priceId, metadata = {}) => {
  console.log('Subscription creation attempted but payments are disabled');
  throw new Error('Payment processing is currently disabled');
};

// Helper function to create checkout session - DISABLED
const createCheckoutSession = async (lineItems, successUrl, cancelUrl, metadata = {}) => {
  console.log('Checkout session creation attempted but payments are disabled');
  throw new Error('Payment processing is currently disabled');
};

// Helper function to retrieve payment intent - DISABLED
const retrievePaymentIntent = async (paymentIntentId) => {
  console.log('Payment intent retrieval attempted but payments are disabled');
  throw new Error('Payment processing is currently disabled');
};

// Helper function to confirm payment intent - DISABLED
const confirmPaymentIntent = async (paymentIntentId, paymentMethodId) => {
  console.log('Payment intent confirmation attempted but payments are disabled');
  throw new Error('Payment processing is currently disabled');
};

// Helper function to refund payment - DISABLED
const refundPayment = async (paymentIntentId, amount, reason = 'requested_by_customer') => {
  console.log('Refund attempted but payments are disabled');
  throw new Error('Payment processing is currently disabled');
};

// Helper function to create webhook endpoint - DISABLED
const createWebhookEndpoint = async (url, events = ['payment_intent.succeeded', 'payment_intent.payment_failed']) => {
  console.log('Webhook endpoint creation attempted but payments are disabled');
  throw new Error('Payment processing is currently disabled');
};

// Helper function to construct line items for checkout
const constructLineItems = (items) => {
  return items.map(item => ({
    price_data: {
      currency: item.currency || 'usd',
      product_data: {
        name: item.name,
        description: item.description,
        images: item.images || [],
      },
      unit_amount: Math.round(item.price * 100), // Convert to cents
    },
    quantity: item.quantity || 1,
  }));
};

// Helper function to handle webhook events
const handleWebhookEvent = (event) => {
  switch (event.type) {
    case 'payment_intent.succeeded':
      return {
        type: 'payment_succeeded',
        data: event.data.object,
        metadata: event.data.object.metadata
      };
    
    case 'payment_intent.payment_failed':
      return {
        type: 'payment_failed',
        data: event.data.object,
        metadata: event.data.object.metadata
      };
    
    case 'customer.subscription.created':
      return {
        type: 'subscription_created',
        data: event.data.object,
        metadata: event.data.object.metadata
      };
    
    case 'customer.subscription.updated':
      return {
        type: 'subscription_updated',
        data: event.data.object,
        metadata: event.data.object.metadata
      };
    
    case 'customer.subscription.deleted':
      return {
        type: 'subscription_deleted',
        data: event.data.object,
        metadata: event.data.object.metadata
      };
    
    default:
      return {
        type: 'unknown',
        data: event.data.object
      };
  }
};

// Helper function to format amount for display
const formatAmount = (amount, currency = 'usd') => {
  const currencies = {
    usd: { symbol: '$', position: 'before' },
    pkr: { symbol: '₨', position: 'before' },
    eur: { symbol: '€', position: 'before' },
    gbp: { symbol: '£', position: 'before' }
  };

  const currencyInfo = currencies[currency.toLowerCase()] || currencies.usd;
  const formattedAmount = (amount / 100).toFixed(2);

  if (currencyInfo.position === 'before') {
    return `${currencyInfo.symbol}${formattedAmount}`;
  } else {
    return `${formattedAmount}${currencyInfo.symbol}`;
  }
};

// Export null stripe to prevent any accidental API calls
module.exports = {
  stripe: null, // Stripe completely disabled
  createPaymentIntent,
  createCustomer,
  createSubscription,
  createCheckoutSession,
  retrievePaymentIntent,
  confirmPaymentIntent,
  refundPayment,
  createWebhookEndpoint,
  constructLineItems,
  handleWebhookEvent,
  formatAmount
};
