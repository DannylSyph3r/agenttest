import { Router, Request, Response } from 'express';
import * as userService from '../services/user-service';
import { validateUserData } from '../utils/validator';
import logger from '../utils/logger';

const router = Router();

router.post('/users', async (req: Request, res: Response) => {
  try {
    await validateUserData(req.body);
    
    const user = await userService.createUser({
      email: req.body.email,
      name: req.body.name,
      password: req.body.password,
      role: req.body.role
    });
    
    return res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/users/:id', async (req: Request, res: Response) => {
  logger.info('GET /users/:id', { userId: req.params.id });
  
  try {
    const user = await userService.getUserById(parseInt(req.params.id));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
  } catch (error: any) {
    logger.error('Error fetching user', { userId: req.params.id, error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', async (req: Request, res: Response) => {
  logger.info('GET /users', { query: req.query });
  
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const users = await userService.listUsers(limit, offset);
    
    return res.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role
      })),
      limit,
      offset
    });
  } catch (error: any) {
    logger.error('Error listing users', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const updates = req.body;
    
    const user = await userService.updateUserProfile(userId, updates);
    
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const deleted = await userService.deleteUser(userId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.patch('/users/:id/role', async (req: Request, res: Response) => {
  logger.info('PATCH /users/:id/role', { userId: req.params.id, role: req.body.role });
  
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }
    
    const user = await userService.updateUserRole(userId, role);
    
    return res.json({
      id: user.id,
      role: user.role
    });
  } catch (error: any) {
    logger.error('Error updating user role', { userId: req.params.id, error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/deactivate', async (req: Request, res: Response) => {
  logger.info('POST /users/:id/deactivate', { userId: req.params.id });
  
  try {
    const userId = parseInt(req.params.id);
    await userService.deactivateUser(userId);
    
    return res.status(200).json({ message: 'User deactivated' });
  } catch (error: any) {
    logger.error('Error deactivating user', { userId: req.params.id, error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;