import cors from "cors";
import express, { Express } from "express";
import { nonceRouter } from "@routes/index";
import { errorHandler } from "middlewares/errorHandler";
import logger from "middlewares/logger";
import cookieParser from "cookie-parser";
import transactionRouter from "@routes/transaction.route";
import { worker } from "worker";

const app: Express = express();

app.use(
  cors({
    // origin is given a array if we want to have multiple origins later
    origin: "*",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/nonce", nonceRouter);
app.use("/transaction", transactionRouter);

app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("json")) {
    res.json({ error: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});

app.use(errorHandler);

const server = app.listen(4000, async () => {
  await worker();
  logger.log("info", `Server is running on Port: 4000`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received.");
  logger.info("Closing server.");
  server.close((err) => {
    logger.info("Server closed.");
    // eslint-disable-next-line no-process-exit
    process.exit(err ? 1 : 0);
  });
});
