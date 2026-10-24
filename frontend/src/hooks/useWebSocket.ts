import { useEffect, useRef, useState, useCallback } from 'react';
import type { WebSocketMessage, WebSocketConnectionStatus } from '../types';

export interface UseWebSocketOptions {
  projectId: number | null | undefined;
  enabled?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onReconnect?: () => void;
}

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 15000;
const BACKOFF_FACTOR = 1.5;

export const useWebSocket = ({
  projectId,
  enabled = true,
  onMessage,
  onReconnect,
}: UseWebSocketOptions) => {
  const [status, setStatus] = useState<WebSocketConnectionStatus>(
    enabled && projectId ? 'CONNECTING' : 'CLOSED'
  );
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelayRef = useRef<number>(INITIAL_RETRY_DELAY);
  const disconnectedAtRef = useRef<number | null>(null);
  const hasConnectedOnceRef = useRef<boolean>(false);
  const connectRef = useRef<() => void>(() => {});

  // Keep callback refs up to date to avoid reconnecting on handler changes
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const onReconnectRef = useRef(onReconnect);
  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      const socket = wsRef.current;
      wsRef.current = null;
      socket.onerror = null;
      socket.onmessage = null;
      if (socket.readyState === WebSocket.CONNECTING) {
        socket.onclose = null;
        socket.onopen = () => {
          try {
            socket.close(1000, 'Component unmounted');
          } catch {
            // Socket may already be closed
          }
        };
      } else if (socket.readyState === WebSocket.OPEN) {
        socket.onclose = null;
        try {
          socket.close(1000, 'Component unmounted');
        } catch {
          // Socket may already be closed
        }
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !projectId) {
      return;
    }

    cleanup();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/projects/${projectId}`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setStatus('OPEN');
        retryDelayRef.current = INITIAL_RETRY_DELAY;

        // If this is a reconnect after having been connected previously, notify listener
        if (hasConnectedOnceRef.current && disconnectedAtRef.current !== null) {
          onReconnectRef.current?.();
        }
        hasConnectedOnceRef.current = true;
        disconnectedAtRef.current = null;
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(parsed);
          onMessageRef.current?.(parsed);
        } catch {
          // Ignore invalid JSON payloads
        }
      };

      socket.onerror = () => {
        // WebSocket error will naturally trigger onclose
      };

      socket.onclose = (event: CloseEvent) => {
        setStatus('CLOSED');
        wsRef.current = null;

        // Record disconnection time
        if (disconnectedAtRef.current === null) {
          disconnectedAtRef.current = Date.now();
        }

        // Only auto-reconnect if closure was unexpected (not cleanly closed by client code 1000)
        if (event.code !== 1000 && enabled) {
          const delay = retryDelayRef.current;
          retryDelayRef.current = Math.min(delay * BACKOFF_FACTOR, MAX_RETRY_DELAY);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current();
          }, delay);
        }
      };
    } catch {
      setTimeout(() => {
        setStatus('CLOSED');
      }, 0);
      const delay = retryDelayRef.current;
      retryDelayRef.current = Math.min(delay * BACKOFF_FACTOR, MAX_RETRY_DELAY);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectRef.current();
      }, delay);
    }
  }, [enabled, projectId, cleanup]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      cleanup();
    };
  }, [connect, cleanup]);

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  const reconnect = useCallback(() => {
    cleanup();
    retryDelayRef.current = INITIAL_RETRY_DELAY;
    connect();
  }, [cleanup, connect]);

  return {
    isConnected: status === 'OPEN',
    status,
    lastMessage,
    sendMessage,
    reconnect,
  };
};

export default useWebSocket;
