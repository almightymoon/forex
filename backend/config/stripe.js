const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Helper function to create payment intent
const createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment intent creation error:', error);
    throw new Error('Failed to create payment intent');
  }
};

// Helper function to create customer
const createCustomer = async (email, name, metadata = {}) => {
  try {
    const customer = await stripe.customers.create({
      email: email,
      name: name,
      metadata: metadata
    });

    return customer;
  } catch (error) {
    console.error('Stripe customer creation error:', error);
    throw new Error('Failed to create customer');
  }
};

// Helper function to create subscription
const createSubscription = async (customerId, priceId, metadata = {}) => {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: metadata,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    return subscription;
  } catch (error) {
    console.error('Stripe subscription creation error:', error);
    throw new Error('Failed to create subscription');
  }
};

// Helper function to create checkout session
const createCheckoutSession = async (lineItems, successUrl, cancelUrl, metadata = {}) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata,
      customer_email: metadata.email,
      billing_address_collection: 'auto',
      shipping_address_collection: {
        allowed_countries: ['PK', 'US', 'GB', 'CA', 'AU'],
      },
    });

    return session;
  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    throw new Error('Failed to create checkout session');
  }
};

// Helper function to retrieve payment intent
const retrievePaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment intent retrieval error:', error);
    throw new Error('Failed to retrieve payment intent');
  }
};

// Helper function to confirm payment intent
const confirmPaymentIntent = async (paymentIntentId, paymentMethodId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment intent confirmation error:', error);
    throw new Error('Failed to confirm payment intent');
  }
};

// Helper function to refund payment
const refundPayment = async (paymentIntentId, amount, reason = 'requested_by_customer') => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(amount * 100), // Convert to cents
      reason: reason,
    });

    return refund;
  } catch (error) {
    console.error('Stripe refund creation error:', error);
    throw new Error('Failed to create refund');
  }
};

// Helper function to create webhook endpoint
const createWebhookEndpoint = async (url, events = ['payment_intent.succeeded', 'payment_intent.payment_failed']) => {
  try {
    const webhookEndpoint = await stripe.webhookEndpoints.create({
      url: url,
      enabled_events: events,
    });

    return webhookEndpoint;
  } catch (error) {
    console.error('Stripe webhook endpoint creation error:', error);
    throw new Error('Failed to create webhook endpoint');
  }
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

module.exports = {
  stripe,
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
