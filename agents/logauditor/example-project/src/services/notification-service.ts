import logger from '../utils/logger';

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  template?: string;
}

export async function sendEmail(notification: EmailNotification): Promise<void> {
  logger.info('Sending email', { to: notification.to, subject: notification.subject });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  logger.info('Email sent successfully', { to: notification.to });
}

export async function sendOrderConfirmation(
  orderId: number,
  userId: number
): Promise<void> {
  try {
    const user = await fetchUserEmail(userId);
    
    await sendEmail({
      to: user.email,
      subject: 'Order Confirmation',
      body: `Your order #${orderId} has been confirmed.`,
      template: 'order-confirmation'
    });
  } catch (error) {
    throw new Error('Failed to send order confirmation');
  }
}

export async function sendOrderCancellation(
  orderId: number,
  userId: number
): Promise<void> {
  try {
    const user = await fetchUserEmail(userId);
    
    await sendEmail({
      to: user.email,
      subject: 'Order Cancellation',
      body: `Your order #${orderId} has been cancelled.`,
      template: 'order-cancellation'
    });
  } catch (err) {
    throw new Error('Order cancellation notification failed');
  }
}

export async function sendPasswordReset(email: string, token: string): Promise<void> {
  logger.info('Sending password reset email', { email });
  
  try {
    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      body: `Use this token to reset your password: ${token}`,
      template: 'password-reset'
    });
    
    logger.info('Password reset email sent', { email });
  } catch (error) {
    logger.error('Failed to send password reset email', { email, error });
    throw error;
  }
}

export async function sendWelcomeEmail(userId: number): Promise<void> {
  try {
    const user = await fetchUserEmail(userId);
    
    await sendEmail({
      to: user.email,
      subject: 'Welcome!',
      body: 'Welcome to our platform!',
      template: 'welcome'
    });
    
    logger.info('Welcome email sent', { userId });
  } catch (error) {
    logger.error('Failed to send welcome email', { userId, error });
  }
}

async function fetchUserEmail(userId: number): Promise<{ email: string }> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return { email: `user${userId}@example.com` };
}

export async function sendBulkNotifications(
  userIds: number[],
  subject: string,
  body: string
): Promise<void> {
  logger.info('Sending bulk notifications', { count: userIds.length });
  
  const results = await Promise.allSettled(
    userIds.map(async (userId) => {
      const user = await fetchUserEmail(userId);
      return sendEmail({ to: user.email, subject, body });
    })
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  logger.info('Bulk notifications completed', { successful, failed });
}
