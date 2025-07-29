// Audit logging for compliance and security tracking
import { PrismaClient } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { logger } from './logger.js';

// Import prisma from the plugin (singleton)
const prisma = new PrismaClient();

interface AuditEvent {
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  restaurantId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  ip?: string;
  userAgent?: string;
  severity?: 'info' | 'warning' | 'critical';
  success?: boolean;
}

interface AuditContext {
  userId?: string;
  restaurantId?: string;
  ip?: string;
  userAgent?: string;
}

class AuditLogger {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  /**
   * Core audit logging method - all audits go through here
   */
  async log(event: AuditEvent): Promise<void> {
    try {
      // Create audit record in database (permanent, immutable)
      await this.prisma.auditLog.create({
        data: {
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId,
          userId: event.userId,
          restaurantId: event.restaurantId,
          changes: event.oldValues || event.newValues ? {
            old: event.oldValues || null,
            new: event.newValues || null
          } : undefined,
          metadata: event.metadata,
          ip: event.ip,
          userAgent: event.userAgent,
          severity: event.severity || 'info',
          success: event.success !== false, // Default to true unless explicitly false
          timestamp: new Date()
        }
      });

      // Also log to structured logger for immediate visibility
      const logLevel = event.severity === 'critical' ? 'error' : 
                      event.severity === 'warning' ? 'warn' : 'info';
      
      logger.base[logLevel]({
        category: 'AUDIT',
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        userId: event.userId,
        restaurantId: event.restaurantId,
        severity: event.severity,
        success: event.success
      }, `Audit: ${event.action} on ${event.entityType}`);

    } catch (error) {
      // CRITICAL: Audit failures must never break the application
      // But we need to log them for investigation
      logger.error.log(error as Error, {
        category: 'AUDIT_FAILURE',
        originalEvent: event,
        message: 'Failed to write audit log - this is a critical system issue'
      });
      
      // Don't throw - let the original operation continue
      console.error('AUDIT LOG FAILURE:', error);
    }
  }

  /**
   * Extract common context from Fastify request
   */
  private getRequestContext(req?: FastifyRequest): AuditContext {
    if (!req) return {};
    
    return {
      userId: (req as any).user?.staffId,
      restaurantId: (req as any).user?.restaurantId,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };
  }

  // =================================================================
  // AUTHENTICATION & AUTHORIZATION EVENTS
  // =================================================================

  async staffLogin(staffId: string, email: string, success: boolean, req: FastifyRequest, reason?: string) {
    const context = this.getRequestContext(req);
    await this.log({
      action: 'STAFF_LOGIN',
      entityType: 'Staff',
      entityId: staffId,
      userId: success ? staffId : undefined,
      restaurantId: context.restaurantId,
      metadata: { 
        email, 
        reason: reason || (success ? 'valid_credentials' : 'invalid_credentials'),
        loginTime: new Date().toISOString()
      },
      ip: context.ip,
      userAgent: context.userAgent,
      severity: success ? 'info' : 'warning',
      success
    });
  }

  async staffLogout(staffId: string, req: FastifyRequest, reason: 'manual' | 'timeout' | 'forced' = 'manual') {
    const context = this.getRequestContext(req);
    await this.log({
      action: 'STAFF_LOGOUT',
      entityType: 'Staff',
      entityId: staffId,
      userId: staffId,
      restaurantId: context.restaurantId,
      metadata: { 
        reason,
        logoutTime: new Date().toISOString()
      },
      ip: context.ip,
      userAgent: context.userAgent
    });
  }

  async staffAccessChanged(targetStaffId: string, changes: any, changedBy: string, req: FastifyRequest) {
    const context = this.getRequestContext(req);
    await this.log({
      action: 'STAFF_ACCESS_CHANGED',
      entityType: 'Staff',
      entityId: targetStaffId,
      userId: changedBy,
      restaurantId: context.restaurantId,
      oldValues: changes.old,
      newValues: changes.new,
      metadata: {
        targetStaff: targetStaffId,
        changedBy,
        changeType: changes.type // 'role_change', 'permission_change', 'status_change'
      },
      ip: context.ip,
      userAgent: context.userAgent,
      severity: 'warning' // Access changes are always significant
    });
  }

  // =================================================================
  // ORDER & BUSINESS EVENTS  
  // =================================================================

  async orderCreated(order: any, req?: FastifyRequest) {
    const context = this.getRequestContext(req);
    await this.log({
      action: 'ORDER_CREATED',
      entityType: 'Order',
      entityId: order.id,
      userId: context.userId,
      restaurantId: order.restaurantId,
      newValues: {
        orderNumber: order.orderNumber,
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        totalAmount: Number(order.totalAmount),
        itemCount: order.orderItems?.length || 0,
        tableId: order.tableId,
        paymentStatus: order.paymentStatus
      },
      metadata: {
        orderType: context.userId ? 'staff_order' : 'customer_order',
        sessionId: order.sessionId,
        orderTime: order.createdAt
      },
      ip: context.ip,
      userAgent: context.userAgent
    });
  }

  async orderStatusChanged(orderId: string, oldStatus: string, newStatus: string, staffId: string, req: FastifyRequest) {
    const context = this.getRequestContext(req);
    await this.log({
      action: 'ORDER_STATUS_CHANGED',
      entityType: 'Order',
      entityId: orderId,
      userId: staffId,
      restaurantId: context.restaurantId,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      metadata: {
        statusTransition: `${oldStatus} -> ${newStatus}`,
        updatedBy: staffId,
        updateTime: new Date().toISOString()
      },
      ip: context.ip,
      userAgent: context.userAgent
    });
  }

  async orderCancelled(orderId: string, reason: string, staffId: string, req: FastifyRequest) {
    const context = this.getRequestContext(req);
    await this.log({
      action: 'ORDER_CANCELLED',
      entityType: 'Order',
      entityId: orderId,
      userId: staffId,
      restaurantId: context.restaurantId,
      metadata: {
        reason,
        cancelledBy: staffId,
        cancelTime: new Date().toISOString()
      },
      ip: context.ip,
      userAgent: context.userAgent,
      severity: 'warning' // Order cancellations should be tracked carefully
    });
  }

  // =================================================================
  // PAYMENT EVENTS
  // =================================================================

  async paymentInitiated(paymentData: any, orderId: string, req?: FastifyRequest) {
    const context = this.getRequestContext(req);
    await this.log({
      action: 'PAYMENT_INITIATED',
      entityType: 'Payment',
      entityId: paymentData.molliePaymentId,
      userId: context.userId,
      restaurantId: context.restaurantId,
      newValues: {
        amount: Number(paymentData.amount),
        currency: paymentData.currency || 'EUR',
        method: paymentData.method,
        orderId,
        status: 'initiated'
      },
      metadata: {
        orderId,
        molliePaymentId: paymentData.molliePaymentId,
        initiationTime: new Date().toISOString()
      },
      ip: context.ip,
      userAgent: context.userAgent
    });
  }

  async paymentCompleted(payment: any, webhook: boolean = false) {
    await this.log({
      action: 'PAYMENT_COMPLETED',
      entityType: 'Payment',
      entityId: payment.id,
      restaurantId: payment.order?.restaurantId,
      newValues: {
        amount: Number(payment.amount),
        method: payment.method,
        status: payment.status,
        transactionId: payment.transactionId
      },
      metadata: {
        orderId: payment.orderId,
        completionTime: new Date().toISOString(),
        source: webhook ? 'mollie_webhook' : 'api_update',
        molliePaymentId: payment.molliePaymentId
      },
      severity: 'info'
    });
  }

  async paymentFailed(payment: any, reason: string, webhook: boolean = false) {
    await this.log({
      action: 'PAYMENT_FAILED',
      entityType: 'Payment',
      entityId: payment.id,
      restaurantId: payment.order?.restaurantId,
      oldValues: { status: 'pending' },
      newValues: { status: 'failed' },
      metadata: {
        orderId: payment.orderId,
        reason,
        failureTime: new Date().toISOString(),
        source: webhook ? 'mollie_webhook' : 'api_update',
        molliePaymentId: payment.molliePaymentId
      },
      severity: 'warning',
      success: false
    });
  }

  // =================================================================
  // MENU & PRICING EVENTS
  // =================================================================

  async menuPriceChanged(menuItemId: string, oldPrice: number, newPrice: number, staffId: string, req: FastifyRequest) {
    const context = this.getRequestContext(req);
    await this.log({
      action: 'MENU_PRICE_CHANGED',
      entityType: 'MenuItem',
      entityId: menuItemId,
      userId: staffId,
      restaurantId: context.restaurantId,
      oldValues: { price: oldPrice },
      newValues: { price: newPrice },
      metadata: {
        priceChange: newPrice - oldPrice,
        percentageChange: ((newPrice - oldPrice) / oldPrice * 100).toFixed(2),
        updatedBy: staffId,
        updateTime: new Date().toISOString()
      },
      ip: context.ip,
      userAgent: context.userAgent,
      severity: 'warning' // Price changes are significant for business
    });
  }

  async menuItemStatusChanged(menuItemId: string, oldStatus: boolean, newStatus: boolean, staffId: string, req: FastifyRequest) {
    const context = this.getRequestContext(req);
    await this.log({
      action: 'MENU_ITEM_STATUS_CHANGED',
      entityType: 'MenuItem',
      entityId: menuItemId,
      userId: staffId,
      restaurantId: context.restaurantId,
      oldValues: { isAvailable: oldStatus },
      newValues: { isAvailable: newStatus },
      metadata: {
        statusChange: newStatus ? 'enabled' : 'disabled',
        updatedBy: staffId,
        updateTime: new Date().toISOString()
      },
      ip: context.ip,
      userAgent: context.userAgent
    });
  }

  // =================================================================
  // DATA EXPORT & COMPLIANCE
  // =================================================================

  async dataExported(exportType: string, recordCount: number, staffId: string, req: FastifyRequest) {
    const context = this.getRequestContext(req);
    await this.log({
      action: 'DATA_EXPORTED',
      entityType: 'Export',
      userId: staffId,
      restaurantId: context.restaurantId,
      metadata: {
        exportType,
        recordCount,
        exportedBy: staffId,
        exportTime: new Date().toISOString(),
        fileFormat: 'csv' // Could be dynamic
      },
      ip: context.ip,
      userAgent: context.userAgent,
      severity: 'warning' // Data exports are security-sensitive
    });
  }

  async dataImported(importType: string, recordCount: number, staffId: string, req: FastifyRequest) {
    const context = this.getRequestContext(req);
    await this.log({
      action: 'DATA_IMPORTED',
      entityType: 'Import',
      userId: staffId,
      restaurantId: context.restaurantId,
      metadata: {
        importType,
        recordCount,
        importedBy: staffId,
        importTime: new Date().toISOString()
      },
      ip: context.ip,
      userAgent: context.userAgent,
      severity: 'warning' // Data imports can affect business operations
    });
  }

  // =================================================================
  // SECURITY EVENTS
  // =================================================================

  async suspiciousActivity(type: string, details: any, req: FastifyRequest) {
    const context = this.getRequestContext(req);
    await this.log({
      action: 'SUSPICIOUS_ACTIVITY',
      entityType: 'Security',
      userId: context.userId,
      restaurantId: context.restaurantId,
      metadata: {
        type,
        details,
        detectionTime: new Date().toISOString(),
        endpoint: req.url,
        method: req.method
      },
      ip: context.ip,
      userAgent: context.userAgent,
      severity: 'critical',
      success: false
    });
  }

  async rateLimitExceeded(endpoint: string, attempts: number, req: FastifyRequest) {
    const context = this.getRequestContext(req);
    await this.log({
      action: 'RATE_LIMIT_EXCEEDED',
      entityType: 'Security',
      userId: context.userId,
      metadata: {
        endpoint,
        attempts,
        timeWindow: '1 minute', // Could be dynamic
        exceedTime: new Date().toISOString()
      },
      ip: context.ip,
      userAgent: context.userAgent,
      severity: 'warning',
      success: false
    });
  }
}

// Create singleton audit logger
export const audit = new AuditLogger(prisma);

// Export types for use in other files
export type { AuditEvent, AuditContext };