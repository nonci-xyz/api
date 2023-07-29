import { Connection, Keypair, Transaction } from "@solana/web3.js";
import amqplib from "amqplib";
import bs58 from "bs58";
import config from "config";
import prismaClient from "config/prisma";
import { retryer } from "amqplib-binary-retry";

const queue = "txs";

export const worker = async () => {
  const conn = await amqplib.connect(config.amqpUrl);

  const channel = await conn.createChannel();

  channel.assertQueue(queue, {
    durable: true,
  });

  process.once("SIGINT", async () => {
    await channel.close();
    await conn.close();
  });

  await channel.consume(
    queue,
    retryer({
      channel,
      consumerQueue: queue,
      handler: async (message) => {
        // try {
        const txItem = JSON.parse(message!.content.toString());
        console.log("txItem", txItem);
        const vaultKeypair = Keypair.fromSecretKey(
          bs58.decode(config.vaultPrivateKey),
        );

        const transaction = Transaction.from(
          Buffer.from(txItem.signedTx, "base64"),
        );

        const connection = new Connection(config.rpc, "confirmed");

        transaction.recentBlockhash = txItem.durableNonce.nonceValue;
        transaction.feePayer = vaultKeypair.publicKey;

        const signature = await connection.sendTransaction(transaction, [
          vaultKeypair,
        ]);

        await connection.confirmTransaction(signature);

        console.log("sig", signature);

        await prismaClient.transaction.update({
          where: {
            id: txItem.id,
          },
          data: {
            isProcessed: true,
            signature: signature,
            durableNonce: {
              update: {
                isActive: false,
              },
            },
          },
        });
      },
      delayFunction(attempt) {
        if (attempt > 3) {
          return -1;
        }
        return 500 * Math.pow(2, attempt);
      },
    }),
  );
};
