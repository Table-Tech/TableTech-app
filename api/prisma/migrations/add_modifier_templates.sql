-- Migration: Add Modifier Template System
-- This adds the new tables alongside existing ones for backwards compatibility

-- Restaurant-level modifier templates (shared across menu items)
CREATE TABLE "ModifierTemplate" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SINGLE_CHOICE', -- SINGLE_CHOICE, MULTIPLE_CHOICE
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModifierTemplate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ModifierTemplate_restaurantId_name_key" UNIQUE ("restaurantId", "name"),
    CONSTRAINT "ModifierTemplate_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Template options (all possible modifiers for a template)
CREATE TABLE "ModifierOption" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModifierOption_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ModifierOption_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ModifierTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Menu item assignments (which templates are used by which items)
CREATE TABLE "MenuItemModifierGroup" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "displayName" TEXT, -- Override template name for this item
    "required" BOOLEAN NOT NULL DEFAULT false,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemModifierGroup_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MenuItemModifierGroup_menuItemId_templateId_key" UNIQUE ("menuItemId", "templateId"),
    CONSTRAINT "MenuItemModifierGroup_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuItemModifierGroup_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ModifierTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Item-specific modifier overrides (hide options, change prices, etc.)
CREATE TABLE "MenuItemModifierOption" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "priceOverride" DECIMAL(10,2),
    "nameOverride" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemModifierOption_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MenuItemModifierOption_groupId_optionId_key" UNIQUE ("groupId", "optionId"),
    CONSTRAINT "MenuItemModifierOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MenuItemModifierGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuItemModifierOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ModifierOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes for performance
CREATE INDEX "ModifierTemplate_restaurantId_idx" ON "ModifierTemplate"("restaurantId");
CREATE INDEX "ModifierTemplate_isActive_idx" ON "ModifierTemplate"("isActive");

CREATE INDEX "ModifierOption_templateId_idx" ON "ModifierOption"("templateId");
CREATE INDEX "ModifierOption_templateId_displayOrder_idx" ON "ModifierOption"("templateId", "displayOrder");
CREATE INDEX "ModifierOption_isActive_idx" ON "ModifierOption"("isActive");

CREATE INDEX "MenuItemModifierGroup_menuItemId_idx" ON "MenuItemModifierGroup"("menuItemId");
CREATE INDEX "MenuItemModifierGroup_templateId_idx" ON "MenuItemModifierGroup"("templateId");
CREATE INDEX "MenuItemModifierGroup_menuItemId_displayOrder_idx" ON "MenuItemModifierGroup"("menuItemId", "displayOrder");

CREATE INDEX "MenuItemModifierOption_groupId_idx" ON "MenuItemModifierOption"("groupId");
CREATE INDEX "MenuItemModifierOption_optionId_idx" ON "MenuItemModifierOption"("optionId");
CREATE INDEX "MenuItemModifierOption_isHidden_idx" ON "MenuItemModifierOption"("isHidden");