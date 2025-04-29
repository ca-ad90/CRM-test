import { tokensDb } from '../db/tokens.js';
import { usersDb } from '../db/users.js';

/**
 * Middleware to handle authentication via token
 * Sets req.userId, req.user and req.permissions if authenticated
 */
export const authenticate = async (req, res, next) => {
  console.log("authenticate")
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

    // Get user permissions
    req.permissions = await usersDb.getUserPermissions(user.user_id);

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: "Authentication failed" });
  }
};

/**
 * Middleware to check if user has specific permissions
 * @param {string|string[]} requiredPermissions - Permission(s) to check
 */
export const requirePermission = (requiredPermissions) => {
  return (req, res, next) => {
    try {
      // Convert single permission to array
      const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // Check if user is admin (has all permissions)
      if (req.user?.role_id === 1) {
        return next();
      }

      // Check if user has all required permissions
      const hasAllPermissions = permissions.every(permission =>
        req.permissions?.includes(permission)
      );

      if (!hasAllPermissions) {
        return res.status(403).json({
          error: "You don't have permission to perform this action"
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: "Permission check failed" });
    }
  };
};

/**
 * Middleware to make authentication optional
 * Sets req.userId, req.user and req.permissions if token is valid, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  console.log("optionalAuth")
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

        // Get user permissions
        req.permissions = await usersDb.getUserPermissions(user.user_id);
      }
    }
    console.log(req.user)
    next();
  } catch (error) {
    // Just continue without authentication
    next();
  }
};

/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = (req, res, next) => {
  console.log(req.user)
  if (req.user?.role_id !== 1) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

/**
 * Middleware to check if user has access to specified resource
 * Admins automatically have access to all resources
 */
export const checkResourceAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = parseInt(req.params.id);

      // If user is admin, they have access to everything
      if (req.user?.role_id === 1) {
        return next();
      }

      // Check if user has access to this resource
      let hasAccess = false;

      switch (resourceType) {
        case 'company':
          const companyDb = (await import('../db/companies.js')).companiesDb;
          hasAccess = await companyDb.checkUserAccess(resourceId, req.userId);
          break;
        case 'contact':
          const contactDb = (await import('../db/contacts.js')).contactsDb;
          hasAccess = await contactDb.checkUserAccess(resourceId, req.userId);
          break;
        case 'communication':
          const communicationDb = (await import('../db/communications.js')).communicationsDb;
          hasAccess = await communicationDb.checkUserAccess(resourceId, req.userId);
          break;
        case 'meeting':
          const meetingDb = (await import('../db/meetings.js')).meetingsDb;
          hasAccess = await meetingDb.checkUserAccess(resourceId, req.userId);
          break;
        default:
          return res.status(400).json({ error: "Invalid resource type" });
      }

      if (!hasAccess) {
        return res.status(403).json({
          error: `You don't have access to this ${resourceType}`
        });
      }

      next();
    } catch (error) {
      console.error('Resource access check error:', error);
      res.status(500).json({ error: "Resource access check failed" });
    }
  };
};

/**
 * Log user activity for audit purposes
 */
export const logActivity = async (userId, actionType, entityType, entityId, details, ip) => {
  try {
    const db = await (await import('../db/connection.js')).getDbConnection();

    await db.run(
      `INSERT INTO activity_log
       (user_id, action_type, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, actionType, entityType, entityId, details, ip]
    );
  } catch (error) {
    console.error('Activity logging error:', error);
  }
};
