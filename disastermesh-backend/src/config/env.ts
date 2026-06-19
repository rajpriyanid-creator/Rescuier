import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || '',
  NEO4J_URI: process.env.NEO4J_URI || '',
  NEO4J_USERNAME: process.env.NEO4J_USERNAME || 'neo4j',
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD || '',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_dev_secret_change_in_prod',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_change_in_prod',
  SARVAM_API_KEY: process.env.SARVAM_API_KEY || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  EXPO_PUSH_URL: process.env.EXPO_PUSH_URL || 'https://exp.host/--/api/v2/push/send',
};
