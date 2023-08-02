import { Router } from "express";
import {
  Transaction,
  SystemProgram,
  Keypair,
  Connection,
  NONCE_ACCOUNT_LENGTH,
  NonceAccount,
  PublicKey,
} from "@solana/web3.js";
import bs58 from "bs58";

import config from "config";
import prismaClient from "config/prisma";
import { authHandler } from "middlewares/auth";

const nonceRouter = Router();

nonceRouter.get("/", async (req, res) => {
  const { id, publicKey, value, status } = req.query;

  if (id) {
    const nonce = await prismaClient.nonce.findUnique({
      where: {
        id: id as string,
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

    if (!nonce) {
      return res.status(404).json({
        message: "Nonce not found",
      });
    }

    return res.status(200).json({
      message: "Fetched nonce",
      nonce,
    });
  } else if (publicKey) {
    const nonce = await prismaClient.nonce.findUnique({
      where: {
        publicKey: publicKey as string,
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

    if (!nonce) {
      return res.status(404).json({
        message: "Nonce not found",
      });
    }

    return res.status(200).json({
      message: "Fetched nonce",
      nonce,
    });
  } else if (value) {
    const nonce = await prismaClient.nonce.findUnique({
      where: {
        nonceValue: value as string,
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

    if (!nonce) {
      return res.status(404).json({
        message: "Nonce not found",
      });
    }

    return res.status(200).json({
      message: "Fetched nonce",
      nonce,
    });
  } else if (status) {
    const nonces = await prismaClient.nonce.findMany({
      where: {
        isActive: status === "active" ? true : false,
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
      message: `Fetched all ${status} nonces`,
      nonces,
    });
  } else {
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

    return res.status(200).json({
      message: "Fetched all nonces",
      nonces,
    });
  }
});

// create a durable nonce account
nonceRouter.post("/", authHandler, async (_req, res) => {
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

nonceRouter.delete("/delete/:id", authHandler, async (req, res) => {
  const vaultKeypair = Keypair.fromSecretKey(
    bs58.decode(config.vaultPrivateKey)
  );

  const connection = new Connection(config.rpc, "confirmed");

  const nonceData = await prismaClient.nonce.findUnique({
    where: {
      id: req.params.id,
    },
  });

  if (!nonceData) {
    return res.status(404).json({
      message: "nonce not found",
    });
  }

  const accountInfo = await connection.getAccountInfo(
    new PublicKey(nonceData.publicKey)
  );
  if (!accountInfo) {
    return res.status(500).json({
      message: "nonce account not found",
    });
  }

  const tx = new Transaction().add(
    SystemProgram.nonceWithdraw({
      authorizedPubkey: vaultKeypair.publicKey,
      toPubkey: vaultKeypair.publicKey,
      noncePubkey: new PublicKey(nonceData.publicKey),
      lamports: accountInfo.lamports,
    })
  );

  const signature = await connection.sendTransaction(tx, [vaultKeypair]);

  await connection.confirmTransaction(signature);

  await prismaClient.nonce.update({
    where: {
      id: req.params.id,
    },
    data: {
      deleteTxSig: signature,
      isDeleted: true,
    },
  });

  return res.status(200).json({
    message: "Nonce deleted successfully",
    signature: signature,
  });
});

nonceRouter.delete("/all-used", authHandler, async (_req, res) => {
  const vaultKeypair = Keypair.fromSecretKey(
    bs58.decode(config.vaultPrivateKey)
  );

  const connection = new Connection(config.rpc, "confirmed");

  const usedNonceDatas = await prismaClient.nonce.findMany({
    where: {
      isActive: true,
      isDeleted: false,
    },
  });

  if (!usedNonceDatas) {
    return res.status(404).json({
      message: "no used nonces found",
    });
  }

  // break into batches of 5

  const batches = [];
  const batchSize = 5;
  for (let i = 0; i < usedNonceDatas.length; i += batchSize) {
    batches.push(usedNonceDatas.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const tx = new Transaction();
    for (const nonceData of batch) {
      const accountInfo = await connection.getAccountInfo(
        new PublicKey(nonceData.publicKey)
      );
      if (!accountInfo) {
        return res.status(500).json({
          message: "nonce account not found",
        });
      }

      tx.add(
        SystemProgram.nonceWithdraw({
          authorizedPubkey: vaultKeypair.publicKey,
          toPubkey: vaultKeypair.publicKey,
          noncePubkey: new PublicKey(nonceData.publicKey),
          lamports: accountInfo.lamports,
        })
      );
    }

    const signature = await connection.sendTransaction(tx, [vaultKeypair]);

    await connection.confirmTransaction(signature);

    for (const nonceData of batch) {
      await prismaClient.nonce.update({
        where: {
          id: nonceData.id,
        },
        data: {
          deleteTxSig: signature,
          isDeleted: true,
        },
      });
    }
  }

  return res.status(200).json({
    message: "All used nonces deleted successfully",
    number: usedNonceDatas.length,
  });
});

export default nonceRouter;
