import { Router } from "express";

import config from "config";
import prismaClient from "config/prisma";

const nonceRouter = Router();

// create a durable nonce account
nonceRouter.post("/", async (req, res) => {
  console.log(req.body);

  res.json({
    message: "durable nonce created",
  });
});

export default nonceRouter;
