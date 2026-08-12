import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../server/_core/app.js";

/**
 * Vercel Node.js serverless giriş noktası.
 * Vercel, /api/* isteklerini bu Express uygulamasına yönlendirir. Uygulama
 * örneği soğuk başlangıç sonrası yeniden kullanılır.
 */
let app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req, res);
}
