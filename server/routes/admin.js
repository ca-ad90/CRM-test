import express from 'express';
import { usersDb } from '../db/users.js';
import { companiesDb } from '../db/companies.js';
import { contactsDb } from '../db/contacts.js';
import { communicationsDb } from '../db/communications.js';
import { meetingsDb } from '../db/meetings.js';
import { getDbConnection } from '../db/connection.js';
import { authenticate, requireAdmin, logActivity } from '../middleware/auth.js';

const adminRouter = express.Router();

// Protect all admin routes with authentication and admin check
adminRouter.use(authenticate);
adminRouter.use(requireAdmin);

// Get admin dashboard stats
adminRouter.get('/dashboard', async (req, res, next) => {
  try {
    const db = await getDbConnection();

    // Get counts from all tables
    const userStats = await usersDb.getUserStats();

    const companiesCount = await db.get("SELECT COUNT(*) as count FROM companies");
    const contactsCount = await db.get("SELECT COUNT(*) as count FROM contacts");
    const communicationsCount = await db.get("SELECT COUNT(*) as count FROM communications");
    const meetingsCount = await db.get("SELECT COUNT(*) as count FROM meetings");

    // Get recent activities
    const recentActivities = await db.all(`
      SELECT l.log_id, l.action_type, l.entity_type, l.entity_id, l.details,
             l.created_at, u.username
      FROM activity_log l
      JOIN users u ON l.user_id = u.user_id
      ORDER BY l.created_at DESC
      LIMIT 10
    `);

    // Get upcoming meetings
    const upcomingMeetings = await db.all(`
      SELECT m.meeting_id, m.meeting_date, m.meeting_type, m.meeting_status,
             c.first_name || ' ' || c.last_name as contact_name,
             co.company_name
      FROM meetings m
      JOIN contacts c ON m.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      WHERE m.meeting_date > datetime('now')
      AND m.meeting_status != 'cancelled'
      ORDER BY m.meeting_date ASC
      LIMIT 5
    `);

    res.json({
      userStats,
      counts: {
        companies: companiesCount.count,
        contacts: contactsCount.count,
        communications: communicationsCount.count,
        meetings: meetingsCount.count
      },
      recentActivities,
      upcomingMeetings
    });

    // Log admin activity
    logActivity(
      req.userId,
      'view',
      'dashboard',
      null,
      'Viewed admin dashboard',
      req.ip
    );
  } catch (error) {
    next(error);
  }
});

// User management routes
adminRouter.get('/users', async (req, res, next) => {
  try {
    const users = await usersDb.getAll();
    res.json(users);

    logActivity(
      req.userId,
      'view',
      'users',
      null,
      'Viewed all users',
      req.ip
    );
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/users/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await usersDb.getById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);

    logActivity(
      req.userId,
      'view',
      'user',
      userId,
      `Viewed user: ${user.username}`,
      req.ip
    );
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/users', async (req, res, next) => {
  try {
    const { username, email, password, role_id } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Username, email and password are required"
      });
    }

    // Check if user already exists
    const userExists = await usersDb.checkUserExists(username, email);
    if (userExists.exists) {
      return res.status(409).json({
        error: `A user with this ${userExists.field} already exists`
      });
    }

    // Create user with specified role
    const user = await usersDb.create({
      username,
      email,
      password,
      role_id: role_id || 2 // Default to regular user if not specified
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_name
      }
    });

    logActivity(
      req.userId,
      'create',
      'user',
      user.user_id,
      `Created user: ${username}`,
      req.ip
    );
  } catch (error) {
    next(error);
  }
});

adminRouter.put('/users/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, email, role_id, password } = req.body;

    // Check if user exists
    const user = await usersDb.getById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Begin transaction
    const db = await getDbConnection();
    await db.run('BEGIN TRANSACTION');

    try {
      let changes = false;

      // Update profile if provided
      if (username || email) {
        await usersDb.updateProfile(userId, {
          username: username || user.username,
          email: email || user.email
        });
        changes = true;
      }

      // Update role if provided
      if (role_id) {
        await usersDb.updateRole(userId, role_id);
        changes = true;
      }

      // Update password if provided
      if (password) {
        await usersDb.updatePassword(userId, password);
        changes = true;
      }

      if (!changes) {
        return res.status(400).json({ error: "No changes provided" });
      }

      // Commit transaction
      await db.run('COMMIT');

      // Get updated user
      const updatedUser = await usersDb.getById(userId);

      res.json({
        message: "User updated successfully",
        user: updatedUser
      });

      logActivity(
        req.userId,
        'update',
        'user',
        userId,
        `Updated user: ${updatedUser.username}`,
        req.ip
      );
    } catch (error) {
      // Rollback transaction in case of error
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/users/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent admin from deleting themselves
    if (userId === req.userId) {
      return res.status(400).json({
        error: "You cannot delete your own account"
      });
    }

    // Check if user exists
    const user = await usersDb.getById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete user
    const success = await usersDb.delete(userId);

    if (!success) {
      return res.status(500).json({ error: "Failed to delete user" });
    }

    res.status(200).json({
      message: "User deleted successfully"
    });

    logActivity(
      req.userId,
      'delete',
      'user',
      userId,
      `Deleted user: ${user.username}`,
      req.ip
    );
  } catch (error) {
    next(error);
  }
});

// Get roles
adminRouter.get('/roles', async (req, res, next) => {
  try {
    const roles = await usersDb.getAllRoles();
    res.json(roles);
  } catch (error) {
    next(error);
  }
});

// Get role permissions
adminRouter.get('/roles/:id/permissions', async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id);
    const permissions = await usersDb.getRolePermissions(roleId);
    res.json(permissions);
  } catch (error) {
    next(error);
  }
});

// Get activity log
adminRouter.get('/activity-log', async (req, res, next) => {
  try {
    const db = await getDbConnection();
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Optional filters
    const userId = req.query.user_id ? parseInt(req.query.user_id) : null;
    const actionType = req.query.action_type || null;
    const entityType = req.query.entity_type || null;

    // Build query
    let query = `
      SELECT l.log_id, l.action_type, l.entity_type, l.entity_id,
             l.details, l.ip_address, l.created_at,
             u.username, u.user_id
      FROM activity_log l
      JOIN users u ON l.user_id = u.user_id
      WHERE 1=1
    `;

    const params = [];

    if (userId) {
      query += " AND l.user_id = ?";
      params.push(userId);
    }

    if (actionType) {
      query += " AND l.action_type = ?";
      params.push(actionType);
    }

    if (entityType) {
      query += " AND l.entity_type = ?";
      params.push(entityType);
    }

    // Add order and pagination
    query += " ORDER BY l.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM activity_log l
      WHERE 1=1
    `;

    const countParams = [];

    if (userId) {
      countQuery += " AND l.user_id = ?";
      countParams.push(userId);
    }

    if (actionType) {
      countQuery += " AND l.action_type = ?";
      countParams.push(actionType);
    }

    if (entityType) {
      countQuery += " AND l.entity_type = ?";
      countParams.push(entityType);
    }

    const [logs, totalResult] = await Promise.all([
      db.all(query, ...params),
      db.get(countQuery, ...countParams)
    ]);

    res.json({
      logs,
      pagination: {
        total: totalResult.total,
        limit,
        offset,
        hasMore: offset + logs.length < totalResult.total
      }
    });

    logActivity(
      req.userId,
      'view',
      'activity_log',
      null,
      'Viewed activity log',
      req.ip
    );
  } catch (error) {
    next(error);
  }
});

// Get all data routes (for admin access to all system data)

// Get all companies
adminRouter.get('/companies', async (req, res, next) => {
  try {
    const db = await getDbConnection();
    const companies = await db.all(`
      SELECT c.*,
             (SELECT COUNT(*) FROM contacts WHERE company_id = c.company_id) as contacts_count
      FROM companies c
      ORDER BY c.company_name
    `);

    res.json(companies);

    logActivity(
      req.userId,
      'view',
      'companies',
      null,
      'Viewed all companies as admin',
      req.ip
    );
  } catch (error) {
    next(error);
  }
});

// Get all contacts
adminRouter.get('/contacts', async (req, res, next) => {
  try {
    const db = await getDbConnection();
    const contacts = await db.all(`
      SELECT c.*, co.company_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.company_id
      ORDER BY c.last_name, c.first_name
    `);

    res.json(contacts);

    logActivity(
      req.userId,
      'view',
      'contacts',
      null,
      'Viewed all contacts as admin',
      req.ip
    );
  } catch (error) {
    next(error);
  }
});

// Get all communications
adminRouter.get('/communications', async (req, res, next) => {
  try {
    const db = await getDbConnection();
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const communications = await db.all(`
      SELECT com.*,
             c.first_name || ' ' || c.last_name as contact_name,
             c.contact_id, co.company_name, co.company_id
      FROM communications com
      JOIN contacts c ON com.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      ORDER BY com.date_contacted DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Get total count for pagination
    const totalResult = await db.get(`
      SELECT COUNT(*) as total FROM communications
    `);

    res.json({
      communications,
      pagination: {
        total: totalResult.total,
        limit,
        offset,
        hasMore: offset + communications.length < totalResult.total
      }
    });

    logActivity(
      req.userId,
      'view',
      'communications',
      null,
      'Viewed all communications as admin',
      req.ip
    );
  } catch (error) {
    next(error);
  }
});

// Get all meetings
adminRouter.get('/meetings', async (req, res, next) => {
  try {
    const db = await getDbConnection();
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const meetings = await db.all(`
      SELECT m.*,
             c.first_name || ' ' || c.last_name as contact_name,
             c.contact_id, co.company_name, co.company_id
      FROM meetings m
      JOIN contacts c ON m.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      ORDER BY m.meeting_date DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Get total count for pagination
    const totalResult = await db.get(`
      SELECT COUNT(*) as total FROM meetings
    `);

    res.json({
      meetings,
      pagination: {
        total: totalResult.total,
        limit,
        offset,
        hasMore: offset + meetings.length < totalResult.total
      }
    });

    logActivity(
      req.userId,
      'view',
      'meetings',
      null,
      'Viewed all meetings as admin',
      req.ip
    );
  } catch (error) {
    next(error);
  }
});

// Admin data reports
adminRouter.get('/reports/users-activity', async (req, res, next) => {
  try {
    const db = await getDbConnection();
    const users = await db.all(`
      SELECT u.user_id, u.username, u.email, u.last_login,
             (SELECT COUNT(*) FROM activity_log WHERE user_id = u.user_id) as activity_count,
             (SELECT COUNT(*) FROM user_companies WHERE user_id = u.user_id) as companies_count,
             (SELECT COUNT(*) FROM user_contacts WHERE user_id = u.user_id) as contacts_count,
             (SELECT COUNT(*) FROM user_meetings WHERE user_id = u.user_id) as meetings_count,
             (SELECT COUNT(*) FROM user_communications WHERE user_id = u.user_id) as communications_count
      FROM users u
      ORDER BY activity_count DESC
    `);

    res.json(users);

    logActivity(
      req.userId,
      'view',
      'report',
      null,
      'Viewed users activity report',
      req.ip
    );
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/reports/system-overview', async (req, res, next) => {
  try {
    const db = await getDbConnection();

    // Get counts by time periods
    const [
      todayStats,
      weekStats,
      monthStats,
      yearStats,
      totalStats
    ] = await Promise.all([
      getTimePeriodStats(db, "datetime('now', 'start of day')"),
      getTimePeriodStats(db, "datetime('now', '-7 days')"),
      getTimePeriodStats(db, "datetime('now', '-30 days')"),
      getTimePeriodStats(db, "datetime('now', '-365 days')"),
      getTimePeriodStats(db, "datetime('1970-01-01')")
    ]);

    res.json({
      today: todayStats,
      lastWeek: weekStats,
      lastMonth: monthStats,
      lastYear: yearStats,
      total: totalStats
    });

    logActivity(
      req.userId,
      'view',
      'report',
      null,
      'Viewed system overview report',
      req.ip
    );
  } catch (error) {
    next(error);
  }
});

// Helper function for system stats
async function getTimePeriodStats(db, timeStart) {
  const [
    users,
    companies,
    contacts,
    communications,
    meetings,
    activities
  ] = await Promise.all([
    db.get(`SELECT COUNT(*) as count FROM users WHERE created_at > ${timeStart}`),
    db.get(`SELECT COUNT(*) as count FROM companies WHERE company_id IN (
      SELECT company_id FROM user_companies WHERE created_at > ${timeStart}
    )`),
    db.get(`SELECT COUNT(*) as count FROM contacts WHERE contact_id IN (
      SELECT contact_id FROM user_contacts WHERE created_at > ${timeStart}
    )`),
    db.get(`SELECT COUNT(*) as count FROM communications WHERE date_contacted > ${timeStart}`),
    db.get(`SELECT COUNT(*) as count FROM meetings WHERE meeting_date > ${timeStart}`),
    db.get(`SELECT COUNT(*) as count FROM activity_log WHERE created_at > ${timeStart}`)
  ]);

  return {
    users: users.count,
    companies: companies.count,
    contacts: contacts.count,
    communications: communications.count,
    meetings: meetings.count,
    activities: activities.count
  };
}

export default adminRouter;
