import * as dotenv from "dotenv";
import path from "path";
import Joi from "joi";

dotenv.config();

const envSchema = Joi.object().keys({});

const { value: validatedEnv, error } = envSchema
  .prefs({ errors: { label: "key" } })
  .validate(process.env, { abortEarly: false, stripUnknown: true });

if (error) {
  throw new Error(
    `Environment variable validation error: \n${error.details
      .map((detail) => detail.message)
      .join("\n")}`,
  );
}

const config = {} as const;

export default config;
