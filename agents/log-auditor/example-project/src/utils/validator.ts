import logger from './logger';

export interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export async function validateEmail(email: string): Promise<boolean> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function validatePassword(password: string): Promise<boolean> {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

export async function validateUserData(data: any): Promise<void> {
  try {
    const rules: ValidationRule[] = [
      { field: 'email', required: true },
      { field: 'password', required: true, minLength: 8 },
      { field: 'name', required: true, minLength: 2, maxLength: 100 }
    ];

    for (const rule of rules) {
      if (rule.required && !data[rule.field]) {
        throw new Error(`${rule.field} is required`);
      }

      const value = data[rule.field];
      if (value && rule.minLength && value.length < rule.minLength) {
        throw new Error(`${rule.field} must be at least ${rule.minLength} characters`);
      }

      if (value && rule.maxLength && value.length > rule.maxLength) {
        throw new Error(`${rule.field} must not exceed ${rule.maxLength} characters`);
      }
    }

    if (data.email && !(await validateEmail(data.email))) {
      throw new Error('Invalid email format');
    }

    if (data.password && !(await validatePassword(data.password))) {
      throw new Error('Password does not meet requirements');
    }
  } catch (err) {
    throw new Error('Validation failed');
  }
}

export async function validateOrderData(data: any): Promise<void> {
  try {
    if (!data.userId) throw new Error('User ID required');
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Order must contain items');
    }

    for (const item of data.items) {
      if (!item.productId) throw new Error('Product ID required for each item');
      if (!item.quantity || item.quantity <= 0) {
        throw new Error('Quantity must be positive');
      }
    }
  } catch (error) {
    throw new Error('Order validation failed');
  }
}
