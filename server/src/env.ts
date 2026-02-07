import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT || 8080),
  DATABASE_URL: process.env.DATABASE_URL || '',
  WEB_ORIGIN: process.env.WEB_ORIGIN || 'http://localhost:5173',
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || 'change-me',
  VOTER_HASH_SALT: process.env.VOTER_HASH_SALT || 'change-me',
  CAPTCHA_PROVIDER: process.env.CAPTCHA_PROVIDER || '',
  CAPTCHA_SECRET: process.env.CAPTCHA_SECRET || '',
} as const;
