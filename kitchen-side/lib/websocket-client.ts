"use client";

import { io, Socket } from 'socket.io-client';

class WebSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(restaurantId: string, token?: string) {
    if (this.socket?.connected) {
      return; // Already connected
    }

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    
    this.socket = io(WS_URL, {
      auth: {
        token: token || localStorage.getItem('token'),
      },
      query: {
        type: 'staff',
        restaurantId,
      },
      transports: ['websocket'],
      upgrade: true,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('internal:connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('internal:disconnected', reason);
      
      // Auto-reconnect logic
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }
      
      this.attemptReconnect(restaurantId, token);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emit('internal:error', error);
    });

    // Handle business events
    this.socket.on('newOrder', (order) => {
      this.emit('newOrder', order);
    });

    this.socket.on('orderStatusUpdate', (data) => {
      this.emit('orderStatusUpdate', data);
    });

    this.socket.on('orderCancelled', (data) => {
      this.emit('orderCancelled', data);
    });

    this.socket.on('tableStatusUpdate', (data) => {
      this.emit('tableStatusUpdate', data);
    });

    this.socket.on('staffMessage', (data) => {
      this.emit('staffMessage', data);
    });
  }

  private attemptReconnect(restaurantId: string, token?: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect(restaurantId, token);
    }, delay);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function) {
    if (!this.listeners.has(event)) return;
    
    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket callback:', error);
        }
      });
    }
  }

  // Send events to server
  updateOrderStatus(orderId: string, status: string) {
    if (this.socket?.connected) {
      this.socket.emit('updateOrderStatus', { orderId, status });
    }
  }

  joinRestaurant(restaurantId: string) {
    if (this.socket?.connected) {
      this.socket.emit('joinRestaurant', { restaurantId });
    }
  }

  leaveRestaurant(restaurantId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leaveRestaurant', { restaurantId });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' | 'error' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    // Socket.io doesn't have a direct 'connecting' property, use disconnected as fallback
    if (this.socket.disconnected) return 'disconnected';
    return 'error';
  }
}

// Create singleton instance
export const wsClient = new WebSocketClient();

// React hook for using WebSocket in components
import { useEffect, useState, useCallback } from 'react';

export function useWebSocket(restaurantId?: string) {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>('disconnected');

  useEffect(() => {
    if (!restaurantId) return;

    const token = localStorage.getItem('token');
    wsClient.connect(restaurantId, token || undefined);

    const handleConnected = () => setConnectionStatus('connected');
    const handleDisconnected = () => setConnectionStatus('disconnected');
    const handleError = () => setConnectionStatus('error');

    wsClient.on('internal:connected', handleConnected);
    wsClient.on('internal:disconnected', handleDisconnected);
    wsClient.on('internal:error', handleError);

    return () => {
      wsClient.off('internal:connected', handleConnected);
      wsClient.off('internal:disconnected', handleDisconnected);
      wsClient.off('internal:error', handleError);
    };
  }, [restaurantId]);

  const subscribe = useCallback((event: string, callback: Function) => {
    wsClient.on(event, callback);
    return () => wsClient.off(event, callback);
  }, []);

  return {
    connectionStatus,
    subscribe,
    updateOrderStatus: wsClient.updateOrderStatus.bind(wsClient),
    joinRestaurant: wsClient.joinRestaurant.bind(wsClient),
    leaveRestaurant: wsClient.leaveRestaurant.bind(wsClient),
    isConnected: wsClient.isConnected.bind(wsClient),
  };
}