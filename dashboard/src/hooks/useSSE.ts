import { useEffect, useState } from 'react';
import { FileEvent } from '../lib/api';

export function useSSE(onEvent: (event: FileEvent) => void) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      eventSource = new EventSource('/api/stream');

      eventSource.onopen = () => {
        setConnected(true);
        setError(null);
      };

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type !== 'connected') {
            onEvent(data);
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        setError('Connection lost. Reconnecting...');
        eventSource?.close();

        // Reconnect after 2 seconds
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 2000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [onEvent]);

  return { connected, error };
}
