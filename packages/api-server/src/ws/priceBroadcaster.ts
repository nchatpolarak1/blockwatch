import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { PRICE_CHANNEL, type ServerMessage } from '@blockwatch/shared-types';
import { config } from '../config.js';
import { readCachedTicks, subscriber } from '../redis.js';

/** Tracks which sockets answered the last ping. */
const alive = new WeakMap<WebSocket, boolean>();

export function attachPriceBroadcaster(server: Server): () => void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (socket) => {
    alive.set(socket, true);
    socket.on('pong', () => alive.set(socket, true));

    // Without this a client that connects between ticks stares at an empty table,
    // so replay the cache immediately rather than waiting for the next update.
    try {
      const ticks = await readCachedTicks();
      const snapshot: ServerMessage = { type: 'snapshot', ticks };
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(snapshot));
      }
    } catch (err) {
      console.error(`[ws] snapshot failed: ${(err as Error).message}`);
    }
  });

  void subscriber.subscribe(PRICE_CHANNEL, (err) => {
    if (err) {
      console.error(`[ws] subscribe failed: ${err.message}`);
      return;
    }
    console.log(`[ws] subscribed to ${PRICE_CHANNEL}`);
  });

  subscriber.on('message', (channel, payload) => {
    if (channel !== PRICE_CHANNEL) return;
    // The payload is already the serialized tick, so wrap it as text rather than
    // paying for a parse and re-stringify on every tick for every client.
    const frame = `{"type":"tick","tick":${payload}}`;
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(frame);
      }
    }
  });

  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (alive.get(client) === false) {
        client.terminate();
        continue;
      }
      alive.set(client, false);
      client.ping();
    }
  }, config.heartbeatMs);

  return () => {
    clearInterval(heartbeat);
    wss.close();
  };
}
