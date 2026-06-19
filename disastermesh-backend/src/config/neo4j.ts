import neo4j, { Driver, Session } from 'neo4j-driver';
import { env } from './env';

let driver: Driver;

export const connectNeo4j = async (): Promise<void> => {
  try {
    driver = neo4j.driver(
      env.NEO4J_URI,
      neo4j.auth.basic(env.NEO4J_USERNAME, env.NEO4J_PASSWORD),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 30000,
      }
    );
    await driver.verifyConnectivity();
    console.log('✅ Neo4j AuraDB connected');
  } catch (err) {
    console.error('❌ Neo4j connection failed:', err);
    // Don't exit — app still works without Neo4j for basic features
  }
};

export const getDriver = (): Driver => driver;

export const getNeo4jSession = (): Session => {
  if (!driver) throw new Error('Neo4j driver not initialized');
  return driver.session();
};

export const closeNeo4j = async (): Promise<void> => {
  if (driver) await driver.close();
};
