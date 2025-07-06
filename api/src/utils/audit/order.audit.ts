// src/utils/order.audit.ts

export interface OrderAuditEvent {
  orderId: string;
  action: string;
  actorType: 'CUSTOMER' | 'STAFF' | 'SYSTEM';
  actorId?: string;
  actorRole?: string;
  restaurantId: string;
  tableId?: string;
  details: Record<string, any>;
  timestamp: Date;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class OrderAuditLogger {
  private static logs: OrderAuditEvent[] = [];

  static log(event: Omit<OrderAuditEvent, 'timestamp'>): void {
    const auditEvent: OrderAuditEvent = {
      ...event,
      timestamp: new Date()
    };

    // Store in memory (in production, use database or logging service)
    this.logs.push(auditEvent);

    // Console log for development
    console.log(`[ORDER_AUDIT] ${auditEvent.timestamp.toISOString()}`, {
      orderId: auditEvent.orderId,
      action: auditEvent.action,
      actor: `${auditEvent.actorType}:${auditEvent.actorId || 'anonymous'}`,
      restaurant: auditEvent.restaurantId,
      details: auditEvent.details
    });

    // Cleanup old logs (keep last 1000)
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  static logOrderCreation(
    orderId: string,
    restaurantId: string,
    tableId: string,
    orderTotal: number,
    itemCount: number,
    requestId?: string,
    ipAddress?: string
  ): void {
    this.log({
      orderId,
      action: 'ORDER_CREATED',
      actorType: 'CUSTOMER',
      restaurantId,
      tableId,
      details: {
        totalAmount: orderTotal,
        itemCount,
        paymentStatus: 'PENDING'
      },
      requestId,
      ipAddress
    });
  }

  static logStatusChange(
    orderId: string,
    restaurantId: string,
    fromStatus: string,
    toStatus: string,
    staffId?: string,
    staffRole?: string,
    estimatedTime?: number,
    requestId?: string
  ): void {
    this.log({
      orderId,
      action: 'STATUS_CHANGED',
      actorType: staffId ? 'STAFF' : 'SYSTEM',
      actorId: staffId,
      actorRole: staffRole,
      restaurantId,
      details: {
        fromStatus,
        toStatus,
        estimatedTime
      },
      requestId
    });
  }

  static logPaymentUpdate(
    orderId: string,
    restaurantId: string,
    paymentStatus: string,
    paymentMethod?: string,
    transactionId?: string,
    amount?: number
  ): void {
    this.log({
      orderId,
      action: 'PAYMENT_UPDATED',
      actorType: 'SYSTEM',
      restaurantId,
      details: {
        paymentStatus,
        paymentMethod,
        transactionId,
        amount
      }
    });
  }

  static logOrderCancellation(
    orderId: string,
    restaurantId: string,
    reason: string,
    staffId?: string,
    staffRole?: string,
    requestId?: string
  ): void {
    this.log({
      orderId,
      action: 'ORDER_CANCELLED',
      actorType: staffId ? 'STAFF' : 'CUSTOMER',
      actorId: staffId,
      actorRole: staffRole,
      restaurantId,
      details: {
        reason,
        cancelledAt: new Date().toISOString()
      },
      requestId
    });
  }

  static logOrderModification(
    orderId: string,
    restaurantId: string,
    modifications: Record<string, any>,
    staffId?: string,
    staffRole?: string,
    requestId?: string
  ): void {
    this.log({
      orderId,
      action: 'ORDER_MODIFIED',
      actorType: staffId ? 'STAFF' : 'CUSTOMER',
      actorId: staffId,
      actorRole: staffRole,
      restaurantId,
      details: modifications,
      requestId
    });
  }

  static logSecurityEvent(
    orderId: string,
    restaurantId: string,
    eventType: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): void {
    this.log({
      orderId,
      action: `SECURITY_${eventType}`,
      actorType: 'SYSTEM',
      restaurantId,
      details,
      ipAddress,
      userAgent
    });
  }

  // Get audit trail for an order
  static getOrderAuditTrail(orderId: string): OrderAuditEvent[] {
    return this.logs
      .filter(log => log.orderId === orderId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Get recent events for a restaurant
  static getRestaurantAuditTrail(
    restaurantId: string, 
    limit: number = 100
  ): OrderAuditEvent[] {
    return this.logs
      .filter(log => log.restaurantId === restaurantId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Get suspicious activities
  static getSuspiciousActivities(timeWindowMs: number = 3600000): OrderAuditEvent[] {
    const now = new Date();
    const cutoff = new Date(now.getTime() - timeWindowMs);
    
    return this.logs
      .filter(log => 
        log.timestamp >= cutoff && 
        log.action.startsWith('SECURITY_')
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}