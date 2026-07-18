import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_URL } from '../utils/constants';

let stompClient = null;

export const connectWebSocket = (
  token,
  onConnect,
  onDisconnect
) => {
  stompClient = new Client({
    webSocketFactory: () => new SockJS(`${WS_URL}`),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    onConnect: () => {
      console.log('WebSocket connected');
      if (onConnect) onConnect();
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
      if (onDisconnect) onDisconnect();
    },
    onStompError: (frame) => {
      console.error('STOMP error:', frame.headers['message']);
    },
  });

  stompClient.activate();
  return stompClient;
};

export const disconnectWebSocket = () => {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
};

export const getStompClient = () => stompClient;

export const subscribe = (destination, callback) => {
  if (!stompClient || !stompClient.connected) {
    console.warn('WebSocket not connected');
    return () => {};
  }

  const subscription = stompClient.subscribe(destination, (message) => {
    try {
      const body = JSON.parse(message.body);
      callback(body);
    } catch {
      callback(message.body);
    }
  });

  return () => subscription.unsubscribe();
};

export const send = (destination, body) => {
  if (!stompClient || !stompClient.connected) {
    console.warn('WebSocket not connected');
    return;
  }

  stompClient.publish({
    destination,
    body: JSON.stringify(body),
  });
};
