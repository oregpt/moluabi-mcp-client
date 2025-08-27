import { useEffect, useState, useCallback } from "react";
import { wsClient } from "@/lib/websocket";

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await wsClient.connect();
        setConnected(true);
      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
        setConnected(false);
      }
    };

    connectWebSocket();

    // Subscribe to status updates
    const unsubscribe = wsClient.subscribe("status", (data) => {
      setLastMessage(data);
      setConnected(wsClient.connected);
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, []);

  const sendMessage = useCallback((data: any) => {
    wsClient.send(data);
  }, []);

  const subscribe = useCallback((type: string, callback: (data: any) => void) => {
    return wsClient.subscribe(type, callback);
  }, []);

  return {
    connected,
    lastMessage,
    sendMessage,
    subscribe,
  };
}
