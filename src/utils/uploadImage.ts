import { NFTStorage } from "nft.storage";
import config from "config";
import fs from "fs";

const client = new NFTStorage({ token: config.nftStorage });

export const uploadMutlerFile = async (file: Express.Multer.File) => {
  const blob = new Blob([fs.readFileSync(file!.path)], {
    type: file?.mimetype,
  });

  fs.unlinkSync(file!.path);

  const cid = await client.storeBlob(blob);

  const gatewayUri = `https://ipfs.io/ipfs/${cid}`;

  return {
    cid,
    gatewayUri,
  };
};

export const uploadObject = async (object: any) => {
  const blob = new Blob([JSON.stringify(object)], {
    type: "application/json",
  });

  const cid = await client.storeBlob(blob);

  const gatewayUri = `https://ipfs.io/ipfs/${cid}`;

  return {
    cid,
    gatewayUri,
  };
};
