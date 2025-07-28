"use client";

import { io, Socket } from 'socket.io-client';

interface WebSocketEvents {
  'order:new': (data: { order: any; notification: any }) => void;
  'order:status': (data: { orderId: string; status: string }) => void;
  'order:cancelled': (data: { orderId: string }) => void;
  'table:status': (data: { tableId: string; status: string }) => void;
  'staff:message': (data: { message: string; type: string }) => void;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeouts: NodeJS.Timeout[] = [];

  connect(restaurantId: string, token?: string) {
    if (this.socket?.connected) {
      return;
    }

    this.cleanup();

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    
    // Get token from parameter, localStorage, or return early if none available
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    
    if (!authToken) {
      console.warn('⚠️ No authentication token available for WebSocket connection');
      return;
    }
    
    this.socket = io(WS_URL, {
      auth: {
        token: authToken,
      },
      query: {
        type: 'staff',
        restaurantId,
      },
      transports: ['websocket', 'polling'], // Allow fallback to polling
      upgrade: true,
      timeout: 20000,
      reconnection: false, // We handle reconnection manually
      forceNew: true, // Force new connection to avoid conflicts
    });

    this.setupEventHandlers(restaurantId, token);
  }

  private setupEventHandlers(restaurantId: string, token?: string) {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('internal:connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('internal:disconnected', reason);
      
      if (reason === 'io server disconnect') {
        return;
      }
      
      this.attemptReconnect(restaurantId, token);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emit('internal:error', error);
      this.attemptReconnect(restaurantId, token);
    });

    // Business events
    const events: (keyof WebSocketEvents)[] = [
      'order:new',
      'order:status', 
      'order:cancelled',
      'table:status',
      'staff:message'
    ];

    events.forEach(event => {
      this.socket!.on(event, (data) => {
        this.emit(event, data);
      });
    });
  }

  private attemptReconnect(restaurantId: string, token?: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('internal:max_reconnect_reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    const timeout = setTimeout(() => {
      this.connect(restaurantId, token);
    }, delay);

    this.reconnectTimeouts.push(timeout);
  }

  private cleanup() {
    // Clear any pending reconnection timeouts
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts = [];

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  disconnect() {
    this.cleanup();
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }

  on<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void;
  on(event: string, callback: Function): void;
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
    if (this.socket.disconnected) return 'disconnected';
    return 'error';
  }
}

export const wsClient = new WebSocketClient();

// React hook for using WebSocket in components
import { useEffect, useState, useCallback, useRef } from 'react';

export function useWebSocket(restaurantId?: string) {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>('disconnected');
  const subscribersRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!restaurantId) return;

    // Check current connection status immediately
    const currentStatus = wsClient.getConnectionStatus();
    setConnectionStatus(currentStatus);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    wsClient.connect(restaurantId, token || undefined);

    const handleConnected = () => setConnectionStatus('connected');
    const handleDisconnected = () => setConnectionStatus('disconnected');
    const handleError = () => setConnectionStatus('error');

    wsClient.on('internal:connected', handleConnected);
    wsClient.on('internal:disconnected', handleDisconnected);
    wsClient.on('internal:error', handleError);

    // Periodically check connection status to ensure accuracy
    const statusCheckInterval = setInterval(() => {
      const currentStatus = wsClient.getConnectionStatus();
      setConnectionStatus(currentStatus);
    }, 1000); // Check every second

    return () => {
      wsClient.off('internal:connected', handleConnected);
      wsClient.off('internal:disconnected', handleDisconnected);
      wsClient.off('internal:error', handleError);
      
      // Clear the status check interval
      clearInterval(statusCheckInterval);
      
      // Clean up all subscribers
      subscribersRef.current.forEach(unsub => unsub());
      subscribersRef.current = [];
    };
  }, [restaurantId]);

  const subscribe = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    callback: WebSocketEvents[K]
  ) => {
    wsClient.on(event, callback);
    const unsubscribe = () => wsClient.off(event, callback);
    subscribersRef.current.push(unsubscribe);
    return unsubscribe;
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