const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
  },
  skipSuccessfulRequests: true,
});

// Proposal rate limiter
const proposalLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 20, // Limit each user to 20 proposals per day
  message: {
    success: false,
    message: 'Daily proposal limit reached. Please upgrade your plan.',
  },
  keyGenerator: (req) => req.user?._id || req.ip,
});

// AI generation rate limiter
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit each user to 30 AI generations per hour
  message: {
    success: false,
    message: 'AI generation limit reached. Please try again later.',
  },
  keyGenerator: (req) => req.user?._id || req.ip,
});

// Message rate limiter (prevent spam)
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each user to 10 messages per minute
  message: {
    success: false,
    message: 'Message rate limit exceeded. Please slow down.',
  },
  keyGenerator: (req) => req.user?._id || req.ip,
});

module.exports = {
  apiLimiter,
  authLimiter,
  proposalLimiter,
  aiLimiter,
  messageLimiter,
};
