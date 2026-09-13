import WebSocket from 'ws';
import { WATCHLIST, assetByPair } from '@blockwatch/shared-types';
import { config } from './config.js';

/** Binance best bid/ask payload; only the fields we consume are typed. */
interface BookTicker {
  s: string;
  b: string;
  a: string;
}

interface CombinedStreamMessage {
  data?: BookTicker;
}

export interface BookUpdate {
  symbol: string;
  pair: string;
  bid: number;
  ask: number;
  mid: number;
}

const MAX_BACKOFF_MS = 30_000;

/**
 * Subscribes to the combined bookTicker stream. bookTicker is used rather than
 * miniTicker because miniTicker only republishes when its 24h window changes,
 * which on a thin book can mean minutes of silence and a frozen dashboard.
 */
export class BinanceStreamClient {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private staleTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stopped = false;
  private readonly onUpdate: (update: BookUpdate) => void;

  constructor(onUpdate: (update: BookUpdate) => void) {
    this.onUpdate = onUpdate;
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    this.socket?.close();
    this.socket = null;
  }

  private streamUrl(): string {
    const streams = WATCHLIST.map((asset) => `${asset.pair.toLowerCase()}@bookTicker`).join('/');
    return `${config.binanceWsBase}/stream?streams=${streams}`;
  }

  private connect(): void {
    console.log(`[binance] connecting to ${WATCHLIST.length} book streams`);
    const socket = new WebSocket(this.streamUrl());
    this.socket = socket;

    socket.on('open', () => {
      this.reconnectAttempt = 0;
      console.log('[binance] connected');
      this.resetStaleTimer();
    });

    socket.on('message', (raw) => {
      this.resetStaleTimer();
      this.handleMessage(raw.toString());
    });

    socket.on('error', (err) => {
      console.error(`[binance] socket error: ${err.message}`);
    });

    socket.on('close', (code) => {
      if (this.stopped) return;
      console.warn(`[binance] disconnected (code ${code})`);
      this.scheduleReconnect();
    });
  }

  private handleMessage(raw: string): void {
    let message: CombinedStreamMessage;
    try {
      message = JSON.parse(raw) as CombinedStreamMessage;
    } catch {
      console.warn('[binance] dropped unparseable frame');
      return;
    }

    const data = message.data;
    if (!data) return;

    const asset = assetByPair(data.s);
    if (!asset) return;

    const bid = Number(data.b);
    const ask = Number(data.a);
    if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0) return;

    this.onUpdate({
      symbol: asset.symbol,
      pair: asset.pair,
      bid,
      ask,
      mid: (bid + ask) / 2,
    });
  }

  /**
   * A socket that stops delivering data without emitting 'close' would silently
   * freeze the dashboard, so force a reconnect once the feed goes quiet.
   */
  private resetStaleTimer(): void {
    if (this.staleTimer) clearTimeout(this.staleTimer);
    this.staleTimer = setTimeout(() => {
      console.warn('[binance] feed went quiet, forcing reconnect');
      this.socket?.terminate();
    }, config.staleSocketMs);
  }

  private scheduleReconnect(): void {
    this.clearTimers();
    const backoff = Math.min(1000 * 2 ** this.reconnectAttempt, MAX_BACKOFF_MS);
    const jittered = Math.round(backoff * (0.5 + Math.random() * 0.5));
    this.reconnectAttempt += 1;
    console.log(`[binance] reconnecting in ${jittered}ms (attempt ${this.reconnectAttempt})`);
    this.reconnectTimer = setTimeout(() => this.connect(), jittered);
  }

  private clearTimers(): void {
    if (this.staleTimer) clearTimeout(this.staleTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.staleTimer = null;
    this.reconnectTimer = null;
  }
}
