// Proxy WebSocket → TCP pour développer avec un Postgres local.
//
// @prisma/adapter-neon parle à la base en WebSocket (c'est ce qui lui permet de
// tourner en serverless). Un Postgres classique n'écoute qu'en TCP : ce script fait
// le pont. Inutile en production et inutile si vous développez directement sur Neon.
//
//   pnpm db:proxy
//   .env → NEON_LOCAL_WS_PROXY="localhost:54330/v1"

import net from "node:net";
import { WebSocketServer } from "ws";

const port = Number(process.env.WS_PROXY_PORT ?? 54330);
const allowedHosts = new Set(["localhost", "127.0.0.1", "::1"]);

const server = new WebSocketServer({ port });

server.on("connection", (ws, request) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const address = url.searchParams.get("address") ?? "";
  const separator = address.lastIndexOf(":");
  const host = address.slice(0, separator);
  const targetPort = Number(address.slice(separator + 1));

  // Le proxy ne relaie que vers la machine locale.
  if (!allowedHosts.has(host) || !Number.isInteger(targetPort)) {
    ws.close(1008, "Adresse refusée");
    return;
  }

  const socket = net.connect(targetPort, host);
  socket.on("data", (chunk) => {
    if (ws.readyState === ws.OPEN) ws.send(chunk);
  });
  ws.on("message", (data) => socket.write(data));

  socket.on("close", () => ws.close());
  socket.on("error", () => ws.close());
  ws.on("close", () => socket.destroy());
  ws.on("error", () => socket.destroy());
});

console.log(`Proxy WebSocket → Postgres prêt sur ws://localhost:${port}/v1`);
