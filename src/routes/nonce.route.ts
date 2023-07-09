import { Router } from "express";
import {
  Transaction,
  SystemProgram,
  Keypair,
  Connection,
  NONCE_ACCOUNT_LENGTH,
  NonceAccount,
} from "@solana/web3.js";
import bs58 from "bs58";

import config from "config";
import prismaClient from "config/prisma";

const nonceRouter = Router();

nonceRouter.get("/all", async (_req, res) => {
  const nonces = await prismaClient.nonce.findMany({
    select: {
      id: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      createTxSig: true,
      deleteTxSig: true,
      nonceValue: true,
      Transaction: true,
    },
  });

  res.status(200).json({
    message: "Fetched all nonces",
    nonces,
  });
});

nonceRouter.get("/active", async (_req, res) => {
  const nonces = await prismaClient.nonce.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      createTxSig: true,
      deleteTxSig: true,
      nonceValue: true,
      publicKey: true,
      Transaction: true,
    },
  });

  res.status(200).json({
    message: "Fetched all active nonces",
    nonces,
  });
});

nonceRouter.get("/used", async (_req, res) => {
  const nonces = await prismaClient.nonce.findMany({
    where: {
      isActive: false,
    },
    select: {
      id: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      createTxSig: true,
      deleteTxSig: true,
      nonceValue: true,
      publicKey: true,
      Transaction: true,
    },
  });

  res.status(200).json({
    message: "Fetched all used nonces",
    nonces,
  });
});

nonceRouter.get("/id/:id", async (req, res) => {
  const nonce = await prismaClient.nonce.findUnique({
    where: {
      id: req.params.id,
    },
    select: {
      id: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      createTxSig: true,
      deleteTxSig: true,
      nonceValue: true,
      publicKey: true,
      Transaction: true,
    },
  });

  return res.status(200).json({
    message: "Fetched nonce",
    nonce,
  });
});

nonceRouter.get("/publicKey/:publicKey", async (req, res) => {
  const nonce = await prismaClient.nonce.findUnique({
    where: {
      publicKey: req.params.publicKey,
    },
    select: {
      id: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      createTxSig: true,
      deleteTxSig: true,
      nonceValue: true,
      publicKey: true,
      Transaction: true,
    },
  });

  return res.status(200).json({
    message: "Fetched nonce",
    nonce,
  });
});

nonceRouter.get("/value/:value", async (req, res) => {
  const nonce = await prismaClient.nonce.findUnique({
    where: {
      nonceValue: req.params.value,
    },
    select: {
      id: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      createTxSig: true,
      deleteTxSig: true,
      nonceValue: true,
      publicKey: true,
      Transaction: true,
    },
  });

  return res.status(200).json({
    message: "Fetched nonce",
    nonce,
  });
});

// create a durable nonce account
nonceRouter.get("/create", async (_req, res) => {
  const vaultKeypair = Keypair.fromSecretKey(
    bs58.decode(config.vaultPrivateKey)
  );

  const connection = new Connection(config.rpc, "confirmed");

  const nonceKeypair = Keypair.generate();

  const tx = new Transaction()
    .add(
      SystemProgram.createAccount({
        fromPubkey: vaultKeypair.publicKey,
        newAccountPubkey: nonceKeypair.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(
          NONCE_ACCOUNT_LENGTH
        ),
        space: NONCE_ACCOUNT_LENGTH,
        programId: SystemProgram.programId,
      })
    )
    .add(
      SystemProgram.nonceInitialize({
        noncePubkey: nonceKeypair.publicKey,
        authorizedPubkey: vaultKeypair.publicKey,
      })
    );

  const signature = await connection.sendTransaction(tx, [
    vaultKeypair,
    nonceKeypair,
  ]);

  await connection.confirmTransaction(signature);

  const accountInfo = await connection.getAccountInfo(nonceKeypair.publicKey);
  if (!accountInfo) {
    return res.status(500).json({
      message: "nonce account not found",
    });
  }
  const nonceAccount = NonceAccount.fromAccountData(accountInfo.data);

  const nonce = await prismaClient.nonce.create({
    data: {
      createTxSig: signature,
      nonceValue: nonceAccount.nonce,
      privateKey: bs58.encode(nonceKeypair.secretKey),
      publicKey: nonceKeypair.publicKey.toBase58(),
    },
  });

  return res.status(200).json({
    message: "durable nonce created",
    id: nonce.id,
    signature: signature,
    nonceValue: nonceAccount.nonce,
    nonceAccountPublicKey: nonceKeypair.publicKey.toBase58(),
  });
});

export default nonceRouter;
