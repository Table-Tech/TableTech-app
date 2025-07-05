// src/controllers/order.controller.ts
import { FastifyRequest, FastifyReply } from "fastify";
import {
  createOrder,
  getOrderById,
  getOrdersByRestaurant,
  updateOrderStatus,
} from "../services/order.service.js";
import { BusinessLogicError, ResourceNotFoundError } from "../types/errors.js";

// Enhanced handlers using validated data from middleware
export const createOrderHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    // Data is already validated by middleware and available in req.validatedData.body
    const orderData = req.validatedData.body;
    
    // Business logic validation could go here
    // For example: Check if restaurant is open, table exists, etc.
    
    const order = await createOrder(orderData);
    
    return reply.code(201).send({
      success: true,
      data: order,
      message: "Order created successfully"
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] Order creation error:`, error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      throw new ResourceNotFoundError('Menu item or modifier', '');
    }
    
    if (error instanceof Error && error.message.includes('restaurant')) {
      throw new BusinessLogicError('Restaurant is currently closed', 'RESTAURANT_CLOSED');
    }
    
    // Re-throw to be handled by global error handler
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
    
    // Extract restaurantId from query or staff context
    const restaurantId = queryParams.restaurantId || req.staff?.restaurantId;
    
    if (!restaurantId) {
      throw new BusinessLogicError('Restaurant ID is required', 'MISSING_RESTAURANT_ID');
    }
    
    // Authorization: Ensure staff can only access their restaurant's orders
    if (req.staff && req.staff.restaurantId !== restaurantId) {
      throw new BusinessLogicError('Access denied to this restaurant', 'UNAUTHORIZED_RESTAURANT_ACCESS');
    }
    
    const orders = await getOrdersByRestaurant(restaurantId, queryParams);
    
    return reply.send({
      success: true,
      data: orders,
      pagination: {
        limit: queryParams.limit,
        offset: queryParams.offset,
        total: orders.length
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
    
    // Business logic: Check if status transition is valid
    const currentOrder = await getOrderById(id);
    if (!currentOrder) {
      throw new ResourceNotFoundError('Order', id);
    }
    
    // Authorization: Ensure staff can only update their restaurant's orders
    if (req.staff && req.staff.restaurantId !== currentOrder.restaurantId) {
      throw new BusinessLogicError('Access denied to this order', 'UNAUTHORIZED_ORDER_ACCESS');
    }
    
    // Define order status type and transitions
    type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "COMPLETED" | "CANCELLED";
    
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      'PENDING': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['PREPARING', 'CANCELLED'],
      'PREPARING': ['READY', 'CANCELLED'],
      'READY': ['DELIVERED'],
      'DELIVERED': ['COMPLETED'],
      'COMPLETED': [],
      'CANCELLED': []
    } as const;
    
    const currentStatus = currentOrder.status as OrderStatus;
    const newStatus = statusData.status as OrderStatus;
    const allowedNextStatuses = validTransitions[currentStatus] || [];
    
    if (!allowedNextStatuses.includes(newStatus)) {
      throw new BusinessLogicError(
        `Cannot change status from ${currentStatus} to ${newStatus}`,
        'INVALID_STATUS_TRANSITION'
      );
    }
    
    const updatedOrder = await updateOrderStatus(id, statusData);
    
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