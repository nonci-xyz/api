const { Keypair } = require("@solana/web3.js");
const bs58 = require("bs58");

const keypair = Keypair.generate();

console.log("publicKey", keypair.publicKey.toBase58());
const key = bs58.encode(keypair.secretKey);
console.log("privateKey", key);
