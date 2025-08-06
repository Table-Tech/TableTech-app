# Modifier System Migration Plan

## Overview
Migrating from broken modifier clone system to professional template-based modifier system.

## Current Problems Analyzed
1. **Placeholder Menu Items**: Creates `__MODIFIER_GROUP_PLACEHOLDER__` items to simulate restaurant-level modifiers
2. **Cloning Instead of Referencing**: `assignModifierGroupToMenuItem` creates full copies instead of references
3. **No Update Propagation**: Changes to templates don't affect already-assigned items
4. **Complex Workarounds**: Hacky placeholder logic that's hard to maintain

## New System Architecture

### Template + Override Pattern
```
Restaurant → ModifierTemplate → ModifierOption
    ↓                ↓
MenuItem → MenuItemModifierGroup → MenuItemModifierOption (overrides)
```

### Database Changes
✅ **Added new tables** (backwards compatible):
- `ModifierTemplate` - Restaurant-level reusable templates
- `ModifierOption` - Options within templates (Size: Small, Medium, Large)  
- `MenuItemModifierGroup` - Assignment of template to menu item with settings
- `MenuItemModifierOption` - Item-specific overrides (hide options, change prices)

## Migration Phases

### Phase 1: Database Schema ✅ COMPLETED
- [x] Added new modifier template tables to Prisma schema
- [x] Updated Restaurant and MenuItem relations
- [x] Maintains backwards compatibility with existing system

### Phase 2: API Services 🚧 IN PROGRESS  
- [ ] Create ModifierTemplateService with CRUD operations
- [ ] Create MenuItemModifierService for assignments/overrides
- [ ] Add new API endpoints for template management
- [ ] Migrate existing modifier groups to templates

### Phase 3: Frontend Updates
- [ ] Build template management UI for restaurant admin
- [ ] Update menu item modifier assignment interface  
- [ ] Add item-specific override controls (hide/show options, price changes)
- [ ] Update customer ordering flow to use new system

### Phase 4: Data Migration & Cleanup
- [ ] Migrate existing modifier groups to template system
- [ ] Remove placeholder menu items and categories
- [ ] Clean up old ModifierGroup/Modifier tables (after confirming new system works)
- [ ] Update API client methods

## Key Features of New System

### 1. Shared Templates
```typescript
// Create once, use everywhere
const sizeTemplate = {
  name: "Size", 
  type: "SINGLE_CHOICE",
  options: [
    { name: "Small", price: 0 },
    { name: "Medium", price: 1.50 },
    { name: "Large", price: 3.00 }
  ]
}
```

### 2. Item-Specific Customization  
```typescript
// Burger - hide Small option, default to Medium
const burgerSizeConfig = {
  templateId: sizeTemplate.id,
  required: true,
  optionOverrides: [
    { optionId: "small", isHidden: true },
    { optionId: "medium", isDefault: true }
  ]
}
```

### 3. Update Propagation
- Change template price → Updates everywhere (unless overridden)
- Add new option to template → Available for all items using that template
- Item-specific overrides remain intact

## Benefits

### For Restaurant Owners
- Create modifiers once, reuse across menu
- Bulk price updates across multiple items
- Item-specific customization when needed

### For Developers  
- Clean, maintainable code
- No more placeholder workarounds
- Professional POS system architecture
- Easy to extend and scale

### For Customers
- Consistent modifier experience
- Always see latest options and prices
- Proper item customization

## Implementation Status

### ✅ Completed
- Database schema design
- Prisma model relationships
- Migration plan documentation

### 🚧 In Progress
- API services implementation
- Template CRUD endpoints
- Assignment/override logic

### ⏳ Pending
- Frontend template management UI
- Customer ordering flow updates
- Data migration scripts
- Testing and validation

## Risk Mitigation

### Backwards Compatibility
- New tables added alongside existing ones
- Old system continues to work during migration
- Gradual rollout possible

### Rollback Plan
- Keep existing modifier system until new one is fully tested
- Feature flags to switch between systems
- Database rollback scripts if needed

### Testing Strategy
- Unit tests for new services
- Integration tests for template assignment
- End-to-end tests for customer ordering
- Load testing for performance validation

This migration will solve the core issue of modifier updates not propagating while creating a professional, scalable modifier system.