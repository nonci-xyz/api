import { Router } from "express";

import prismaClient from "config/prisma";
import amqplib from "amqplib";

const transactionRouter = Router();

// add to queue
const queue = "txs";
const conn = await amqplib.connect(
  "amqps://ozcptnqp:WmlvgTauAdyX1nQ1sXl_cSFxx5Dgm-vw@puffin.rmq2.cloudamqp.com/ozcptnqp",
);

transactionRouter.get("/all", async (_req, res) => {
  const transactions = await prismaClient.transaction.findMany({
    select: {
      id: true,
      recipient: true,
      signedTx: true,
      durableNonce: true,
      isProcessed: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(200).json({
    message: "Fetched all transactions",
    transactions,
  });
});

transactionRouter.get("/pending", async (_req, res) => {
  const transactions = await prismaClient.transaction.findMany({
    where: {
      isProcessed: false,
    },
    select: {
      id: true,
      recipient: true,
      signedTx: true,
      durableNonce: true,
      isProcessed: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.status(200).json({
    message: "Fetched all pending transactions",
    transactions,
  });
});

transactionRouter.get("/processed", async (_req, res) => {
  const transactions = await prismaClient.transaction.findMany({
    where: {
      isProcessed: true,
    },
    select: {
      id: true,
      recipient: true,
      signedTx: true,
      durableNonce: true,
      isProcessed: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.status(200).json({
    message: "Fetched all processed transactions",
    transactions,
  });
});

transactionRouter.get("/id/:id", async (req, res) => {
  const transaction = await prismaClient.transaction.findUnique({
    where: {
      id: req.params.id,
    },
    select: {
      id: true,
      recipient: true,
      signedTx: true,
      durableNonce: true,
      isProcessed: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.status(200).json({
    message: "Fetched transaction",
    transaction,
  });
});

transactionRouter.get("/recipient/:recipient", async (req, res) => {
  const transactions = await prismaClient.transaction.findMany({
    where: {
      recipient: req.params.recipient,
    },
    select: {
      id: true,
      recipient: true,
      signedTx: true,
      durableNonce: true,
      isProcessed: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.status(200).json({
    message: "Fetched transactions",
    transactions,
  });
});

transactionRouter.post("/", async (req, res) => {
  const { body } = req;

  if (!body) {
    return res.status(400).json({
      message: "No body found",
    });
  }

  const { serializedTransaction, durableNonceId, recipientAddress } = body;

  if (!serializedTransaction || !durableNonceId || !recipientAddress) {
    return res.status(400).json({
      message: "Required fields not present",
    });
  }

  const unprocessedTransaction = await prismaClient.transaction.create({
    data: {
      recipient: recipientAddress,
      signedTx: serializedTransaction,
      durableNonce: {
        connect: {
          id: durableNonceId,
        },
      },
    },
  });

  const sendCh = await conn.createChannel();
  await sendCh.assertQueue(queue, {
    durable: true,
  });

  sendCh.sendToQueue(
    queue,
    Buffer.from(JSON.stringify(unprocessedTransaction)),
  );
  await sendCh.close();

  return res.status(200).json({
    message: "Transaction created",
    unprocessedTransaction,
  });
});

export default transactionRouter;
