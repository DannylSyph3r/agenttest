import bcrypt from 'bcrypt';
import { executeQuery, executeTransaction, insertRecord, updateRecord, deleteRecord } from '../db/repository';
import logger from '../utils/logger';

export interface User {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role?: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, 10);
  
  const userData = {
    email: input.email,
    name: input.name,
    password_hash: passwordHash,
    role: input.role || 'user'
  };
  
  logger.info('Creating new user', { email: input.email });
  const user = await insertRecord<User>('users', userData);
  logger.info('User created successfully', { userId: user.id });
  
  return user;
}

export async function getUserById(userId: number): Promise<User | null> {
  logger.info('Fetching user by ID', { userId });
  
  const result = await executeQuery<User>(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  
  return result.rows[0] || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await executeQuery<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  
  return result.rows[0] || null;
}

export async function updateUserProfile(
  userId: number,
  updates: Partial<Pick<User, 'name' | 'email'>>
): Promise<User> {
  const updateData: Record<string, any> = {};
  
  if (updates.name) updateData.name = updates.name;
  if (updates.email) updateData.email = updates.email;
  
  const user = await updateRecord<User>('users', userId, updateData);
  return user;
}

export async function changeUserPassword(
  userId: number,
  newPassword: string
): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  
  await executeQuery(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, userId]
  );
}

export async function updateUserRole(
  userId: number,
  role: string
): Promise<User> {
  const result = await executeQuery<User>(
    'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [role, userId]
  );
  
  return result.rows[0];
}

export async function deactivateUser(userId: number): Promise<void> {
  await executeQuery(
    'UPDATE users SET active = false, updated_at = NOW() WHERE id = $1',
    [userId]
  );
}

export async function deleteUser(userId: number): Promise<boolean> {
  return await deleteRecord('users', userId);
}

export async function verifyUserPassword(
  email: string,
  password: string
): Promise<User | null> {
  const user = await getUserByEmail(email);
  
  if (!user) {
    logger.warn('Login attempt for non-existent user', { email });
    return null;
  }
  
  const isValid = await bcrypt.compare(password, user.password_hash);
  
  if (!isValid) {
    logger.warn('Invalid password attempt', { userId: user.id });
    return null;
  }
  
  logger.info('User authenticated successfully', { userId: user.id });
  return user;
}

export async function listUsers(
  limit: number = 50,
  offset: number = 0
): Promise<User[]> {
  logger.info('Listing users', { limit, offset });
  
  const result = await executeQuery<User>(
    'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  
  return result.rows;
}
