import amqplib from "amqplib";

const queue = "txs";
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

await channel.consume(
  queue,
  (message) => {
    let tx = JSON.parse(message!.content.toString());

    // todo: do shit here bru
  },
  { noAck: true },
);
