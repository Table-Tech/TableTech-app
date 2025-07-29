export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_ORDER';
  restaurantId: string;
  code: string; // Permanent table code for QR
  qrCodeUrl?: string; // Permanent QR code image URL
  currentOrderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTablePayload {
  number: number;
  capacity: number;
  restaurantId: string;
}

export interface UpdateTablePayload {
  number?: number;
  capacity?: number;
  status?: Table['status'];
}

export interface TableFilters {
  status?: Table['status'];
  capacity?: number;
  search?: string;
}