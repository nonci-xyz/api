import { Connection, Keypair, Transaction } from "@solana/web3.js";
import amqplib, { ConsumeMessage } from "amqplib";
import bs58 from "bs58";
import config from "config";
import prismaClient from "config/prisma";

const queue = "txs";

export const worker = async () => {
  const conn = await amqplib.connect(
    "amqps://ozcptnqp:WmlvgTauAdyX1nQ1sXl_cSFxx5Dgm-vw@puffin.rmq2.cloudamqp.com/ozcptnqp",
  );

  const channel = await conn.createChannel();

  channel.assertQueue(queue, {
    durable: true,
  });

  process.once("SIGINT", async () => {
    await channel.close();
    await conn.close();
  });

  try {
    await channel.consume(queue, async (message) => {
      const txItem = JSON.parse(message!.content.toString());
      console.log("txItem", txItem);
      // const vaultKeypair = Keypair.fromSecretKey(
      //   bs58.decode(config.vaultPrivateKey)
      // );

      // const transaction = Transaction.from(txItem.signedTx);

      // const connection = new Connection(config.rpc, "confirmed");

      // transaction.recentBlockhash = txItem.durableNonce.nonceValue;
      // transaction.feePayer = vaultKeypair.publicKey;

      // const signature = await connection.sendTransaction(transaction, [
      //   vaultKeypair,
      // ]);

      // await connection.confirmTransaction(signature);

      // console.log("sig", signature);

      await prismaClient.transaction.update({
        where: {
          id: txItem.id,
        },
        data: {
          isProcessed: true,
          signature: "huehue",
          durableNonce: {
            update: {
              isActive: false,
            },
          },
        },
      });

      channel.ack(message!);
    });
  } catch (err) {
    console.log(err);
  }
};
