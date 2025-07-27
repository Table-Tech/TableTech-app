/**
 * Tables & Seating Types
 */

export interface Table {
  id: string;
  number: number;
  code: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  capacity: number;
}