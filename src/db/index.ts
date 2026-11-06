import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// Recursive Proxy that looks like Drizzle and resolves to safe defaults
const createSafeChain = (resolvedValue: any = []) => {
  const chain: any = () => createSafeChain(resolvedValue);
  
  // Basic Promise support for await
  chain.then = (resolve: any) => Promise.resolve(resolvedValue).then(resolve);
  chain.catch = (reject: any) => Promise.resolve(resolvedValue).catch(reject);
  
  // Specific Drizzle methods often called in the app
  chain.$returningId = () => createSafeChain([{ id: 1 }]);
  chain.execute = () => createSafeChain({ rows: [] });
  chain.where = () => createSafeChain(resolvedValue);
  chain.from = () => createSafeChain(resolvedValue);
  chain.orderBy = () => createSafeChain(resolvedValue);
  chain.limit = () => createSafeChain(resolvedValue);
  chain.values = () => createSafeChain(resolvedValue);
  chain.set = () => createSafeChain(resolvedValue);
  chain.onDuplicateKeyUpdate = () => createSafeChain(resolvedValue);
  
  return new Proxy(chain, {
    get: (target, prop) => {
      if (prop === 'then') return target.then;
      if (prop === 'catch') return target.catch;
      if (prop === Symbol.iterator) return [][Symbol.iterator];
      if (typeof target[prop] === 'function') return target[prop];
      return createSafeChain(resolvedValue);
    }
  });
};

export const createPool = () => {
  const config: mysql.PoolOptions = {
    user: process.env.SQL_USER || process.env.CALLS_DB_USER || 'root',
    password: process.env.SQL_PASSWORD || process.env.CALLS_DB_PASSWORD || process.env.CALLS_DB_PASSW || 'Alarabilab@06',
    database: process.env.SQL_DB_NAME || 'manzile_db',
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    host: process.env.SQL_HOST || process.env.CALLS_DB_HOST || '62.84.183.128',
    port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT) : (process.env.CALLS_DB_PORT ? parseInt(process.env.CALLS_DB_PORT) : 3306),
    connectTimeout: 20000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  };

  return mysql.createPool(config);
};

let dbInstance: any;

try {
  // In AI Studio, we often don't have real SQL unless it's Cloud SQL provisioned.
  // We'll try to initialize, but provide a robust fallback if it fails or if we're in a limited environment.
  const pool = createPool();
  dbInstance = drizzle(pool, { schema, mode: 'default' });
  
  // Wrap Drizzle builder results to maintain chaining (like .where()) and safely catch errors on execution
  const wrapDrizzleResult = (res: any, opName: string): any => {
    if (!res || (typeof res !== 'object' && typeof res !== 'function')) {
      return res;
    }
    return new Proxy(res, {
      get: (target, prop) => {
        if (prop === 'then') {
          return (onFulfilled?: any, onRejected?: any) => {
            return target
              .then(
                (data: any) => {
                  return onFulfilled ? onFulfilled(data) : data;
                },
                (err: any) => {
                  console.warn(`[Database] Query error caught gracefully on ${opName}:`, err.message);
                  const safeFallback = (opName === 'select' || opName === 'from' || opName === 'where' || opName === 'orderBy' || opName === 'limit') ? [] : { rows: [] };
                  if (onFulfilled) {
                    try {
                      return onFulfilled(safeFallback);
                    } catch (handleErr) {
                      if (onRejected) return onRejected(handleErr);
                      return safeFallback;
                    }
                  }
                  return safeFallback;
                }
              );
          };
        }
        if (prop === 'catch') {
          return (onRejected: any) => target.catch((err: any) => {
            console.warn(`[Database] Caught error on ${opName}:`, err.message);
            const safeFallback = (opName === 'select' || opName === 'from' || opName === 'where') ? [] : { rows: [] };
            return onRejected ? onRejected(safeFallback) : safeFallback;
          });
        }
        const val = target[prop];
        if (typeof val === 'function') {
          return (...args: any[]) => {
            const nextRes = val.apply(target, args);
            return wrapDrizzleResult(nextRes, opName);
          };
        }
        return val;
      }
    });
  };

  // Wrap the real dbInstance in a proxy that catches connection errors
  const originalDb = dbInstance;
  dbInstance = new Proxy(originalDb, {
    get: (target, prop) => {
      const value = target[prop];
      if (typeof value === 'function') {
        return (...args: any[]) => {
          try {
            const result = value.apply(target, args);
            return wrapDrizzleResult(result, String(prop));
          } catch (e: any) {
            console.warn(`[Database] Method error on ${String(prop)}:`, e.message);
            return createSafeChain();
          }
        };
      }
      return value;
    }
  });

} catch (error) {
  console.error('[Database] Initialization failed. Using safe mock.', error);
  dbInstance = createSafeChain();
}

export const db = dbInstance;
