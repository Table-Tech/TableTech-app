import { z } from "zod";

// Global validation rules - centralized configuration
export const VALIDATION_RULES = {
  // User Input Limits
  NAME: { min: 1, max: 100 },
  EMAIL: { max: 254 }, // RFC 5321 limit
  PASSWORD: { min: 8, max: 128 },
  DESCRIPTION: { max: 500 },
  NOTES: { max: 1000 },
  
  // Business Rules
  PRICE: { min: 0, max: 999999.99 },
  QUANTITY: { min: 1, max: 100 },
  PREPARATION_TIME: { min: 1, max: 300 }, // 5 hours max
  DISPLAY_ORDER: { min: 0, max: 9999 },
  TABLE_CAPACITY: { min: 1, max: 50 },
  
  // Security Limits
  ORDER_ITEMS_LIMIT: 50,
  MODIFIERS_PER_ITEM: 20,
  PHONE_REGEX: /^[\+]?[\d\s\-\(\)]{7,15}$/,
  
  // Sanitization
  ALLOWED_HTML_TAGS: [] as string[], // No HTML allowed
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
} as const;

// Common validation schemas that can be reused
export const CommonSchemas = {
  uuid: z.string().uuid("Invalid ID format"),
  email: z.string()
    .email("Invalid email format")
    .max(VALIDATION_RULES.EMAIL.max, "Email too long")
    .transform(email => email.toLowerCase().trim()),
  
  password: z.string()
    .min(VALIDATION_RULES.PASSWORD.min, `Password must be at least ${VALIDATION_RULES.PASSWORD.min} characters`)
    .max(VALIDATION_RULES.PASSWORD.max, "Password too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")  
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    
  name: z.string()
    .trim()
    .min(VALIDATION_RULES.NAME.min, "Name is required")
    .max(VALIDATION_RULES.NAME.max, "Name too long")
    .regex(/^[a-zA-Z0-9\s\-\.']+$/, "Name contains invalid characters"),
    
  description: z.string()
    .trim()
    .max(VALIDATION_RULES.DESCRIPTION.max, "Description too long")
    .optional(),
    
  notes: z.string()
    .trim()
    .max(VALIDATION_RULES.NOTES.max, "Notes too long")
    .optional(),
    
  price: z.number()
    .min(VALIDATION_RULES.PRICE.min, "Price cannot be negative")
    .max(VALIDATION_RULES.PRICE.max, "Price too high")
    .multipleOf(0.01, "Price can only have 2 decimal places"),
    
  quantity: z.number()
    .int("Quantity must be a whole number")
    .min(VALIDATION_RULES.QUANTITY.min, "Quantity must be at least 1")
    .max(VALIDATION_RULES.QUANTITY.max, "Quantity too high"),
    
  phone: z.string()
    .regex(VALIDATION_RULES.PHONE_REGEX, "Invalid phone number format")
    .optional(),
    
  url: z.string()
    .url("Invalid URL format")
    .optional(),
    
  positiveInt: z.number()
    .int("Must be a whole number")
    .min(0, "Must be positive"),
    
  displayOrder: z.number()
    .int("Display order must be a whole number")
    .min(VALIDATION_RULES.DISPLAY_ORDER.min)
    .max(VALIDATION_RULES.DISPLAY_ORDER.max)
    .default(0),
};

// Business-specific validation helpers
export const BusinessValidation = {
  isValidRestaurantHours: (openTime: string, closeTime: string): boolean => {
    // Add restaurant hours validation logic
    return true; // Simplified for now
  },
  
  isValidMenuItemPrice: (price: number, category: string): boolean => {
    // Category-specific price validation
    if (category === 'BEVERAGES' && price > 50) return false;
    if (category === 'APPETIZERS' && price > 100) return false;
    return true;
  },
  
  isValidOrderTime: (restaurantId: string): boolean => {
    // Check if restaurant is open for orders
    return true; // Simplified for now
  }
};