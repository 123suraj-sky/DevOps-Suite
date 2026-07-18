import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { connectWebSocket, disconnectWebSocket } from '../services/websocketService';

const WebSocketContext = createContext({
  connected: false,
  stompClient: null,
});

export const WebSocketProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [stompClient, setStompClient] = useState(null);
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      const client = connectWebSocket(
        token,
        () => setConnected(true),
        () => setConnected(false)
      );
      setStompClient(client);

      return () => {
        disconnectWebSocket();
        setConnected(false);
        setStompClient(null);
      };
    }
  }, [isAuthenticated, token]);

  return (
    <WebSocketContext.Provider value={{ connected, stompClient }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};
