import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const newSocket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        // Join user room
        newSocket.emit('user_connected', user._id);
      });

      newSocket.on('user_status', ({ userId, status }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          if (status === 'online') {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
      });

      newSocket.on('notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        // Show toast notification
        if (window.showToast) {
          window.showToast(notification);
        }
      });

      newSocket.on('new_message', (message) => {
        // Dispatch custom event for message updates
        window.dispatchEvent(new CustomEvent('new_message', { detail: message }));
      });

      newSocket.on('user_typing', ({ userId, conversationId }) => {
        window.dispatchEvent(new CustomEvent('user_typing', { detail: { userId, conversationId } }));
      });

      newSocket.on('user_stopped_typing', ({ userId, conversationId }) => {
        window.dispatchEvent(new CustomEvent('user_stopped_typing', { detail: { userId, conversationId } }));
      });

      newSocket.on('order_updated', (update) => {
        window.dispatchEvent(new CustomEvent('order_updated', { detail: update }));
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      setSocket(null);
    }
  }, [isAuthenticated, user]);

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const joinConversation = (conversationId) => {
    if (socket) {
      socket.emit('join_conversation', conversationId);
    }
  };

  const leaveConversation = (conversationId) => {
    if (socket) {
      socket.emit('leave_conversation', conversationId);
    }
  };

  const sendMessage = (conversationId, message) => {
    if (socket) {
      socket.emit('send_message', { conversationId, message });
    }
  };

  const sendTypingStatus = (conversationId, isTyping) => {
    if (socket) {
      socket.emit(isTyping ? 'typing_start' : 'typing_stop', {
        userId: user?._id,
        conversationId,
      });
    }
  };

  const joinOrderRoom = (orderId) => {
    if (socket) {
      socket.emit('join_order', orderId);
    }
  };

  const sendOrderUpdate = (orderId, update) => {
    if (socket) {
      socket.emit('order_update', { orderId, update });
    }
  };

  const markNotificationRead = (notificationId) => {
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    ));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const value = {
    socket,
    connected: !!socket?.connected,
    onlineUsers,
    isUserOnline,
    notifications,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTypingStatus,
    joinOrderRoom,
    sendOrderUpdate,
    markNotificationRead,
    clearNotifications,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
