import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { dailyParcelValuationHandler } from "../scheduled/dailyParcelValuation";
import { commentatorAwardsHandler } from "../scheduled/commentatorAwards";
import { commentatorForecastsHandler } from "../scheduled/commentatorForecasts";
import { commentatorResearchHandler } from "../scheduled/commentatorResearch";

/**
 * HTTP uygulamasını dinleme işlemi olmadan kurar.
 * Bu ayrım, yerel Express sunucusu ile Vercel serverless giriş noktasının aynı
 * API, OAuth ve tRPC tanımlarını kullanmasını sağlar.
 */
export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // Vercel Cron her zaman GET ile çağırır; Manus zamanlayıcısı POST kullanır.
  // Bağımsız Vercel dağıtımı için her iş her iki fiille de kayıtlıdır.
  app.post(
    "/api/scheduled/daily-parcel-valuation",
    dailyParcelValuationHandler
  );
  app.get(
    "/api/scheduled/daily-parcel-valuation",
    dailyParcelValuationHandler
  );
  app.post("/api/scheduled/commentator-awards", commentatorAwardsHandler);
  app.get("/api/scheduled/commentator-awards", commentatorAwardsHandler);
  app.post("/api/scheduled/commentator-forecasts", commentatorForecastsHandler);
  app.get("/api/scheduled/commentator-forecasts", commentatorForecastsHandler);
  app.post("/api/scheduled/commentator-research", commentatorResearchHandler);
  app.get("/api/scheduled/commentator-research", commentatorResearchHandler);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}
