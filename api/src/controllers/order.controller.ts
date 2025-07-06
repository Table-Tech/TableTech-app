// src/controllers/order.controller.ts
import { FastifyRequest, FastifyReply } from "fastify";
import {
  createOrder,
  getOrderById,
  getOrdersByRestaurant,
  updateOrderStatus,
  getOrderStatistics,
  getActiveOrdersCount
} from "../services/order.service.js";
import { 
  BusinessLogicError, 
  ResourceNotFoundError,
  AuthorizationError 
} from "../types/errors.js";
import { 
  OrderError,
  MenuItemNotAvailableError,
  ModifierNotAvailableError,
  TableUnavailableError,
  RestaurantClosedError,
  DuplicateOrderError,
  OrderValueError
} from "../types/errors/order.errors.js";

// Enhanced create order handler with comprehensive error handling
export const createOrderHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const orderData = req.validatedData.body;
    const clientIP = req.ip;
    const requestId = req.requestId;
    
    // Create order with enhanced validation and audit logging
    const order = await createOrder(orderData, requestId, clientIP);
    
    return reply.code(201).send({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        table: order.table,
        orderItems: order.orderItems,
        createdAt: order.createdAt
      },
      message: "Order created successfully"
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] Order creation error:`, error);
    
    // Handle specific order errors
    if (error instanceof MenuItemNotAvailableError ||
        error instanceof ModifierNotAvailableError ||
        error instanceof TableUnavailableError ||
        error instanceof RestaurantClosedError ||
        error instanceof DuplicateOrderError ||
        error instanceof OrderValueError) {
      throw error; // Will be handled by global error handler
    }
    
    if (error instanceof Error) {
      // Log security events for suspicious activity
      if (error.message.includes('validation') || error.message.includes('invalid')) {
        console.warn(`[SECURITY] Potential malicious order attempt from ${req.ip}:`, {
          error: error.message,
          requestId: req.requestId,
          userAgent: req.headers['user-agent']
        });
      }
    }
    
    throw error;
  }
};

export const getOrderHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = req.validatedData.params;
    
    const order = await getOrderById(id);
    
    if (!order) {
      throw new ResourceNotFoundError('Order', id);
    }
    
    // Authorization: Ensure staff can only access their restaurant's orders
    if (req.staff && req.staff.restaurantId !== order.restaurantId) {
      throw new AuthorizationError(
        'Access denied to this order', 
        'ORDER_ACCESS', 
        req.staff.role
      );
    }
    
    return reply.send({
      success: true,
      data: order
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] Get order error:`, error);
    throw error;
  }
};

export const listOrdersHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const queryParams = req.validatedData.query;
    
    // Extract restaurantId - prioritize staff context for security
    const restaurantId = req.staff?.restaurantId || queryParams.restaurantId;
    
    if (!restaurantId) {
      throw new BusinessLogicError('Restaurant ID is required', 'MISSING_RESTAURANT_ID');
    }
    
    // Authorization: Ensure staff can only access their restaurant's orders
    if (req.staff && req.staff.restaurantId !== restaurantId) {
      throw new AuthorizationError(
        'Access denied to this restaurant', 
        'RESTAURANT_ACCESS', 
        req.staff.role
      );
    }
    
    const { orders, totalCount } = await getOrdersByRestaurant(restaurantId, queryParams);
    
    return reply.send({
      success: true,
      data: orders,
      pagination: {
        limit: queryParams.limit,
        offset: queryParams.offset,
        total: totalCount,
        hasMore: queryParams.offset + queryParams.limit < totalCount
      }
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] List orders error:`, error);
    throw error;
  }
};

export const updateOrderStatusHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = req.validatedData.params;
    const statusData = req.validatedData.body;
    const requestId = req.requestId;
    
    // Get current order for authorization
    const currentOrder = await getOrderById(id);
    if (!currentOrder) {
      throw new ResourceNotFoundError('Order', id);
    }
    
    // Authorization: Ensure staff can only update their restaurant's orders
    if (req.staff && req.staff.restaurantId !== currentOrder.restaurantId) {
      throw new AuthorizationError(
        'Access denied to this order', 
        'ORDER_UPDATE', 
        req.staff.role
      );
    }
    
    // Role-based status update permissions
    const userRole = req.staff?.role;
    const newStatus = statusData.status;
    
    // Define which roles can perform which status updates
    const statusPermissions: Record<string, string[]> = {
      'PENDING': ['MANAGER', 'ADMIN'],
      'CONFIRMED': ['MANAGER', 'ADMIN', 'CHEF'],
      'PREPARING': ['CHEF', 'MANAGER', 'ADMIN'],
      'READY': ['CHEF', 'WAITER', 'MANAGER', 'ADMIN'],
      'DELIVERED': ['WAITER', 'MANAGER', 'ADMIN'],
      'COMPLETED': ['MANAGER', 'ADMIN', 'CASHIER'],
      'CANCELLED': ['MANAGER', 'ADMIN']
    };
    
    const allowedRoles = statusPermissions[newStatus] || [];
    if (userRole && !allowedRoles.includes(userRole)) {
      throw new AuthorizationError(
        `Role ${userRole} cannot set order status to ${newStatus}`,
        allowedRoles.join(', '),
        userRole
      );
    }
    
    const updatedOrder = await updateOrderStatus(
      id, 
      statusData, 
      req.staff?.staffId,
      req.staff?.role,
      requestId
    );
    
    return reply.send({
      success: true,
      data: updatedOrder,
      message: `Order status updated to ${newStatus}`
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] Update order status error:`, error);
    throw error;
  }
};

// Additional handlers for enhanced functionality
export const getOrderStatisticsHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { restaurantId } = req.validatedData.params;
    const { days = 7 } = req.validatedData.query || {};
    
    // Authorization check
    if (req.staff && req.staff.restaurantId !== restaurantId) {
      throw new AuthorizationError('Access denied to this restaurant');
    }
    
    // Only managers and admins can view statistics
    if (req.staff && !['MANAGER', 'ADMIN'].includes(req.staff.role)) {
      throw new AuthorizationError(
        'Insufficient permissions to view statistics',
        'MANAGER, ADMIN',
        req.staff.role
      );
    }
    
    const stats = await getOrderStatistics(restaurantId, days);
    
    return reply.send({
      success: true,
      data: stats,
      period: `${days} days`
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] Get order statistics error:`, error);
    throw error;
  }
};

export const getActiveOrdersHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const restaurantId = req.staff?.restaurantId;
    
    if (!restaurantId) {
      throw new BusinessLogicError('Restaurant ID is required', 'MISSING_RESTAURANT_ID');
    }
    
    const activeCount = await getActiveOrdersCount(restaurantId);
    
    return reply.send({
      success: true,
      data: {
        activeOrdersCount: activeCount,
        restaurantId
      }
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] Get active orders error:`, error);
    throw error;
  }
};