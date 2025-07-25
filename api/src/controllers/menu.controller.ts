import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ApiError } from '../types/errors.js';
import { MenuService } from '../services/menu.service.js';
import {
  CreateMenuItemSchema,
  UpdateMenuItemSchema,
  UpdateMenuItemAvailabilitySchema,
  MenuQuerySchema,
  MenuItemParamsSchema,
  CustomerMenuParamsSchema,
  BulkUpdateMenuItemsSchema,
  ReorderMenuItemsSchema,
  GetMenuQuerySchema
} from '../schemas/menu.schema.js';

export class MenuController {
  private svc = new MenuService();

  // =================== STAFF ENDPOINTS ===================

  /** POST /menu - Create menu item */
  async createMenuItem(
    req: AuthenticatedRequest<z.infer<typeof CreateMenuItemSchema>>,
    reply: FastifyReply
  ) {
    // Ensure user can only create items for their restaurant
    if (req.body.restaurantId !== req.user.restaurantId) {
      throw new ApiError(403, 'FORBIDDEN', 'Cannot create menu items for other restaurants');
    }

    const menuItem = await this.svc.createMenuItem(req.body, req.user.staffId);
    return reply.status(201).send({ success: true, data: menuItem });
  }

  /** GET /menu/items - List menu items with filters */
  async listMenuItems(
    req: AuthenticatedRequest<unknown, unknown, z.infer<typeof MenuQuerySchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.getMenuItems(req.user.restaurantId, req.query);
    return reply.send({ 
      success: true, 
      data: result.menuItems,
      pagination: result.pagination
    });
  }

  /** GET /menu/full - Get full menu organized by categories */
  async getFullMenu(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const menu = await this.svc.getMenuByRestaurant(req.user.restaurantId);
    return reply.send({ success: true, data: menu });
  }

  /** GET /menu/items/:id - Get menu item details */
  async getMenuItemById(
    req: AuthenticatedRequest<unknown, z.infer<typeof MenuItemParamsSchema>>,
    reply: FastifyReply
  ) {
    const menuItem = await this.svc.findById(req.params.id);
    
    if (!menuItem) {
      throw new ApiError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found');
    }
    
    // Verify item belongs to user's restaurant
    if (menuItem.restaurantId !== req.user.restaurantId) {
      throw new ApiError(403, 'FORBIDDEN', 'Access denied');
    }
    
    return reply.send({ success: true, data: menuItem });
  }

  /** PATCH /menu/items/:id - Update menu item */
  async updateMenuItem(
    req: AuthenticatedRequest<
      z.infer<typeof UpdateMenuItemSchema>,
      z.infer<typeof MenuItemParamsSchema>
    >,
    reply: FastifyReply
  ) {
    const menuItem = await this.svc.updateMenuItem(
      req.params.id,
      req.body,
      req.user.staffId
    );
    return reply.send({ success: true, data: menuItem });
  }

  /** PATCH /menu/items/:id/availability - Quick availability toggle */
  async updateMenuItemAvailability(
    req: AuthenticatedRequest<
      z.infer<typeof UpdateMenuItemAvailabilitySchema>,
      z.infer<typeof MenuItemParamsSchema>
    >,
    reply: FastifyReply
  ) {
    const menuItem = await this.svc.updateMenuItemAvailability(
      req.params.id,
      req.body,
      req.user.staffId
    );
    return reply.send({ success: true, data: menuItem });
  }

  /** DELETE /menu/items/:id - Delete menu item */
  async deleteMenuItem(
    req: AuthenticatedRequest<unknown, z.infer<typeof MenuItemParamsSchema>>,
    reply: FastifyReply
  ) {
    await this.svc.deleteMenuItem(req.params.id, req.user.staffId);
    return reply.send({ success: true, message: 'Menu item deleted successfully' });
  }

  /** PATCH /menu/items/bulk - Bulk update menu items */
  async bulkUpdateMenuItems(
    req: AuthenticatedRequest<z.infer<typeof BulkUpdateMenuItemsSchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.bulkUpdateMenuItems(req.body, req.user.staffId);
    return reply.send({ 
      success: true, 
      data: result,
      message: `Updated ${result.updated} menu items`
    });
  }

  /** POST /menu/items/reorder - Reorder menu items within category */
  async reorderMenuItems(
    req: AuthenticatedRequest<z.infer<typeof ReorderMenuItemsSchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.reorderMenuItems(req.body, req.user.staffId);
    return reply.send({ 
      success: true, 
      data: result,
      message: `Reordered ${result.updated} menu items`
    });
  }

  /** GET /menu/statistics - Get menu statistics */
  async getMenuStatistics(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const stats = await this.svc.getMenuStatistics(req.user.restaurantId);
    return reply.send({ success: true, data: stats });
  }

  // =================== CUSTOMER ENDPOINTS ===================

  /** GET /menu/customer/:tableCode/:restaurantId - Get customer menu */
  async getCustomerMenu(
    req: FastifyRequest<{ Params: z.infer<typeof CustomerMenuParamsSchema> }>,
    reply: FastifyReply
  ) {
    const customerMenu = await this.svc.getCustomerMenu(
      req.params.tableCode, 
      req.params.restaurantId
    );
    
    return reply.send({
      success: true,
      data: {
        restaurant: customerMenu.restaurant,
        table: customerMenu.table,
        menu: customerMenu.menu,
        timestamp: new Date().toISOString()
      }
    });
  }

  // =================== LEGACY ENDPOINTS (for backward compatibility) ===================

  /** GET /menu - Legacy endpoint for getting menu by restaurant */
  async getLegacyMenu(
    req: FastifyRequest<{ Querystring: z.infer<typeof GetMenuQuerySchema> }>,
    reply: FastifyReply
  ) {
    const menu = await this.svc.getMenuByRestaurant(req.query.restaurantId);
    return reply.send({ success: true, data: menu });
  }
}

// Legacy function exports (for backward compatibility - to be removed later)
export const createMenuItemHandler = async (
  req: FastifyRequest<{ Body: z.infer<typeof CreateMenuItemSchema> }>, 
  reply: FastifyReply
) => {
  const controller = new MenuController();
  return await controller.createMenuItem(req as any, reply);
};

export const getMenuHandler = async (
  req: FastifyRequest<{ Querystring: z.infer<typeof GetMenuQuerySchema> }>, 
  reply: FastifyReply
) => {
  const controller = new MenuController();
  return await controller.getLegacyMenu(req, reply);
};

export const getCustomerMenuHandler = async (
  req: FastifyRequest<{ Params: { tableCode: string; restaurantId: string } }>,
  reply: FastifyReply
) => {
  const controller = new MenuController();
  return await controller.getCustomerMenu(req as any, reply);
};