import { Pool, PoolClient } from 'pg';
import logger from '../utils/logger';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'orderdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000
});

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export async function executeQuery<T>(
  query: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0
    };
  } finally {
    client.release();
  }
}

export async function executeTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function insertRecord<T>(
  table: string,
  data: Record<string, any>
): Promise<T> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  
  const query = `
    INSERT INTO ${table} (${keys.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  const result = await executeQuery<T>(query, values);
  return result.rows[0];
}

export async function updateRecord<T>(
  table: string,
  id: number,
  data: Record<string, any>
): Promise<T> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  
  const query = `
    UPDATE ${table}
    SET ${setClause}, updated_at = NOW()
    WHERE id = $${values.length + 1}
    RETURNING *
  `;
  
  const result = await executeQuery<T>(query, [...values, id]);
  return result.rows[0];
}

export async function deleteRecord(table: string, id: number): Promise<boolean> {
  const query = `DELETE FROM ${table} WHERE id = $1`;
  
  const result = await executeQuery(query, [id]);
  return result.rowCount > 0;
}

export async function findById<T>(
  table: string,
  id: number
): Promise<T | null> {
  logger.info(`Fetching record from ${table}`, { id });
  const query = `SELECT * FROM ${table} WHERE id = $1`;
  const result = await executeQuery<T>(query, [id]);
  return result.rows[0] || null;
}

export async function findAll<T>(
  table: string,
  limit: number = 100,
  offset: number = 0
): Promise<T[]> {
  logger.info(`Fetching records from ${table}`, { limit, offset });
  const query = `SELECT * FROM ${table} LIMIT $1 OFFSET $2`;
  const result = await executeQuery<T>(query, [limit, offset]);
  return result.rows;
}

export default pool;
