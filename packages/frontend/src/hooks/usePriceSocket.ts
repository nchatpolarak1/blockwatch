'use client';

import { useEffect, useRef, useState } from 'react';
import type { PriceTick, ServerMessage } from '@blockwatch/shared-types';
import { WS_URL } from '@/lib/config';

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting';

const MAX_BACKOFF_MS = 10_000;

/**
 * Holds the live tick map. The server replays its cache on connect, so this fills
 * in immediately rather than waiting for whichever symbol trades next.
 */
export function usePriceSocket(): { ticks: Map<string, PriceTick>; status: ConnectionStatus } {
  const [ticks, setTicks] = useState<Map<string, PriceTick>>(() => new Map());
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setStatus('live');
      };

      socket.onmessage = (event) => {
        let message: ServerMessage;
        try {
          message = JSON.parse(event.data as string) as ServerMessage;
        } catch {
          return;
        }

        setTicks((previous) => {
          const next = new Map(previous);
          if (message.type === 'snapshot') {
            for (const tick of message.ticks) next.set(tick.symbol, tick);
          } else {
            next.set(message.tick.symbol, message.tick);
          }
          return next;
        });
      };

      socket.onerror = () => socket.close();

      socket.onclose = () => {
        if (cancelled) return;
        setStatus('reconnecting');
        const backoff = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
        attempt += 1;
        retryTimer = setTimeout(connect, backoff);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      socketRef.current?.close();
    };
  }, []);

  return { ticks, status };
}
