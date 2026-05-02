const rateLimit = require('express-rate-limit');

// Using memory store for rate limiting (Redis can be added later)
console.log('Using memory store for rate limiting');

const isRateLimitEnabled = process.env.RATE_LIMIT_ENABLED === 'true' || process.env.NODE_ENV === 'production';

if (!isRateLimitEnabled) {
  console.log('Rate limiting disabled for non-production environment');
}

// Create rate limiter factory
const createRateLimiter = (options) => {
  if (!isRateLimitEnabled) {
    return (req, res, next) => next();
  }

  const config = {
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
    max: options.max || 100, // 100 requests default
    message: {
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(options.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req) => req.ip),
    skip: options.skip || ((req, res) => false)
  };
  
  // Merge additional options
  if (options) {
    Object.assign(config, options);
  }

  // Using memory store for now (Redis can be added later)

  return rateLimit(config);
};

// Predefined rate limiters for different endpoints
const rateLimiters = {
  // General API rate limit
  general: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: {
      error: 'Too many requests, please try again later',
      code: 'GENERAL_RATE_LIMIT_EXCEEDED'
    }
  }),

  // Authentication endpoints - stricter limits
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: {
      error: 'Too many login attempts, please try again later',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    skipSuccessfulRequests: true
  }),

  // Password change - very strict
  passwordChange: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: {
      error: 'Too many password change attempts, please try again later',
      code: 'PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED'
    }
  }),

  // Order creation - moderate limits
  orderCreation: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 orders per 5 minutes
    message: {
      error: 'Too many order creation attempts, please slow down',
      code: 'ORDER_CREATION_RATE_LIMIT_EXCEEDED'
    }
  }),

  // Report generation - strict limits
  reports: createRateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // 10 reports per 10 minutes
    message: {
      error: 'Too many report requests, please try again later',
      code: 'REPORTS_RATE_LIMIT_EXCEEDED'
    }
  }),

  // File uploads - strict limits
  upload: createRateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // 5 uploads per 10 minutes
    message: {
      error: 'Too many upload attempts, please try again later',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
    }
  }),

  // API search endpoints
  search: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: {
      error: 'Too many search requests, please try again later',
      code: 'SEARCH_RATE_LIMIT_EXCEEDED'
    }
  })
};

// Dynamic rate limiter based on user role
const createRoleBasedLimiter = (roleLimits) => {
  const limitersByRole = Object.entries(roleLimits).reduce((acc, [role, limits]) => {
    acc[role] = createRateLimiter(limits);
    return acc;
  }, {});

  const fallbackLimiter = limitersByRole.anonymous || createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  });

  return (req, res, next) => {
    const userRole = req.user?.role || 'anonymous';
    const limiter = limitersByRole[userRole] || fallbackLimiter;
    return limiter(req, res, next);
  };
};

// Role-based rate limits
const roleBasedLimits = {
  admin: {
    windowMs: 15 * 60 * 1000,
    max: 200, // Higher limit for admins
    message: {
      error: 'Admin rate limit exceeded',
      code: 'ADMIN_RATE_LIMIT_EXCEEDED'
    }
  },
  waiter: {
    windowMs: 15 * 60 * 1000,
    max: 150, // Moderate limit for waiters
    message: {
      error: 'Waiter rate limit exceeded',
      code: 'WAITER_RATE_LIMIT_EXCEEDED'
    }
  },
  anonymous: {
    windowMs: 15 * 60 * 1000,
    max: 50, // Lower limit for anonymous users
    message: {
      error: 'Anonymous rate limit exceeded',
      code: 'ANONYMOUS_RATE_LIMIT_EXCEEDED'
    }
  }
};

module.exports = {
  createRateLimiter,
  rateLimiters,
  createRoleBasedLimiter,
  roleBasedLimits
};
