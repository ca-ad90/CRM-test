import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from 'dotenv';
import {
    companiesDb,
    contactsDb,
    communicationsDb,
    meetingsDb,
    dashboardDb,
    searchDb,
    getFilteredCompanies,
    getFilteredContacts,
    initializeDatabase,
} from "./db/index.js";
import { usersDb } from "./db/users.js";
import { tokensDb } from "./db/tokens.js";
import { authenticate, optionalAuth } from "./middleware/auth.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration to allow credentials
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Initialize database
(async () => {
    try {
        await initializeDatabase();
        console.log("Database initialized successfully");

        // Schedule token cleanup (every hour)
        setInterval(async () => {
            try {
                const deleted = await tokensDb.cleanupExpiredTokens();
                if (deleted > 0) {
                    console.log(`Cleaned up ${deleted} expired tokens`);
                }
            } catch (error) {
                console.error("Error cleaning up tokens:", error);
            }
        }, 60 * 60 * 1000);
    } catch (error) {
        console.error("Failed to initialize database:", error);
    }
})();

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        error: err.message || "Internal Server Error",
    });
};

// Auth routes
const authRouter = express.Router();

// Register route
authRouter.post("/register", async (req, res, next) => {
    console.log("Registering user...");
    try {
        const { username, email, password } = req.body;
        console.log(username, email, password);
        if (!username || !email || !password) {
            return res.status(400).json({ error: "Username, email and password are required" });
        }

        // Check if user already exists
        const userExists = await usersDb.checkUserExists(username, email);
        if (userExists.exists) {
            return res.status(409).json({
                error: `A user with this ${userExists.field} already exists`
            });
        }

        // Create user
        const user = await usersDb.create({ username, email, password });

        // Create token
        const token = await tokensDb.createToken(user.user_id, 24);

        // Set cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email
            },
            token
        });
    } catch (error) {
        next(error);
    }
});

// Login route
authRouter.post("/login", async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        // Validate credentials
        const user = await usersDb.validateCredentials(username, password);

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Create token
        const token = await tokensDb.createToken(user.user_id, 24);

        // Set cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.json({
            message: "Login successful",
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email
            },
            token
        });
    } catch (error) {
        next(error);
    }
});

// Logout route
authRouter.post("/logout", optionalAuth, async (req, res, next) => {
    try {
        const token = req.cookies?.authToken ||
                      req.headers.authorization?.replace('Bearer ', '');

        if (token) {
            await tokensDb.invalidateToken(token);
        }

        // Clear the cookie
        res.clearCookie('authToken');

        res.json({ message: "Logged out successfully" });
    } catch (error) {
        next(error);
    }
});

// Get current user
authRouter.get("/me", authenticate, async (req, res, next) => {
    try {
        const user = await usersDb.getById(req.userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user);
    } catch (error) {
        next(error);
    }
});

// Change password
authRouter.post("/change-password", authenticate, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current password and new password are required" });
        }

        // Validate current password
        const user = await usersDb.getByUsername(req.user.username);
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        // Update password
        await usersDb.updatePassword(req.userId, newPassword);

        // Invalidate all existing tokens for this user
        await tokensDb.invalidateAllUserTokens(req.userId);

        // Create new token
        const token = await tokensDb.createToken(req.userId, 24);

        // Set cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.json({
            message: "Password changed successfully",
            token
        });
    } catch (error) {
        next(error);
    }
});

// Dynamic route handler creator with authentication
const createDynamicRoutes = (router, resource, dbOperations) => {
    // Get all (with user filter)
    router.get(`/${resource}`, authenticate, async (req, res, next) => {
        try {
            const data = await dbOperations.getAll(req.userId);
            res.json(data);
        } catch (error) {
            next(error);
        }
    });

    // Get by ID (with user access check)
    router.get(`/${resource}/:id`, authenticate, async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const data = await dbOperations.getById(id, req.userId);

            if (!data) {
                return res
                    .status(404)
                    .json({ error: `${resource.slice(0, -1)} not found or access denied` });
            }

            res.json(data);
        } catch (error) {
            next(error);
        }
    });

    // Create (with user association)
    router.post(`/${resource}`, authenticate, async (req, res, next) => {
        try {
            const newItem = await dbOperations.create(req.body, req.userId);
            res.status(201).json(newItem);
        } catch (error) {
            next(error);
        }
    });

    // Update (with user access check)
    router.put(`/${resource}/:id`, authenticate, async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const success = await dbOperations.update(id, req.body, req.userId);

            if (!success) {
                return res
                    .status(404)
                    .json({ error: `${resource.slice(0, -1)} not found or access denied` });
            }

            const updatedItem = await dbOperations.getById(id, req.userId);
            res.json(updatedItem);
        } catch (error) {
            next(error);
        }
    });

    // Delete (with user access check)
    router.delete(`/${resource}/:id`, authenticate, async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const success = await dbOperations.delete(id, req.userId);

            if (!success) {
                return res
                    .status(404)
                    .json({ error: `${resource.slice(0, -1)} not found or access denied` });
            }

            res.status(204).end();
        } catch (error) {
            next(error);
        }
    });
};


// API router
const apiRouter = express.Router();

// Set up dynamic routes for main resources
createDynamicRoutes(apiRouter, "companies", companiesDb);
createDynamicRoutes(apiRouter, "contacts", contactsDb);

// Special routes for contacts by company
apiRouter.get("/companies/:id/contacts", async (req, res, next) => {
    try {
        const companyId = parseInt(req.params.id);
        const contacts = await contactsDb.getByCompanyId(companyId);
        res.json(contacts);
    } catch (error) {
        next(error);
    }
});

// Communications routes - special case since it doesn't have getAll method
apiRouter.get("/communications/:id", async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const communication = await communicationsDb.getById(id);

        if (!communication) {
            return res.status(404).json({ error: "Communication not found" });
        }

        res.json(communication);
    } catch (error) {
        next(error);
    }
});

apiRouter.get("/contacts/:id/communications", async (req, res, next) => {
    try {
        const contactId = parseInt(req.params.id);
        const communications = await communicationsDb.getByContactId(contactId);
        res.json(communications);
    } catch (error) {
        next(error);
    }
});

apiRouter.post("/communications", async (req, res, next) => {
    try {
        const newCommunication = await communicationsDb.create(req.body);
        res.status(201).json(newCommunication);
    } catch (error) {
        next(error);
    }
});

apiRouter.put("/communications/:id", async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const success = await communicationsDb.update(id, req.body);

        if (!success) {
            return res.status(404).json({ error: "Communication not found" });
        }

        const updatedCommunication = await communicationsDb.getById(id);
        res.json(updatedCommunication);
    } catch (error) {
        next(error);
    }
});

apiRouter.delete("/communications/:id", async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const success = await communicationsDb.delete(id);

        if (!success) {
            return res.status(404).json({ error: "Communication not found" });
        }

        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

// Meetings routes
createDynamicRoutes(apiRouter, "meetings", meetingsDb);

apiRouter.get("/contacts/:id/meetings", async (req, res, next) => {
    try {
        const contactId = parseInt(req.params.id);
        const meetings = await meetingsDb.getByContactId(contactId);
        res.json(meetings);
    } catch (error) {
        next(error);
    }
});

apiRouter.get("/meetings/upcoming/:limit?", async (req, res, next) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        const meetings = await meetingsDb.getUpcoming(limit);
        res.json(meetings);
    } catch (error) {
        next(error);
    }
});

// Dashboard routes
apiRouter.get("/dashboard/stats", async (req, res, next) => {
    try {
        const stats = await dashboardDb.getStats();
        res.json(stats);
    } catch (error) {
        next(error);
    }
});

apiRouter.get("/dashboard/activities/:limit?", async (req, res, next) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        const activities = await dashboardDb.getRecentActivities(limit);
        res.json(activities);
    } catch (error) {
        next(error);
    }
});

// Search route
apiRouter.get("/search", async (req, res, next) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: "Search query is required" });
        }

        const results = await searchDb.search(query);
        res.json(results);
    } catch (error) {
        next(error);
    }
});
// Filtered companies endpoint
apiRouter.get("/companies/filter/:status", async (req, res, next) => {

    try {
        const status = req.params.status;
        const companies = await getFilteredCompanies(status);
        res.json(companies);
    } catch (error) {
        next(error);
    }
});

// Filtered contacts endpoint
apiRouter.get("/contacts/filter/:status", async (req, res, next) => {
    try {
        const status = req.params.status;
        const contacts = await getFilteredContacts(status);
        res.json(contacts);
    } catch (error) {
        next(error);
    }
});// Add this code to server.js after you've defined other routers

// Admin router
const adminRouter = express.Router();

// Protect all admin routes
adminRouter.use(authenticate, adminOnly);

// Admin user management routes
adminRouter.get("/users", async (req, res, next) => {
  try {
    const users = await usersDb.getAll();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/users/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const user = await usersDb.getById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/users", async (req, res, next) => {
  try {
    const { username, email, password, is_admin } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email and password are required" });
    }

    // Check if user already exists
    const userExists = await usersDb.checkUserExists(username, email);
    if (userExists.exists) {
      return res.status(409).json({
        error: `A user with this ${userExists.field} already exists`
      });
    }

    // Create user with admin flag
    const user = await usersDb.create({
      username,
      email,
      password,
      is_admin: !!is_admin
    });

    res.status(201).json({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      is_admin: !!user.is_admin,
      created_at: user.created_at
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/users/:id/admin-status", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { is_admin } = req.body;

    if (is_admin === undefined) {
      return res.status(400).json({ error: "is_admin field is required" });
    }

    const success = await usersDb.updateAdminStatus(id, !!is_admin);

    if (!success) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await usersDb.getById(id);
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/users/:id/password", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const user = await usersDb.getById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await usersDb.updatePassword(id, password);

    // Invalidate all existing tokens for this user
    await tokensDb.invalidateAllUserTokens(id);

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/users/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    // Don't allow admins to delete themselves
    if (id === req.userId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const success = await usersDb.delete(id);

    if (!success) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// Admin access to all data without user filtering
adminRouter.get("/companies", async (req, res, next) => {
  try {
    const db = await getDbConnection();
    const companies = await db.all(`
      SELECT c.*, u.username as created_by_user, u.user_id as created_by_user_id
      FROM companies c
      JOIN user_companies uc ON c.company_id = uc.company_id
      JOIN users u ON uc.user_id = u.user_id
      WHERE uc.is_owner = 1
      ORDER BY c.company_name
    `);
    res.json(companies);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/contacts", async (req, res, next) => {
  try {
    const db = await getDbConnection();
    const contacts = await db.all(`
      SELECT c.*, co.company_name, u.username as created_by_user, u.user_id as created_by_user_id
      FROM contacts c
      JOIN user_contacts uc ON c.contact_id = uc.contact_id
      JOIN users u ON uc.user_id = u.user_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      WHERE uc.is_owner = 1
      ORDER BY c.last_name, c.first_name
    `);
    res.json(contacts);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/communications", async (req, res, next) => {
  try {
    const db = await getDbConnection();
    const communications = await db.all(`
      SELECT com.*, c.first_name, c.last_name, c.contact_id, co.company_name, co.company_id,
             u.username as created_by_user, u.user_id as created_by_user_id
      FROM communications com
      JOIN user_communications ucom ON com.communication_id = ucom.communication_id
      JOIN users u ON ucom.user_id = u.user_id
      JOIN contacts c ON com.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      WHERE ucom.is_owner = 1
      ORDER BY com.date_contacted DESC
    `);
    res.json(communications);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/meetings", async (req, res, next) => {
  try {
    const db = await getDbConnection();
    const meetings = await db.all(`
      SELECT m.*, c.first_name, c.last_name, c.contact_id, co.company_name, co.company_id,
             u.username as created_by_user, u.user_id as created_by_user_id
      FROM meetings m
      JOIN user_meetings um ON m.meeting_id = um.meeting_id
      JOIN users u ON um.user_id = u.user_id
      JOIN contacts c ON m.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      WHERE um.is_owner = 1
      ORDER BY m.meeting_date DESC
    `);
    res.json(meetings);
  } catch (error) {
    next(error);
  }
});

// Admin company management
adminRouter.get("/companies/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const db = await getDbConnection();

    const company = await db.get(`
      SELECT c.*, u.username as created_by_user, u.user_id as created_by_user_id
      FROM companies c
      JOIN user_companies uc ON c.company_id = uc.company_id
      JOIN users u ON uc.user_id = u.user_id
      WHERE c.company_id = ? AND uc.is_owner = 1
    `, id);

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json(company);
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/companies/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { company_name, website, address, phone, email } = req.body;

    const db = await getDbConnection();

    const result = await db.run(
      `UPDATE companies
       SET company_name = ?, website = ?, address = ?, phone = ?, email = ?
       WHERE company_id = ?`,
      [company_name, website, address, phone, email, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    const updatedCompany = await db.get(
      `SELECT c.*, u.username as created_by_user, u.user_id as created_by_user_id
       FROM companies c
       JOIN user_companies uc ON c.company_id = uc.company_id
       JOIN users u ON uc.user_id = u.user_id
       WHERE c.company_id = ? AND uc.is_owner = 1`,
      id
    );

    res.json(updatedCompany);
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/companies/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const db = await getDbConnection();

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // First check if there are any contacts associated with this company
      const contacts = await db.get(
        "SELECT 1 FROM contacts WHERE company_id = ? LIMIT 1",
        id
      );

      if (contacts) {
        await db.run('ROLLBACK');
        return res.status(400).json({
          error: "Cannot delete company with associated contacts. Remove the contacts first."
        });
      }

      // Remove all user-company associations
      await db.run(
        "DELETE FROM user_companies WHERE company_id = ?",
        id
      );

      // Delete the company
      const result = await db.run(
        "DELETE FROM companies WHERE company_id = ?",
        id
      );

      if (result.changes === 0) {
        await db.run('ROLLBACK');
        return res.status(404).json({ error: "Company not found" });
      }

      // Commit transaction
      await db.run('COMMIT');
      res.status(204).end();
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Admin contact management
adminRouter.get("/contacts/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const db = await getDbConnection();

    const contact = await db.get(`
      SELECT c.*, co.company_name, u.username as created_by_user, u.user_id as created_by_user_id
      FROM contacts c
      JOIN user_contacts uc ON c.contact_id = uc.contact_id
      JOIN users u ON uc.user_id = u.user_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      WHERE c.contact_id = ? AND uc.is_owner = 1
    `, id);

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(contact);
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/contacts/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { company_id, first_name, last_name, position, email, phone, linkedin_url, notes } = req.body;

    const db = await getDbConnection();

    const result = await db.run(
      `UPDATE contacts
       SET company_id = ?, first_name = ?, last_name = ?, position = ?,
           email = ?, phone = ?, linkedin_url = ?, notes = ?
       WHERE contact_id = ?`,
      [company_id, first_name, last_name, position, email, phone, linkedin_url, notes, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const updatedContact = await db.get(
      `SELECT c.*, co.company_name, u.username as created_by_user, u.user_id as created_by_user_id
       FROM contacts c
       JOIN user_contacts uc ON c.contact_id = uc.contact_id
       JOIN users u ON uc.user_id = u.user_id
       LEFT JOIN companies co ON c.company_id = co.company_id
       WHERE c.contact_id = ? AND uc.is_owner = 1`,
      id
    );

    res.json(updatedContact);
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/contacts/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const db = await getDbConnection();

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Check for associated communications and meetings
      const communications = await db.get(
        "SELECT 1 FROM communications WHERE contact_id = ? LIMIT 1",
        id
      );

      const meetings = await db.get(
        "SELECT 1 FROM meetings WHERE contact_id = ? LIMIT 1",
        id
      );

      if (communications || meetings) {
        await db.run('ROLLBACK');
        return res.status(400).json({
          error: "Cannot delete contact with associated communications or meetings. Remove them first."
        });
      }

      // Remove all user-contact associations
      await db.run(
        "DELETE FROM user_contacts WHERE contact_id = ?",
        id
      );

      // Delete the contact
      const result = await db.run(
        "DELETE FROM contacts WHERE contact_id = ?",
        id
      );

      if (result.changes === 0) {
        await db.run('ROLLBACK');
        return res.status(404).json({ error: "Contact not found" });
      }

      // Commit transaction
      await db.run('COMMIT');
      res.status(204).end();
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Admin dashboard
adminRouter.get("/dashboard", async (req, res, next) => {
  try {
    const db = await getDbConnection();

    // Get counts of all entities
    const companiesCount = await db.get("SELECT COUNT(*) as count FROM companies");
    const contactsCount = await db.get("SELECT COUNT(*) as count FROM contacts");
    const communicationsCount = await db.get("SELECT COUNT(*) as count FROM communications");
    const meetingsCount = await db.get("SELECT COUNT(*) as count FROM meetings");
    const usersCount = await db.get("SELECT COUNT(*) as count FROM users");

    // Get upcoming meetings
    const now = new Date().toISOString();
    const upcomingMeetings = await db.all(`
      SELECT m.*, c.first_name, c.last_name, co.company_name, u.username as owner
      FROM meetings m
      JOIN user_meetings um ON m.meeting_id = um.meeting_id
      JOIN users u ON um.user_id = u.user_id
      JOIN contacts c ON m.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      WHERE m.meeting_date > ?
      AND m.meeting_status != 'cancelled'
      AND um.is_owner = 1
      ORDER BY m.meeting_date ASC
      LIMIT 10
    `, now);

    // Get recent activities
    const recentActivities = await db.all(`
      SELECT
        'communication' as type,
        com.communication_id as id,
        com.date_contacted as date,
        c.first_name || ' ' || c.last_name as contact_name,
        c.contact_id,
        co.company_name,
        co.company_id,
        com.contact_method as description,
        u.username as performed_by,
        u.user_id as user_id
      FROM communications com
      JOIN user_communications ucom ON com.communication_id = ucom.communication_id
      JOIN users u ON ucom.user_id = u.user_id
      JOIN contacts c ON com.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      WHERE ucom.is_owner = 1

      UNION ALL

      SELECT
        'meeting' as type,
        m.meeting_id as id,
        m.meeting_date as date,
        c.first_name || ' ' || c.last_name as contact_name,
        c.contact_id,
        co.company_name,
        co.company_id,
        m.meeting_type || ' meeting - ' || m.meeting_status as description,
        u.username as performed_by,
        u.user_id as user_id
      FROM meetings m
      JOIN user_meetings um ON m.meeting_id = um.meeting_id
      JOIN users u ON um.user_id = u.user_id
      JOIN contacts c ON m.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      WHERE um.is_owner = 1

      ORDER BY date DESC
      LIMIT 20
    `);

    // Get user activity counts
    const userActivity = await db.all(`
      SELECT
        u.username,
        u.user_id,
        u.email,
        u.is_admin,
        COUNT(DISTINCT uc.company_id) as companies_count,
        COUNT(DISTINCT uct.contact_id) as contacts_count,
        COUNT(DISTINCT ucom.communication_id) as communications_count,
        COUNT(DISTINCT um.meeting_id) as meetings_count,
        MAX(u.last_login) as last_login
      FROM users u
      LEFT JOIN user_companies uc ON u.user_id = uc.user_id
      LEFT JOIN user_contacts uct ON u.user_id = uct.user_id
      LEFT JOIN user_communications ucom ON u.user_id = ucom.user_id
      LEFT JOIN user_meetings um ON u.user_id = um.user_id
      GROUP BY u.user_id
      ORDER BY u.username
    `);

    res.json({
      counts: {
        companies: companiesCount.count,
        contacts: contactsCount.count,
        communications: communicationsCount.count,
        meetings: meetingsCount.count,
        users: usersCount.count
      },
      upcomingMeetings,
      recentActivities,
      userActivity
    });
  } catch (error) {
    next(error);
  }
});

// Admin can get all meetings for a specific contact
adminRouter.get("/contacts/:id/communications", async (req, res, next) => {
  try {
    const contactId = parseInt(req.params.id);
    const db = await getDbConnection();

    const communications = await db.all(`
      SELECT com.*, u.username as created_by_user, u.user_id as created_by_user_id
      FROM communications com
      JOIN user_communications ucom ON com.communication_id = ucom.communication_id
      JOIN users u ON ucom.user_id = u.user_id
      WHERE com.contact_id = ? AND ucom.is_owner = 1
      ORDER BY com.date_contacted DESC
    `, contactId);

    res.json(communications);
  } catch (error) {
    next(error);
  }
});

// Admin can get all meetings for a specific contact
adminRouter.get("/contacts/:id/meetings", async (req, res, next) => {
  try {
    const contactId = parseInt(req.params.id);
    const db = await getDbConnection();

    const meetings = await db.all(`
      SELECT m.*, u.username as created_by_user, u.user_id as created_by_user_id
      FROM meetings m
      JOIN user_meetings um ON m.meeting_id = um.meeting_id
      JOIN users u ON um.user_id = u.user_id
      WHERE m.contact_id = ? AND um.is_owner = 1
      ORDER BY m.meeting_date DESC
    `, contactId);

    res.json(meetings);
  } catch (error) {
    next(error);
  }
});

// Admin can get all contacts for a company
adminRouter.get("/companies/:id/contacts", async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const db = await getDbConnection();

    const contacts = await db.all(`
      SELECT c.*, u.username as created_by_user, u.user_id as created_by_user_id
      FROM contacts c
      JOIN user_contacts uc ON c.contact_id = uc.contact_id
      JOIN users u ON uc.user_id = u.user_id
      WHERE c.company_id = ? AND uc.is_owner = 1
      ORDER BY c.last_name, c.first_name
    `, companyId);

    res.json(contacts);
  } catch (error) {
    next(error);
  }
});

// Mount admin router
app.use("/api/admin", adminRouter);
// Mount API router
app.use("/api", apiRouter);
app.use("/api/auth", authRouter);

// Root route
app.get("/", (req, res) => {
    res.json({
        message: "CRM API Server",
        version: "1.0.0",
        endpoints: {
            companies: "/api/companies",
            contacts: "/api/contacts",
            communications: "/api/communications",
            meetings: "/api/meetings",
            dashboard: "/api/dashboard",
            search: "/api/search?q=query",
        },
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
