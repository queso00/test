import express, { type Express } from "express";
import cors from "cors";
import pinoHttp, { type Options } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const httpLoggerOptions: Options = {
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
};

app.use(pinoHttp.default ? pinoHttp.default(httpLoggerOptions) : pinoHttp(httpLoggerOptions));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;