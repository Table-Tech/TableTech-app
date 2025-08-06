-- AlterEnum
ALTER TYPE "public"."StaffRole" ADD VALUE 'SUPER_ADMIN';

-- DropForeignKey
ALTER TABLE "public"."OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OrderItemModifier" DROP CONSTRAINT "OrderItemModifier_orderItemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Staff" DROP CONSTRAINT "Staff_restaurantId_fkey";

-- AlterTable
ALTER TABLE "public"."MenuItem" ADD COLUMN     "availabilityNote" TEXT,
ADD COLUMN     "lastUnavailableAt" TIMESTAMP(3),
ADD COLUMN     "stockCount" INTEGER,
ADD COLUMN     "unavailableBy" TEXT;

-- AlterTable
ALTER TABLE "public"."Modifier" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."ModifierGroup" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedBy" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "readyAt" TIMESTAMP(3),
ADD COLUMN     "serviceFee" DECIMAL(10,2),
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Restaurant" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 9.0,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Amsterdam';

-- AlterTable
ALTER TABLE "public"."Staff" ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "loginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxConcurrentSessions" INTEGER NOT NULL DEFAULT 3,
ALTER COLUMN "restaurantId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."ModifierTemplate" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SINGLE_CHOICE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ModifierOption" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MenuItemModifierGroup" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "displayName" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MenuItemModifierOption" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "priceOverride" DECIMAL(10,2),
    "nameOverride" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemModifierOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomerSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CustomerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TableAssistance" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "TableAssistance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "userId" TEXT,
    "restaurantId" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staff_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "userAgent" TEXT,
    "deviceName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeReason" TEXT,
    "refreshTokenHash" TEXT,

    CONSTRAINT "staff_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModifierTemplate_restaurantId_idx" ON "public"."ModifierTemplate"("restaurantId");

-- CreateIndex
CREATE INDEX "ModifierTemplate_isActive_idx" ON "public"."ModifierTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ModifierTemplate_restaurantId_name_key" ON "public"."ModifierTemplate"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "ModifierOption_templateId_idx" ON "public"."ModifierOption"("templateId");

-- CreateIndex
CREATE INDEX "ModifierOption_templateId_displayOrder_idx" ON "public"."ModifierOption"("templateId", "displayOrder");

-- CreateIndex
CREATE INDEX "ModifierOption_isActive_idx" ON "public"."ModifierOption"("isActive");

-- CreateIndex
CREATE INDEX "MenuItemModifierGroup_menuItemId_idx" ON "public"."MenuItemModifierGroup"("menuItemId");

-- CreateIndex
CREATE INDEX "MenuItemModifierGroup_templateId_idx" ON "public"."MenuItemModifierGroup"("templateId");

-- CreateIndex
CREATE INDEX "MenuItemModifierGroup_menuItemId_displayOrder_idx" ON "public"."MenuItemModifierGroup"("menuItemId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemModifierGroup_menuItemId_templateId_key" ON "public"."MenuItemModifierGroup"("menuItemId", "templateId");

-- CreateIndex
CREATE INDEX "MenuItemModifierOption_groupId_idx" ON "public"."MenuItemModifierOption"("groupId");

-- CreateIndex
CREATE INDEX "MenuItemModifierOption_optionId_idx" ON "public"."MenuItemModifierOption"("optionId");

-- CreateIndex
CREATE INDEX "MenuItemModifierOption_isHidden_idx" ON "public"."MenuItemModifierOption"("isHidden");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemModifierOption_groupId_optionId_key" ON "public"."MenuItemModifierOption"("groupId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSession_sessionId_key" ON "public"."CustomerSession"("sessionId");

-- CreateIndex
CREATE INDEX "CustomerSession_sessionId_idx" ON "public"."CustomerSession"("sessionId");

-- CreateIndex
CREATE INDEX "CustomerSession_tableId_idx" ON "public"."CustomerSession"("tableId");

-- CreateIndex
CREATE INDEX "CustomerSession_expiresAt_idx" ON "public"."CustomerSession"("expiresAt");

-- CreateIndex
CREATE INDEX "CustomerSession_isActive_idx" ON "public"."CustomerSession"("isActive");

-- CreateIndex
CREATE INDEX "CustomerSession_lastActiveAt_idx" ON "public"."CustomerSession"("lastActiveAt");

-- CreateIndex
CREATE INDEX "CustomerSession_tableId_isActive_idx" ON "public"."CustomerSession"("tableId", "isActive");

-- CreateIndex
CREATE INDEX "CustomerSession_isActive_expiresAt_idx" ON "public"."CustomerSession"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "TableAssistance_tableId_idx" ON "public"."TableAssistance"("tableId");

-- CreateIndex
CREATE INDEX "TableAssistance_resolvedAt_idx" ON "public"."TableAssistance"("resolvedAt");

-- CreateIndex
CREATE INDEX "TableAssistance_type_idx" ON "public"."TableAssistance"("type");

-- CreateIndex
CREATE INDEX "TableAssistance_requestedAt_idx" ON "public"."TableAssistance"("requestedAt");

-- CreateIndex
CREATE INDEX "TableAssistance_tableId_resolvedAt_idx" ON "public"."TableAssistance"("tableId", "resolvedAt");

-- CreateIndex
CREATE INDEX "TableAssistance_type_resolvedAt_idx" ON "public"."TableAssistance"("type", "resolvedAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "public"."AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_restaurantId_idx" ON "public"."AuditLog"("restaurantId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "public"."AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_severity_idx" ON "public"."AuditLog"("severity");

-- CreateIndex
CREATE INDEX "AuditLog_restaurantId_timestamp_idx" ON "public"."AuditLog"("restaurantId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "public"."AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_action_timestamp_idx" ON "public"."AuditLog"("entityType", "action", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_action_success_timestamp_idx" ON "public"."AuditLog"("action", "success", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_restaurantId_action_idx" ON "public"."AuditLog"("restaurantId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "staff_sessions_sessionId_key" ON "public"."staff_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "staff_sessions_staffId_isActive_idx" ON "public"."staff_sessions"("staffId", "isActive");

-- CreateIndex
CREATE INDEX "staff_sessions_sessionId_idx" ON "public"."staff_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "staff_sessions_expiresAt_idx" ON "public"."staff_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "staff_sessions_isActive_expiresAt_idx" ON "public"."staff_sessions"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "staff_sessions_staffId_createdAt_idx" ON "public"."staff_sessions"("staffId", "createdAt");

-- CreateIndex
CREATE INDEX "staff_sessions_lastActiveAt_idx" ON "public"."staff_sessions"("lastActiveAt");

-- CreateIndex
CREATE INDEX "staff_sessions_revokedAt_idx" ON "public"."staff_sessions"("revokedAt");

-- CreateIndex
CREATE INDEX "MenuCategory_restaurantId_idx" ON "public"."MenuCategory"("restaurantId");

-- CreateIndex
CREATE INDEX "MenuCategory_isActive_idx" ON "public"."MenuCategory"("isActive");

-- CreateIndex
CREATE INDEX "MenuCategory_displayOrder_idx" ON "public"."MenuCategory"("displayOrder");

-- CreateIndex
CREATE INDEX "MenuCategory_restaurantId_isActive_displayOrder_idx" ON "public"."MenuCategory"("restaurantId", "isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "MenuItem_restaurantId_idx" ON "public"."MenuItem"("restaurantId");

-- CreateIndex
CREATE INDEX "MenuItem_categoryId_idx" ON "public"."MenuItem"("categoryId");

-- CreateIndex
CREATE INDEX "MenuItem_isAvailable_idx" ON "public"."MenuItem"("isAvailable");

-- CreateIndex
CREATE INDEX "MenuItem_restaurantId_isAvailable_idx" ON "public"."MenuItem"("restaurantId", "isAvailable");

-- CreateIndex
CREATE INDEX "Modifier_modifierGroupId_idx" ON "public"."Modifier"("modifierGroupId");

-- CreateIndex
CREATE INDEX "Modifier_displayOrder_idx" ON "public"."Modifier"("displayOrder");

-- CreateIndex
CREATE INDEX "Modifier_isActive_idx" ON "public"."Modifier"("isActive");

-- CreateIndex
CREATE INDEX "Modifier_modifierGroupId_displayOrder_idx" ON "public"."Modifier"("modifierGroupId", "displayOrder");

-- CreateIndex
CREATE INDEX "Modifier_modifierGroupId_isActive_idx" ON "public"."Modifier"("modifierGroupId", "isActive");

-- CreateIndex
CREATE INDEX "ModifierGroup_menuItemId_idx" ON "public"."ModifierGroup"("menuItemId");

-- CreateIndex
CREATE INDEX "ModifierGroup_displayOrder_idx" ON "public"."ModifierGroup"("displayOrder");

-- CreateIndex
CREATE INDEX "ModifierGroup_isActive_idx" ON "public"."ModifierGroup"("isActive");

-- CreateIndex
CREATE INDEX "ModifierGroup_menuItemId_displayOrder_idx" ON "public"."ModifierGroup"("menuItemId", "displayOrder");

-- CreateIndex
CREATE INDEX "ModifierGroup_menuItemId_isActive_idx" ON "public"."ModifierGroup"("menuItemId", "isActive");

-- CreateIndex
CREATE INDEX "Order_restaurantId_idx" ON "public"."Order"("restaurantId");

-- CreateIndex
CREATE INDEX "Order_tableId_idx" ON "public"."Order"("tableId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_sessionId_idx" ON "public"."Order"("sessionId");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "public"."Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_molliePaymentId_idx" ON "public"."Order"("molliePaymentId");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "public"."Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_restaurantId_status_idx" ON "public"."Order"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "Order_restaurantId_createdAt_idx" ON "public"."Order"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_tableId_createdAt_idx" ON "public"."Order"("tableId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "public"."Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_menuItemId_idx" ON "public"."OrderItem"("menuItemId");

-- CreateIndex
CREATE INDEX "OrderItem_status_idx" ON "public"."OrderItem"("status");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_status_idx" ON "public"."OrderItem"("orderId", "status");

-- CreateIndex
CREATE INDEX "OrderItem_menuItemId_createdAt_idx" ON "public"."OrderItem"("menuItemId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItemModifier_orderItemId_idx" ON "public"."OrderItemModifier"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderItemModifier_modifierId_idx" ON "public"."OrderItemModifier"("modifierId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "public"."Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_transactionId_idx" ON "public"."Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "public"."Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Restaurant_email_idx" ON "public"."Restaurant"("email");

-- CreateIndex
CREATE INDEX "Restaurant_isActive_idx" ON "public"."Restaurant"("isActive");

-- CreateIndex
CREATE INDEX "Restaurant_createdAt_idx" ON "public"."Restaurant"("createdAt");

-- CreateIndex
CREATE INDEX "Staff_email_idx" ON "public"."Staff"("email");

-- CreateIndex
CREATE INDEX "Staff_restaurantId_idx" ON "public"."Staff"("restaurantId");

-- CreateIndex
CREATE INDEX "Staff_isActive_idx" ON "public"."Staff"("isActive");

-- CreateIndex
CREATE INDEX "Staff_role_idx" ON "public"."Staff"("role");

-- CreateIndex
CREATE INDEX "Staff_restaurantId_role_idx" ON "public"."Staff"("restaurantId", "role");

-- CreateIndex
CREATE INDEX "Staff_lastLoginAt_idx" ON "public"."Staff"("lastLoginAt");

-- CreateIndex
CREATE INDEX "Staff_lockedUntil_idx" ON "public"."Staff"("lockedUntil");

-- CreateIndex
CREATE INDEX "Table_restaurantId_idx" ON "public"."Table"("restaurantId");

-- CreateIndex
CREATE INDEX "Table_status_idx" ON "public"."Table"("status");

-- CreateIndex
CREATE INDEX "Table_restaurantId_status_idx" ON "public"."Table"("restaurantId", "status");

-- AddForeignKey
ALTER TABLE "public"."ModifierTemplate" ADD CONSTRAINT "ModifierTemplate_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModifierOption" ADD CONSTRAINT "ModifierOption_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."ModifierTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItemModifierGroup" ADD CONSTRAINT "MenuItemModifierGroup_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "public"."MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItemModifierGroup" ADD CONSTRAINT "MenuItemModifierGroup_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."ModifierTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItemModifierOption" ADD CONSTRAINT "MenuItemModifierOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."MenuItemModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItemModifierOption" ADD CONSTRAINT "MenuItemModifierOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "public"."ModifierOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."CustomerSession"("sessionId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItemModifier" ADD CONSTRAINT "OrderItemModifier_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "public"."OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Staff" ADD CONSTRAINT "Staff_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerSession" ADD CONSTRAINT "CustomerSession_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableAssistance" ADD CONSTRAINT "TableAssistance_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_sessions" ADD CONSTRAINT "staff_sessions_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
