// ===================== src/utils/logic-validation/restaurant.validation.ts =====================
import { ApiError } from '../../types/errors.js';
import {
  CreateRestaurantDTO,
  UpdateRestaurantDTO
} from '../../schemas/restaurant.schema.js';

/**
 * Shared validations for both create & update operations.
 * DB‑level checks (unique slug/email) are performed in the service layer.
 */
export function validateRestaurantPayload(
  data: CreateRestaurantDTO | UpdateRestaurantDTO
): void {
  // Require at least one contact method
  if (!data.email && !data.phone) {
    throw new ApiError(400, 'MISSING_CONTACT', 'Either e‑mail or phone must be provided');
  }
}