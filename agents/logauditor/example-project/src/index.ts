import express from 'express';
import dotenv from 'dotenv';
import logger from './utils/logger';

// Import API routes
import ordersRouter from './api/orders';
import productsRouter from './api/products';
import usersRouter from './api/users';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// API Routes
app.use('/api', ordersRouter);
app.use('/api', productsRouter);
app.use('/api', usersRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Order Management API',
    version: '1.0.0',
    endpoints: [
      'GET /health - Health check',
      'POST /api/orders - Create order',
      'GET /api/orders/:id - Get order',
      'PUT /api/orders/:id/status - Update order status',
      'POST /api/products - Create product',
      'GET /api/products - List products',
      'GET /api/products/:id - Get product',
      'DELETE /api/products/:id - Delete product',
      'POST /api/users - Create user',
      'GET /api/users - List users',
      'GET /api/users/:id - Get user'
    ]
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', { 
    method: req.method, 
    url: req.originalUrl 
  });
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info('Server starting', { 
    port: PORT, 
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
  console.log(`🚀 Order Management API running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;