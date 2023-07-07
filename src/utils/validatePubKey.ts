import { PublicKey } from "@solana/web3.js";

export const validatePubKey = (address: string) => {
  try {
    let pubKey = new PublicKey(address);
    return PublicKey.isOnCurve(pubKey);
  } catch (error) {
    return false;
  }
};
