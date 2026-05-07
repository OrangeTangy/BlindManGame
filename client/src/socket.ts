import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@blindman/shared";

/**
 * Resolve the socket.io server URL.
 *
 *   1. If VITE_SERVER_URL is set at build time, use it (split-deploy mode —
 *      backend on Render, frontend on Vercel).
 *   2. Otherwise in dev, point at the local API on :3001.
 *   3. Otherwise (production single-origin deploy), connect to the current
 *      origin so the same Render service serves both the static bundle and
 *      the websocket.
 */
function resolveServerUrl(): string | undefined {
  const env = (import.meta as unknown as { env?: { VITE_SERVER_URL?: string; DEV?: boolean } }).env;
  if (env?.VITE_SERVER_URL) return env.VITE_SERVER_URL;
  if (env?.DEV) return "http://localhost:3001";
  return undefined; // socket.io defaults to current origin
}

const SERVER_URL = resolveServerUrl();
const SOCKET_OPTS = {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
};

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> =
  SERVER_URL ? io(SERVER_URL, SOCKET_OPTS) : io(SOCKET_OPTS);
