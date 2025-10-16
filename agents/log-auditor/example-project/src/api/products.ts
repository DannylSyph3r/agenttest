import { Router, Request, Response } from 'express';
import { executeQuery, insertRecord, updateRecord, deleteRecord } from '../db/repository';
import logger from '../utils/logger';

const router = Router();

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  created_at: Date;
  updated_at: Date;
}

router.post('/products', async (req: Request, res: Response) => {
  logger.info('POST /products', { body: req.body });
  
  try {
    const { name, description, price, stock } = req.body;
    
    if (!name || !price) {
      logger.warn('Missing required fields', { body: req.body });
      return res.status(400).json({ error: 'Name and price are required' });
    }
    
    logger.info('Creating product', { name, price });
    const product = await insertRecord<Product>('products', {
      name,
      description: description || '',
      price,
      stock: stock || 0
    });
    
    logger.info('Product created successfully', { productId: product.id });
    
    return res.status(201).json({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock
    });
  } catch (error: any) {
    logger.error('Error creating product', { error, body: req.body });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/products', async (req: Request, res: Response) => {
  logger.info('GET /products', { query: req.query });
  
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await executeQuery<Product>(
      'SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    logger.info('Products fetched', { count: result.rows.length });
    
    return res.json({
      products: result.rows,
      limit,
      offset
    });
  } catch (error: any) {
    logger.error('Error fetching products', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/products/:id', async (req: Request, res: Response) => {
  logger.info('GET /products/:id', { productId: req.params.id });
  
  try {
    const result = await executeQuery<Product>(
      'SELECT * FROM products WHERE id = $1',
      [parseInt(req.params.id)]
    );
    
    if (result.rows.length === 0) {
      logger.warn('Product not found', { productId: req.params.id });
      return res.status(404).json({ error: 'Product not found' });
    }
    
    logger.info('Product fetched', { productId: req.params.id });
    return res.json(result.rows[0]);
  } catch (error: any) {
    logger.error('Error fetching product', { productId: req.params.id, error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/products/:id', async (req: Request, res: Response) => {
  logger.info('PUT /products/:id', { productId: req.params.id, body: req.body });
  
  try {
    const productId = parseInt(req.params.id);
    const updates = req.body;
    
    logger.info('Updating product', { productId, updates });
    const product = await updateRecord<Product>('products', productId, updates);
    
    logger.info('Product updated successfully', { productId });
    
    return res.json({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock
    });
  } catch (error: any) {
    logger.error('Error updating product', { productId: req.params.id, error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/products/:id', async (req: Request, res: Response) => {
  logger.info('DELETE /products/:id', { productId: req.params.id });
  
  try {
    const productId = parseInt(req.params.id);
    
    logger.warn('Deleting product', { productId });
    const deleted = await deleteRecord('products', productId);
    
    if (!deleted) {
      logger.warn('Product not found for deletion', { productId });
      return res.status(404).json({ error: 'Product not found' });
    }
    
    logger.info('Product deleted successfully', { productId });
    return res.status(204).send();
  } catch (error: any) {
    logger.error('Error deleting product', { productId: req.params.id, error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/products/:id/stock', async (req: Request, res: Response) => {
  logger.info('PATCH /products/:id/stock', { productId: req.params.id, body: req.body });
  
  try {
    const productId = parseInt(req.params.id);
    const { quantity } = req.body;
    
    if (quantity === undefined) {
      logger.warn('Missing stock quantity', { productId });
      return res.status(400).json({ error: 'Quantity is required' });
    }
    
    logger.info('Updating product stock', { productId, quantity });
    
    const result = await executeQuery<Product>(
      'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [quantity, productId]
    );
    
    if (result.rows.length === 0) {
      logger.warn('Product not found for stock update', { productId });
      return res.status(404).json({ error: 'Product not found' });
    }
    
    logger.info('Product stock updated', { productId, newStock: result.rows[0].stock });
    
    return res.json({
      id: result.rows[0].id,
      stock: result.rows[0].stock
    });
  } catch (error: any) {
    logger.error('Error updating product stock', { productId: req.params.id, error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;