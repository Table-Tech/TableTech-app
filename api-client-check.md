# API Client Methods - Restaurant Context Check

## ✅ FIXED - Menu Management
- `createMenuItem(restaurantId, data)` - ✅ Added X-Restaurant-Context header and restaurantId in body
- `updateMenuItem(restaurantId, id, data)` - ✅ Added X-Restaurant-Context header  
- `deleteMenuItem(restaurantId, id)` - ✅ Added X-Restaurant-Context header
- `updateMenuItemAvailability(restaurantId, id, isAvailable, note)` - ✅ Added X-Restaurant-Context header

## ✅ FIXED - Category Management  
- `createMenuCategory(restaurantId, data)` - ✅ Added X-Restaurant-Context header and restaurantId in body
- `updateMenuCategory(restaurantId, id, data)` - ✅ Added X-Restaurant-Context header
- `deleteMenuCategory(restaurantId, id)` - ✅ Added X-Restaurant-Context header

## ✅ FIXED - Table Management
- `createTable(data)` - ✅ Added X-Restaurant-Context header using data.restaurantId

## ✅ OKAY - No Context Needed (Order-specific or SUPER_ADMIN only)
- `createRestaurant(data)` - SUPER_ADMIN only, no restaurant context needed
- `updateOrderStatus(orderId, status, notes)` - Order-specific, no restaurant context needed
- Staff management methods - Need to verify if restaurant context needed

## ❓ TO VERIFY - Modifier Template Methods
- `createModifierTemplate(data)` - Should get restaurant from auth context
- `updateModifierTemplate(id, data)` - Should get restaurant from auth context  
- `deleteModifierTemplate(id)` - Should get restaurant from auth context
- `assignTemplateToMenuItem(menuItemId, data)` - Should work with menu item context

## 📋 GET Methods (Read-only, using query params)
- `getMenuItems(restaurantId)` - Uses query param ✅
- `getMenuCategories(restaurantId)` - Uses query param ✅  
- `getTables(restaurantId)` - Uses query param ✅
- `getStaff(restaurantId)` - Uses query param ✅
- `getOrders(restaurantId, filters)` - Uses query param ✅
- `getKitchenOrders(restaurantId)` - Uses query param ✅

## Status: MAJOR FIXES APPLIED ✅
All critical CRUD operations now have proper restaurant context headers.