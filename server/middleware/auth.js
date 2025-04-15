import { tokensDb } from '../db/tokens.js';
import { usersDb } from '../db/users.js';

/**
 * Middleware to handle authentication via token
 * Sets req.userId and req.user if authenticated
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from cookies or Authorization header
    const token = req.cookies?.authToken ||
                  req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate token
    const user = await tokensDb.validateToken(token);

    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Set user info on request object
    req.userId = user.user_id;
    req.user = user;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: "Authentication failed" });
  }
};

/**
 * Middleware to make authentication optional
 * Sets req.userId and req.user if token is valid, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    // Get token from cookies or Authorization header
    const token = req.cookies?.authToken ||
                  req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      // Validate token
      const user = await tokensDb.validateToken(token);

      if (user) {
        // Set user info on request object
        req.userId = user.user_id;
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Just continue without authentication
    next();
  }
};

/**
 * Special middleware for endpoints that need to handle both authenticated
 * and unauthenticated states differently
 */
export const checkAuth = async (req, res, next) => {
  try {
    // Get token from cookies or Authorization header
    const token = req.cookies?.authToken ||
                  req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      // Validate token
      const user = await tokensDb.validateToken(token);

      if (user) {
        // Set user info on request object
        req.userId = user.user_id;
        req.user = user;
        req.isAuthenticated = true;
      } else {
        req.isAuthenticated = false;
      }
    } else {
      req.isAuthenticated = false;
    }

    next();
  } catch (error) {
    req.isAuthenticated = false;
    next();
  }
};
