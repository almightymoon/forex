# Payment Integration Configuration

This document outlines the environment variables and configuration needed for the payment integration system.

## Environment Variables

### Stripe Configuration
```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Configuration
STRIPE_CURRENCY=usd
STRIPE_WEBHOOK_URL=http://localhost:4000/api/payments/stripe/webhook
```

### JazzCash Configuration
```env
# JazzCash API Configuration
JAZZCASH_BASE_URL=https://sandbox.jazzcash.com.pk
JAZZCASH_MERCHANT_ID=your_merchant_id
JAZZCASH_PASSWORD=your_password
JAZZCASH_INTEGRATION_ID=your_integration_id

# JazzCash URLs
JAZZCASH_RETURN_URL=http://localhost:3000/payment/success
JAZZCASH_NOTIFY_URL=http://localhost:4000/api/payments/jazzcash/webhook
```

### EasyPaisa Configuration
```env
# EasyPaisa API Configuration
EASYPAISA_BASE_URL=https://easypay.easypaisa.com.pk
EASYPAISA_STORE_ID=your_store_id
EASYPAISA_STORE_PASSWORD=your_store_password
EASYPAISA_API_KEY=your_api_key

# EasyPaisa URLs
EASYPAISA_RETURN_URL=http://localhost:3000/payment/success
EASYPAISA_NOTIFY_URL=http://localhost:4000/api/payments/easypaisa/webhook
```

### General Configuration
```env
# Application URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000

# JWT Secret
JWT_SECRET=your_jwt_secret_key
```

## Payment Methods Supported

### 1. Stripe (Credit/Debit Cards)
- **Currencies**: USD, EUR, GBP, PKR
- **Features**: 
  - Payment Intents API
  - Customer management
  - Subscription support
  - Webhook handling
  - Refund support

### 2. JazzCash
- **Currencies**: PKR
- **Features**:
  - Mobile wallet integration
  - Transaction verification
  - Webhook support
  - Refund capability

### 3. EasyPaisa
- **Currencies**: PKR
- **Features**:
  - Mobile wallet integration
  - QR code generation
  - Transaction verification
  - Webhook support
  - Refund capability

## API Endpoints

### Payment Processing
- `POST /api/payments/process` - Process payment
- `POST /api/payments/confirm` - Confirm payment
- `GET /api/payments/methods` - Get available payment methods

### Webhooks
- `POST /api/payments/stripe/webhook` - Stripe webhook
- `POST /api/payments/jazzcash/webhook` - JazzCash webhook
- `POST /api/payments/easypaisa/webhook` - EasyPaisa webhook

### Callbacks
- `POST /api/payments/jazzcash/callback` - JazzCash callback
- `POST /api/payments/easypaisa/callback` - EasyPaisa callback

## Frontend Routes

- `/payment` - Payment page
- `/payment/success` - Payment success page
- `/payment/failed` - Payment failed page

## Testing

### Test Cards (Stripe)
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Insufficient Funds**: 4000 0000 0000 9995

### Test Mobile Numbers
- **JazzCash**: 03001234567
- **EasyPaisa**: 03451234567

## Security Considerations

1. **Environment Variables**: Never commit API keys to version control
2. **Webhook Verification**: Always verify webhook signatures
3. **HTTPS**: Use HTTPS in production
4. **Token Validation**: Validate JWT tokens on all protected routes
5. **Input Validation**: Validate all payment data
6. **Rate Limiting**: Implement rate limiting on payment endpoints

## Production Setup

1. **SSL Certificates**: Ensure SSL certificates are properly configured
2. **Webhook URLs**: Update webhook URLs to production domains
3. **API Keys**: Use production API keys
4. **Monitoring**: Set up payment monitoring and alerts
5. **Logging**: Implement comprehensive payment logging

## Troubleshooting

### Common Issues

1. **Webhook Failures**: Check webhook URL accessibility
2. **Token Expiry**: Implement token refresh mechanism
3. **Currency Mismatch**: Ensure currency compatibility
4. **Network Issues**: Implement retry mechanisms
5. **Validation Errors**: Check input data format

### Debug Mode

Enable debug logging by setting:
```env
DEBUG_PAYMENTS=true
```

## Support

For payment-related issues:
- Stripe: https://support.stripe.com
- JazzCash: https://jazzcash.com.pk/support
- EasyPaisa: https://easypaisa.com.pk/support

