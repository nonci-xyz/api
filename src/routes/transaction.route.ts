import { Router } from "express";

import prismaClient from "config/prisma";
import amqplib from "amqplib";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import config from "config";
import bs58 from "bs58";
import { authHandler } from "middlewares/auth";

const transactionRouter = Router();

transactionRouter.get("/", async (req, res) => {
  const { status, id, recipient } = req.query;

  if (id) {
    const transaction = await prismaClient.transaction.findUnique({
      where: {
        id: id as string,
      },
    });

    return res.status(200).json({
      message: "Fetched transaction",
      transaction,
    });
  } else if (recipient) {
    const transactions = await prismaClient.transaction.findMany({
      where: {
        recipient: recipient as string,
      },
    });

    return res.status(200).json({
      message: "Fetched transactions",
      transactions,
    });
  } else if (status) {
    const transactions = await prismaClient.transaction.findMany({
      where: {
        isProcessed: status === "processed",
      },
    });

    return res.status(200).json({
      message: "Fetched transactions",
      transactions,
    });
  } else {
    const transactions = await prismaClient.transaction.findMany();

    return res.status(200).json({
      message: "Fetched transactions",
      transactions,
    });
  }
});

transactionRouter.post("/", authHandler, async (req, res) => {
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
    include: {
      durableNonce: true,
    },
  });

  const queue = "txs";
  const conn = await amqplib.connect(config.amqpUrl);

  const sendCh = await conn.createChannel();
  await sendCh.assertQueue(queue, {
    durable: true,
  });

  sendCh.sendToQueue(
    queue,
    Buffer.from(JSON.stringify(unprocessedTransaction))
  );
  await sendCh.close();
  await conn.close();

  return res.status(200).json({
    message: "Transaction created",
    unprocessedTransaction,
  });
});

transactionRouter.post("/random-with-nonce", authHandler, async (req, res) => {
  const { body } = req;

  if (!body) {
    return res.status(400).json({
      message: "No body found",
    });
  }

  const { durableNonceId } = body;

  const nonce = await prismaClient.nonce.findUnique({
    where: {
      id: durableNonceId,
    },
  });

  if (!nonce) {
    return res.status(400).json({
      message: "Nonce not found",
    });
  }

  const tx = new Transaction().add(
    SystemProgram.nonceAdvance({
      authorizedPubkey: new PublicKey(config.vaultPublicKey),
      noncePubkey: new PublicKey(nonce.publicKey),
    }),
    SystemProgram.transfer({
      fromPubkey: new PublicKey(config.vaultPublicKey),
      toPubkey: new PublicKey("8Dyk53RrtmN3MshQxxWdfTRco9sQJzUHSqkUg8chbe88"),
      lamports: LAMPORTS_PER_SOL / 1000,
    })
  );

  tx.recentBlockhash = nonce.nonceValue;
  tx.feePayer = new PublicKey(config.vaultPublicKey);
  tx.sign(Keypair.fromSecretKey(bs58.decode(config.vaultPrivateKey)));

  const serializedTransaction = Buffer.from(tx.serialize()).toString("base64");

  return res.status(200).json({
    message: "Transaction created",
    serializedTransaction,
  });
});

export default transactionRouter;
