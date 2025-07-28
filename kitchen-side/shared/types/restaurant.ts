/**
 * Restaurant Types
 */

export interface Restaurant {
  id: string;
  name: string;
  logoUrl?: string;
  address: string;
  phone: string;
  taxRate: number;
}