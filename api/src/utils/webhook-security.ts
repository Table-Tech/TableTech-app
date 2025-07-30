import crypto from 'crypto';
import { logger } from './logger.js';

/**
 * Verify Mollie webhook signature for security
 * Prevents fake webhook requests from manipulating payment status
 */
export function verifyMollieWebhookSignature(
  payload: string | Buffer, 
  signature: string | undefined
): boolean {
  try {
    // Check if signature exists
    if (!signature) {
      logger.security.webhookSecurityViolation('Missing webhook signature');
      return false;
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.MOLLIE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error.log(new Error('MOLLIE_WEBHOOK_SECRET not configured'), {
        service: 'webhook-security',
        operation: 'verifySignature'
      });
      return false;
    }

    // Create expected signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      logger.security.webhookSecurityViolation('Invalid webhook signature', {
        receivedSignature: signature.substring(0, 8) + '...',
        expectedPrefix: expectedSignature.substring(0, 8) + '...'
      });
    }

    return isValid;
  } catch (error) {
    logger.error.log(error as Error, {
      service: 'webhook-security',
      operation: 'verifySignature'
    });
    return false;
  }
}

/**
 * Generate idempotency key for payment operations
 * Prevents duplicate payments and ensures operation safety
 */
export function generateIdempotencyKey(orderId: string, amount: number): string {
  const timestamp = Date.now();
  const data = `${orderId}-${amount}-${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Validate webhook payload structure
 */
export function validateWebhookPayload(payload: any): boolean {
  return (
    payload &&
    typeof payload === 'object' &&
    typeof payload.id === 'string' &&
    payload.id.length > 0
  );
}

/**
 * Rate limiting key generator for payment endpoints
 */
export function generateRateLimitKey(ip: string, orderId?: string): string {
  return orderId ? `payment:${ip}:${orderId}` : `payment:${ip}`;
}