import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// Create context
const SocketContext = createContext();

// Socket provider component
export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect socket if user is not authenticated
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Initialize socket connection
    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        token: localStorage.getItem('accessToken'),
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to server');
      
      // Join role-based room
      socket.emit('join-role', user.role);
      
      // Join kitchen room if user has access
      if (user.role === 'waiter' || user.role === 'admin') {
        socket.emit('join-kitchen');
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
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
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, user]);

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
    isConnected: socketRef.current?.connected || false,
    joinOrder,
    leaveOrder,
    joinKitchen,
    leaveKitchen,
    joinRole,
    emit,
    getSocket,
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
