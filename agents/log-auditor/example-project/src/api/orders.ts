import { Router, Request, Response } from 'express';
import * as orderService from '../services/order-service';
import { validateOrderData } from '../utils/validator';
import logger from '../utils/logger';

const router = Router();

router.post('/orders', async (req: Request, res: Response) => {
  try {
    await validateOrderData(req.body);
    
    const order = await orderService.createOrder({
      userId: req.body.userId,
      items: req.body.items
    });
    
    return res.status(201).json({
      id: order.id,
      userId: order.user_id,
      status: order.status,
      totalAmount: order.total_amount,
      createdAt: order.created_at
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/orders/:id', async (req: Request, res: Response) => {
  logger.info('GET /orders/:id', { orderId: req.params.id });
  
  try {
    const order = await orderService.getOrderById(parseInt(req.params.id));
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const items = await orderService.getOrderItems(order.id);
    
    return res.json({
      id: order.id,
      userId: order.user_id,
      status: order.status,
      totalAmount: order.total_amount,
      items: items,
      createdAt: order.created_at
    });
  } catch (error: any) {
    logger.error('Error fetching order', { orderId: req.params.id, error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:userId/orders', async (req: Request, res: Response) => {
  logger.info('GET /users/:userId/orders', { userId: req.params.userId });
  
  try {
    const orders = await orderService.getOrdersByUser(parseInt(req.params.userId));
    
    return res.json({
      orders: orders.map(o => ({
        id: o.id,
        status: o.status,
        totalAmount: o.total_amount,
        createdAt: o.created_at
      }))
    });
  } catch (error: any) {
    logger.error('Error fetching user orders', { userId: req.params.userId, error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const order = await orderService.updateOrderStatus(orderId, status);
    
    return res.json({
      id: order.id,
      status: order.status,
      updatedAt: order.updated_at
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update order status' });
  }
});

router.delete('/orders/:id', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    await orderService.cancelOrder(orderId);
    
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to cancel order' });
  }
});

router.post('/orders/:id/fulfill', async (req: Request, res: Response) => {
  logger.info('POST /orders/:id/fulfill', { orderId: req.params.id });
  
  try {
    const orderId = parseInt(req.params.id);
    const order = await orderService.fulfillOrder(orderId);
    
    return res.json({
      id: order.id,
      status: order.status,
      updatedAt: order.updated_at
    });
  } catch (error: any) {
    logger.error('Error fulfilling order', { orderId: req.params.id, error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/orders/:id/pay', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await orderService.markOrderPaid(orderId);
    
    return res.json({
      id: order.id,
      status: order.status,
      paidAt: order.updated_at
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Payment processing failed' });
  }
});

export default router;