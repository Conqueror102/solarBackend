# Paystack Webhook Debugging Guide

## Issue Fixed
The main issue was that **Redis connection was never initialized**, preventing BullMQ workers from processing webhook events.

## Changes Made
1. Added `ensureRedisConnected()` call in `server.ts` to initialize Redis on startup
2. Added `import "./workers/index.js"` to ensure workers start immediately when server starts
3. **CRITICAL**: Moved webhook route BEFORE `express.json()` middleware to preserve raw body for signature verification

## How to Verify the Fix

### 1. Check Redis Connection
After starting your server, you should see:
```
Redis PING = PONG
```

### 2. Check Workers Started
You should see:
```
Workers registered
```

### 3. Monitor Webhook Logs
When a webhook is received, you should see:
```
[Webhook] Received webhook call
[Webhook] Event received: charge.success Reference: <reference>
[Webhook] Processing payment_succeeded for reference: <reference>, amount: <amount>
[Webhook] Successfully enqueued payment_succeeded for reference: <reference>
```

### 4. Monitor Worker Logs
The worker should process the job:
```
[PaymentWorker] Processing webhook event: payment_succeeded for reference: <reference>
[PaymentWorker] Order lookup for reference <reference>: Found order <orderId>
[PaymentWorker] Processing payment status: successful for order <orderId>
[PaymentWorker] Marking order <orderId> as successful
[payment] completed <jobId>
```

## Testing the Webhook

### Local Testing with Paystack
1. Use ngrok or similar to expose your local server:
   ```bash
   ngrok http 5000
   ```

2. Add the webhook URL in Paystack Dashboard:
   ```
   https://your-ngrok-url.ngrok.io/api/paystack/webhook
   ```

3. Make a test payment and watch the logs

### Check BullMQ Dashboard
Visit: `http://localhost:5000/admin/queues`
- You should see the `payment` queue
- Check for completed/failed jobs
- View job details and logs

## Common Issues

### Issue: "Lock acquisition failed"
**Cause**: Multiple workers trying to process the same payment
**Solution**: This is normal - the system prevents duplicate processing

### Issue: "Order not found"
**Cause**: Order doesn't have the `paystackReference` field set
**Solution**: Ensure `/api/paystack/init` is called before payment and sets the reference

### Issue: Webhook returns 401
**Cause**: Invalid signature
**Solution**: 
- Check `PAYSTACK_SECRET` environment variable matches your Paystack secret key
- Ensure you're using the correct key (test vs live)

### Issue: "ERR_INVALID_ARG_TYPE: The 'data' argument must be of type string or an instance of Buffer"
**Cause**: Webhook route is registered after `express.json()` middleware, so body is already parsed
**Solution**: 
- Webhook route MUST be registered BEFORE `express.json()` middleware
- This is already fixed in the updated server.ts

### Issue: Jobs not processing
**Cause**: Redis not connected or workers not started
**Solution**: 
- Check Redis connection logs
- Verify `REDIS_URL` environment variable is correct
- Ensure workers are imported in server.ts

## Environment Variables Required
```
REDIS_URL=redis://localhost:6379  # or your Redis URL
PAYSTACK_SECRET=sk_test_xxx       # Your Paystack secret key
```

## Webhook Events Handled
- `charge.success` → Updates order to paid, sends emails/notifications
- `charge.failed` → Marks order as failed
- `charge.abandoned` → Marks order as failed
- `refund.processed` → Marks order as refunded

## Next Steps
1. Rebuild: `npm run build`
2. Start server: `npm start` or `npm run dev`
3. Test with a real Paystack payment
4. Monitor logs and BullMQ dashboard
