/**
 * API & Network Types
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// WebSocket event types
export interface WebSocketEvent {
  type: 'NEW_ORDER' | 'ORDER_STATUS_UPDATE' | 'ORDER_CANCELLED';
  data: any;
}