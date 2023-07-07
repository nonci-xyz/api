import { decode } from "next-auth/jwt";

export const verify = async (token: string, secret: string) => {
  return await decode({
    token,
    secret,
  });
};
