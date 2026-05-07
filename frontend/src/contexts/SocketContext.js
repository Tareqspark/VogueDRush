import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const defaultSocketURL = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost:5000';

// Create context
const SocketContext = createContext();

// Socket provider component
export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated, accessToken } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef(null);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Start with 1 second
  const maxReconnectDelay = 30000; // Max 30 seconds

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      setConnectionStatus('failed');
      toast.error('Connection failed. Please refresh the page.', {
        duration: 10000,
      });
      return;
    }

    const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), maxReconnectDelay);
    
    setConnectionStatus('reconnecting');
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      if (socketRef.current) {
        socketRef.current.connect();
      }
    }, delay);
  }, [reconnectAttempts, reconnectDelay, maxReconnectDelay, maxReconnectAttempts]);

  useEffect(() => {
    if (!isAuthenticated || !user || !accessToken) {
      // Disconnect socket if user is not authenticated
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setReconnectAttempts(0);
      clearReconnectTimeout();
      return;
    }

    // Initialize socket connection with enhanced configuration
    const socket = io(process.env.REACT_APP_SOCKET_URL || defaultSocketURL, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: true,
      reconnection: false, // We'll handle reconnection manually
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection events with enhanced handling
    socket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setConnectionStatus('connected');
      setReconnectAttempts(0);
      clearReconnectTimeout();
      
      // Join role-based room
      socket.emit('join-role', user.role);
      
      // Join kitchen room if user has access
      if (user.role === 'waiter' || user.role === 'admin') {
        socket.emit('join-kitchen');
      }
      
      // Show success toast if reconnecting
      if (reconnectAttempts > 0) {
        toast.success('Reconnected to server', {
          duration: 3000,
        });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      
      // Don't show toast for intentional disconnections
      if (reason !== 'io client disconnect') {
        toast.error('Disconnected from server', {
          duration: 5000,
        });
        
        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          attemptReconnect();
        }
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      
      // Handle different error types
      if (error.message === 'Authentication token required') {
        toast.error('Authentication required. Please login again.', {
          duration: 8000,
        });
      } else if (error.message === 'Invalid token') {
        toast.error('Session expired. Please login again.', {
          duration: 8000,
        });
      } else if (error.message === 'Token has been revoked') {
        toast.error('Session revoked. Please login again.', {
          duration: 8000,
        });
      } else {
        // Attempt to reconnect for other errors
        if (reconnectAttempts < maxReconnectAttempts) {
          attemptReconnect();
        }
      }
    });

    // Handle socket errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error('Connection error occurred', {
        duration: 5000,
      });
    });

    // Order-related events
    socket.on('new-order', (data) => {
      toast.success(`New order #${data.order.order_number} received!`, {
        duration: 5000,
      });
    });

    socket.on('order-status-update', (data) => {
      const statusMessages = {
        pending: 'Order is pending',
        preparing: 'Order is being prepared',
        ready: 'Order is ready!',
        done: 'Order completed',
        cancelled: 'Order cancelled',
      };

      toast(`Order #${data.orderId} ${statusMessages[data.newStatus] || 'updated'}`, {
        icon: data.newStatus === 'cancelled' ? '❌' : '📋',
      });
    });

    socket.on('order-ready', (data) => {
      toast.success(`Order #${data.orderId} is ready for pickup!`, {
        duration: 6000,
      });
    });

    // Kitchen-related events
    socket.on('kitchen-update', (data) => {
      // Handle kitchen updates (can be expanded with specific UI updates)
      console.log('Kitchen update:', data);
    });

    socket.on('kitchen-item-started', (data) => {
      toast(`Item preparation started for order #${data.orderId}`, {
        icon: '👨‍🍳',
      });
    });

    socket.on('kitchen-item-ready', (data) => {
      toast(`Item ready for order #${data.orderId}`, {
        icon: '✅',
      });
    });

    // Table-related events
    socket.on('table-status-update', (data) => {
      const statusMessages = {
        available: 'Table is now available',
        occupied: 'Table is now occupied',
        reserved: 'Table is now reserved',
      };

      toast(`Table ${data.tableId} ${statusMessages[data.newStatus] || 'updated'}`, {
        icon: '🪑',
      });
    });

    // Reservation-related events
    socket.on('new-reservation', (data) => {
      toast.success(`New reservation for ${data.reservation.customer_name}`, {
        duration: 5000,
      });
    });

    socket.on('reservation-update', (data) => {
      toast(`Reservation updated for ${data.reservation.customer_name}`, {
        icon: '📅',
      });
    });

    socket.on('reservation-status-update', (data) => {
      const statusMessages = {
        pending: 'Reservation is pending',
        confirmed: 'Reservation confirmed',
        cancelled: 'Reservation cancelled',
        completed: 'Reservation completed',
      };

      toast(`Reservation ${statusMessages[data.newStatus] || 'updated'}`, {
        icon: data.newStatus === 'cancelled' ? '❌' : '📅',
      });
    });

    // Delivery-related events
    socket.on('delivery-status-update', (data) => {
      const statusMessages = {
        pending: 'Delivery is pending',
        assigned: 'Delivery assigned',
        picked_up: 'Delivery picked up',
        delivered: 'Delivery completed',
        cancelled: 'Delivery cancelled',
      };

      toast(`Delivery ${statusMessages[data.newStatus] || 'updated'}`, {
        icon: data.newStatus === 'delivered' ? '🚚' : '📦',
      });
    });

    socket.on('delivery-payment-collected', (data) => {
      toast.success(`Payment collected: ৳${data.amount}`, {
        icon: '💰',
      });
    });

    // User-related events (admin only)
    socket.on('user-updated', (data) => {
      if (user.role === 'admin') {
        toast(`User ${data.username} updated`, {
          icon: '👤',
        });
      }
    });

    // System notifications
    socket.on('system-notification', (data) => {
      toast(data.message, {
        icon: data.type === 'error' ? '❌' : 'ℹ️',
        duration: data.duration || 4000,
      });
    });

    // Cleanup on unmount
    return () => {
      clearReconnectTimeout();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setReconnectAttempts(0);
    };
  }, [isAuthenticated, user, accessToken, reconnectAttempts, clearReconnectTimeout, attemptReconnect]);

  // Join order-specific room
  const joinOrder = (orderId) => {
    if (socketRef.current && orderId) {
      socketRef.current.emit('join-order', orderId);
    }
  };

  // Leave order-specific room
  const leaveOrder = (orderId) => {
    if (socketRef.current && orderId) {
      socketRef.current.emit('leave-order', orderId);
    }
  };

  // Join kitchen room
  const joinKitchen = () => {
    if (socketRef.current) {
      socketRef.current.emit('join-kitchen');
    }
  };

  // Leave kitchen room
  const leaveKitchen = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-kitchen');
    }
  };

  // Join role-based room
  const joinRole = (role) => {
    if (socketRef.current && role) {
      socketRef.current.emit('join-role', role);
    }
  };

  // Custom emit function
  const emit = (event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  // Get socket instance
  const getSocket = () => socketRef.current;

  const value = {
    socket: socketRef.current,
    isConnected,
    connectionStatus,
    reconnectAttempts,
    joinOrder,
    leaveOrder,
    joinKitchen,
    leaveKitchen,
    joinRole,
    emit,
    getSocket,
    // Additional connection management functions
    reconnect: () => {
      if (socketRef.current) {
        setReconnectAttempts(0);
        socketRef.current.connect();
      }
    },
    disconnect: () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    },
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
