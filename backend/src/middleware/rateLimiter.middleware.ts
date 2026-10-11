import rateLimit from 'express-rate-limit';

const rateLimitFn = (typeof rateLimit === 'function' ? rateLimit : (rateLimit as any).default) as any;

// Global limiter for standard API routes (300 requests per 15 minutes)
export const globalLimiter = rateLimitFn({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true, // Return standard RateLimit headers in response
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Brute-force limiter for sensitive auth routes (50 requests per 15 minutes)
export const authLimiter = rateLimitFn({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many login attempts. Account protected; please try again after 15 minutes.',
  },
}); 