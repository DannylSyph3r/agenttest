import { executeQuery, executeTransaction, insertRecord, updateRecord, deleteRecord } from '../db/repository';
import logger from '../utils/logger';
import { sendOrderConfirmation, sendOrderCancellation } from './notification-service';

export interface Order {
  id: number;
  user_id: number;
  status: string;
  total_amount: number;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
}

export interface CreateOrderInput {
  userId: number;
  items: Array<{
    productId: number;
    quantity: number;
    price: number;
  }>;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  logger.info('Creating new order', { userId: input.userId, itemCount: input.items.length });
  
  return await executeTransaction(async (client) => {
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, total_amount) 
       VALUES ($1, $2, $3) RETURNING *`,
      [input.userId, 'pending', totalAmount]
    );
    
    const order = orderResult.rows[0];
    logger.info('Order created', { orderId: order.id });
    
    for (const item of input.items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.productId, item.quantity, item.price]
      );
    }
    
    logger.info('Order items added', { orderId: order.id, itemCount: input.items.length });
    
    try {
      await sendOrderConfirmation(order.id, input.userId);
    } catch (error) {
      logger.error('Failed to send order confirmation', { orderId: order.id, error });
    }
    
    return order;
  });
}

export async function getOrderById(orderId: number): Promise<Order | null> {
  logger.info('Fetching order', { orderId });
  
  const result = await executeQuery<Order>(
    'SELECT * FROM orders WHERE id = $1',
    [orderId]
  );
  
  return result.rows[0] || null;
}

export async function getOrdersByUser(userId: number): Promise<Order[]> {
  logger.info('Fetching user orders', { userId });
  
  const result = await executeQuery<Order>(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  
  return result.rows;
}

export async function updateOrderStatus(
  orderId: number,
  status: string
): Promise<Order> {
  logger.info('Updating order status', { orderId, status });
  
  const result = await executeQuery<Order>(
    'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, orderId]
  );
  
  const order = result.rows[0];
  logger.info('Order status updated', { orderId, newStatus: status });
  
  return order;
}

export async function markOrderPaid(orderId: number): Promise<Order> {
  const result = await executeQuery<Order>(
    'UPDATE orders SET status = $1, paid_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *',
    ['paid', orderId]
  );
  
  return result.rows[0];
}

export async function cancelOrder(orderId: number): Promise<void> {
  await executeQuery(
    'DELETE FROM order_items WHERE order_id = $1',
    [orderId]
  );
  
  await executeQuery(
    'DELETE FROM orders WHERE id = $1',
    [orderId]
  );
  
  try {
    const order = await getOrderById(orderId);
    if (order) {
      await sendOrderCancellation(orderId, order.user_id);
    }
  } catch (error) {
  }
}

export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  logger.info('Fetching order items', { orderId });
  
  const result = await executeQuery<OrderItem>(
    'SELECT * FROM order_items WHERE order_id = $1',
    [orderId]
  );
  
  return result.rows;
}

export async function calculateOrderTotal(orderId: number): Promise<number> {
  const result = await executeQuery<{ total: number }>(
    'SELECT SUM(price * quantity) as total FROM order_items WHERE order_id = $1',
    [orderId]
  );
  
  return result.rows[0]?.total || 0;
}

export async function fulfillOrder(orderId: number): Promise<Order> {
  logger.info('Fulfilling order', { orderId });
  
  const order = await updateOrderStatus(orderId, 'fulfilled');
  
  logger.info('Order fulfilled', { orderId });
  return order;
}
