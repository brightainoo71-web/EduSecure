import { Router } from 'express';
import {
  register,
  login,
  refreshSession,
  logout,
  verifyEmail,
  resendVerificationEmail,
} from '../controllers/auth.controller.js';
import {
  setup2FA,
  verifyAndEnable2FA,
  loginWith2FA,
  sendLogin2FACodeToEmail,
} from '../controllers/twoFactor.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

// Primary auth routes (authLimiter applied to sensitive endpoints)
router.post('/register', authLimiter, register);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-verification', authLimiter, resendVerificationEmail);
router.post('/login', authLimiter, login);
router.post('/refresh', refreshSession);
router.post('/logout', logout);

// 2FA routes
router.post('/2fa/setup', requireAuth, setup2FA);
router.post('/2fa/verify', requireAuth, verifyAndEnable2FA);
router.post('/2fa/login', authLimiter, loginWith2FA);
router.post('/2fa/send-email', authLimiter, sendLogin2FACodeToEmail);

// User profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { getDb } = await import('../config/firebase.js');
    const db = getDb();
    const doc = await db.collection('users').doc(req.user!.username.toLowerCase()).get();
    if (doc.exists) {
      const data = doc.data()!;
      return res.status(200).json({
        status: 'success',
        message: 'Authorized access to profile',
        user: {
          id: data.id || doc.id,
          username: data.displayName || data.username,
          email: data.email,
          role: data.role,
          isEmailVerified: !!data.isEmailVerified,
          isTwoFactorEnabled: !!data.isTwoFactorEnabled,
        },
      });
    }
    return res.status(200).json({
      status: 'success',
      message: 'Authorized access to profile',
      user: {
        id: req.user!.userId,
        username: req.user!.username,
        role: req.user!.role,
        isTwoFactorEnabled: false,
      },
    });
  } catch {
    return res.status(500).json({ status: 'error', message: 'Failed to load profile' });
  }
});

export default router; 