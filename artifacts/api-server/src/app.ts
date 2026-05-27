import express, { type Express, type RequestHandler } from "express";
import cors from "cors";
import * as pinoHttpModule from "pino-http";
import type { Options } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const createPinoHttp = (
  (pinoHttpModule as any).default ?? pinoHttpModule
) as (options: Options) => RequestHandler;

app.use(
  createPinoHttp({
    logger,
    serializers: {
      req(req: { id?: string; method?: string; url?: string }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: { statusCode?: number }) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;