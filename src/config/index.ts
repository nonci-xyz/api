import * as dotenv from "dotenv";
import path from "path";
import Joi from "joi";

dotenv.config();

const envSchema = Joi.object().keys({
  VAULT_PRIVATE_KEY: Joi.string().required(),
  VAULT_PUBLIC_KEY: Joi.string().required(),
  DATABASE_URL: Joi.string().required(),
  RPC: Joi.string().optional(),
  SECRET: Joi.string().required(),
  AMQP_URL: Joi.string().required(),
  PORT: Joi.number().default(3000),
});

const { value: validatedEnv, error } = envSchema
  .prefs({ errors: { label: "key" } })
  .validate(process.env, { abortEarly: false, stripUnknown: true });

if (error) {
  throw new Error(
    `Environment variable validation error: \n${error.details
      .map((detail) => detail.message)
      .join("\n")}`
  );
}

const config = {
  vaultPrivateKey: validatedEnv.VAULT_PRIVATE_KEY,
  vaultPublicKey: validatedEnv.VAULT_PUBLIC_KEY,
  rpc: validatedEnv.RPC,
  secret: validatedEnv.SECRET,
  amqpUrl: validatedEnv.AMQP_URL,
  port: validatedEnv.PORT,
} as const;

export default config;
