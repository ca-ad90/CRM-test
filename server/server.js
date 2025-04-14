import express from "express";
import cors from "cors";
import morgan from "morgan";
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
} from "./db.js";
import jwt from 'jsonwebtoken';import jwt from 'jsonwebtoken';
import {
    usersDb,
    userPermissionsDb,
    initializeUserPermissions
} from "./db.js";
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Initialize database
(async () => {
    try {
        await initializeDatabase();
        console.log("Database initialized successfully");

        // Initialize user permissions after database is ready
        initializeUserPermissions();
    } catch (error) {
        console.error("Failed to initialize:", error);
    }
})();

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        error: err.message || "Internal Server Error",
    });
};
// Add the following to server.js

// User authentication middleware

// Secret key for JWT signing - in production, use an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Authentication middleware
// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        // If no token, allow request but mark as unauthenticated
        if (!token) {
            req.isAuthenticated = false;
            req.userId = null;
            return next();
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if user exists
        const user = await usersDb.getById(decoded.userId);
        if (!user) {
            req.isAuthenticated = false;
            req.userId = null;
            return next();
        }

        // Set user info on request
        req.isAuthenticated = true;
        req.userId = user.user_id;
        req.user = user;

        next();
    } catch (error) {
        // Invalid token
        req.isAuthenticated = false;
        req.userId = null;
        next();
    }
};

// Optional: Require authentication for protected routes
const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// Apply authentication middleware to all requests
app.use(authenticate);

// User login/registration routes
apiRouter.post('/auth/login', async (req, res, next) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Check if user exists
        let user = await usersDb.getByUsername(username);

        // If user doesn't exist, create a new one
        if (!user) {
            user = await usersDb.create({ username });
        }

        // Update last login time
        await usersDb.updateLastLogin(user.user_id);

        // Generate JWT token
        const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            user: {
                user_id: user.user_id,
                username: user.username
            },
            token
        });
    } catch (error) {
        next(error);
    }
});

// Get current user info
apiRouter.get('/auth/me', requireAuth, async (req, res) => {
    res.json({
        user_id: req.user.user_id,
        username: req.user.username
    });
});

// List all users (for sharing)
apiRouter.get('/users', requireAuth, async (req, res, next) => {
    try {
        const users = await usersDb.getAll();
        res.json(users.map(user => ({
            user_id: user.user_id,
            username: user.username
        })));
    } catch (error) {
        next(error);
    }
});

// Update existing routes to respect user permissions
// For example, modify the companies GET route:

// Get all companies (respecting user permissions)
apiRouter.get('/companies', async (req, res, next) => {
    try {
        const companies = await companiesDb.getAll(req.userId);
        res.json(companies);
    } catch (error) {
        next(error);
    }
});
// Get a company by ID (respecting user permissions)

apiRouter.get('/companies/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const company = await companiesDb.getById(id, req.userId);

        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json(company);
    } catch (error) {
        next(error);
    }
});

// Create a company (associating with current user)
apiRouter.post('/companies', requireAuth, async (req, res, next) => {
    try {
        const newCompany = await companiesDb.create(req.body, req.userId);
        res.status(201).json(newCompany);
    } catch (error) {
        next(error);
    }
});

// Delete a company (checking ownership)
apiRouter.delete('/companies/:id', requireAuth, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const success = await companiesDb.delete(id, req.userId);

        if (!success) {
            return res.status(403).json({ error: 'Not authorized to delete this company or company not found' });
        }

        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

// Get contacts by company (respecting user permissions)
apiRouter.get('/companies/:id/contacts', requireAuth, async (req, res, next) => {
    try {
        const companyId = parseInt(req.params.id);

        // Check if user has access to this company
        const company = await companiesDb.getById(companyId, req.userId);
        if (!company) {
            return res.status(403).json({ error: 'You do not have access to this company' });
        }

        const contacts = await contactsDb.getByCompanyId(companyId, req.userId);
        res.json(contacts);
    } catch (error) {
        next(error);
    }
});

// Share a company with a user
apiRouter.post('/companies/:id/share', requireAuth, async (req, res, next) => {
    try {
        const companyId = parseInt(req.params.id);
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Check if user has access to this company
        const company = await companiesDb.getById(companyId, req.userId);
        if (!company) {
            return res.status(403).json({ error: 'You do not have access to this company' });
        }

        // Share the company
        const success = await userPermissionsDb.shareCompany(companyId, userId);

        if (!success) {
            return res.status(400).json({ error: 'Failed to share company' });
        }

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Unshare a company
apiRouter.delete('/companies/:id/share', requireAuth, async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id);
    const { userId } = req.body;

    // Check if user is the owner of this company
    const companies = await userPermissionsDb.getUserCompanies(req.userId);
    const company = companies.find(c => c.company_id === companyId && c.is_owner === 1);

    if (!company) {
      return res.status(403).json({ error: 'You do not have permission to unshare this company' });
    }

    // Unshare the company
    const success = await userPermissionsDb.unshareCompany(companyId, userId);

    if (!success) {
      return res.status(400).json({ error: 'Failed to unshare company' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get users who have access to a company
apiRouter.get('/companies/:id/users', requireAuth, async (req, res, next) => {
    try {
        const companyId = parseInt(req.params.id);

        // Check if user has access to this company
        const company = await companiesDb.getById(companyId, req.userId);
        if (!company) {
            return res.status(403).json({ error: 'You do not have access to this company' });
        }

        const users = await userPermissionsDb.getCompanyUsers(companyId);

        res.json(users.map(user => ({
            user_id: user.user_id,
            username: user.username,
            is_owner: user.is_owner === 1
        })));
    } catch (error) {
        next(error);
    }
});
// Add these sharing endpoints to server.js

// Share a contact with a user
apiRouter.post('/contacts/:id/share', requireAuth, async (req, res, next) => {
  try {
    const contactId = parseInt(req.params.id);
    const { userId } = req.body;

    // Check if user has access to this contact
    const canAccess = await userPermissionsDb.canAccessContact(req.userId, contactId);
    if (!canAccess) {
      return res.status(403).json({ error: 'You do not have permission to share this contact' });
    }

    // Share the contact
    const success = await userPermissionsDb.shareContact(contactId, userId);

    if (!success) {
      return res.status(400).json({ error: 'Failed to share contact' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Unshare a contact
apiRouter.delete('/contacts/:id/share', requireAuth, async (req, res, next) => {
  try {
    const contactId = parseInt(req.params.id);
    const { userId } = req.body;

    // Check if user is the owner of this contact
    const contacts = await userPermissionsDb.getUserContacts(req.userId);
    const contact = contacts.find(c => c.contact_id === contactId && c.is_owner === 1);

    if (!contact) {
      return res.status(403).json({ error: 'You do not have permission to unshare this contact' });
    }

    // Unshare the contact
    const success = await userPermissionsDb.unshareContact(contactId, userId);

    if (!success) {
      return res.status(400).json({ error: 'Failed to unshare contact' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get users who have access to a contact
apiRouter.get('/contacts/:id/users', requireAuth, async (req, res, next) => {
  try {
    const contactId = parseInt(req.params.id);

    // Check if user has access to this contact
    const canAccess = await userPermissionsDb.canAccessContact(req.userId, contactId);
    if (!canAccess) {
      return res.status(403).json({ error: 'You do not have permission to view this contact' });
    }

    const users = await userPermissionsDb.getContactUsers(contactId);

    res.json(users.map(user => ({
      user_id: user.user_id,
      username: user.username,
      is_owner: user.is_owner === 1
    })));
  } catch (error) {
    next(error);
  }
});

// Share a meeting with a user
apiRouter.post('/meetings/:id/share', requireAuth, async (req, res, next) => {
  try {
    const meetingId = parseInt(req.params.id);
    const { userId } = req.body;

    // Check if user has access to this meeting
    const canAccess = await userPermissionsDb.canAccessMeeting(req.userId, meetingId);
    if (!canAccess) {
      return res.status(403).json({ error: 'You do not have permission to share this meeting' });
    }

    // Share the meeting
    const success = await userPermissionsDb.shareMeeting(meetingId, userId);

    if (!success) {
      return res.status(400).json({ error: 'Failed to share meeting' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Unshare a meeting
apiRouter.delete('/meetings/:id/share', requireAuth, async (req, res, next) => {
  try {
    const meetingId = parseInt(req.params.id);
    const { userId } = req.body;

    // Check if user is the owner of this meeting
    const meetings = await userPermissionsDb.getUserMeetings(req.userId);
    const meeting = meetings.find(m => m.meeting_id === meetingId && m.is_owner === 1);

    if (!meeting) {
      return res.status(403).json({ error: 'You do not have permission to unshare this meeting' });
    }

    // Unshare the meeting
    const success = await userPermissionsDb.unshareMeeting(meetingId, userId);

    if (!success) {
      return res.status(400).json({ error: 'Failed to unshare meeting' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get users who have access to a meeting
apiRouter.get('/meetings/:id/users', requireAuth, async (req, res, next) => {
  try {
    const meetingId = parseInt(req.params.id);

    // Check if user has access to this meeting
    const canAccess = await userPermissionsDb.canAccessMeeting(req.userId, meetingId);
    if (!canAccess) {
      return res.status(403).json({ error: 'You do not have permission to view this meeting' });
    }

    const users = await userPermissionsDb.getMeetingUsers(meetingId);

    res.json(users.map(user => ({
      user_id: user.user_id,
      username: user.username,
      is_owner: user.is_owner === 1
    })));
  } catch (error) {
    next(error);
  }
});
// Dynamic route handler creator
const createDynamicRoutes = (router, resource, dbOperations) => {
    // Get all
    router.get(`/${resource}`, async (req, res, next) => {
        console.log(`Get all ${resource}`);
        try {
            const data = await dbOperations.getAll();
            console.log(data);
            res.json(data);
        } catch (error) {
            next(error);
        }
    });

    // Get by ID
    router.get(`/${resource}/:id`, async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const data = await dbOperations.getById(id);

            if (!data) {
                return res
                    .status(404)
                    .json({ error: `${resource.slice(0, -1)} not found` });
            }

            res.json(data);
        } catch (error) {
            next(error);
        }
    });

    // Create
    router.post(`/${resource}`, async (req, res, next) => {
        try {
            const newItem = await dbOperations.create(req.body);
            res.status(201).json(newItem);
        } catch (error) {
            next(error);
        }
    });

    // Update
    router.put(`/${resource}/:id`, async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const success = await dbOperations.update(id, req.body);

            if (!success) {
                return res
                    .status(404)
                    .json({ error: `${resource.slice(0, -1)} not found` });
            }

            const updatedItem = await dbOperations.getById(id);
            res.json(updatedItem);
        } catch (error) {
            next(error);
        }
    });

    // Delete
    router.delete(`/${resource}/:id`, async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const success = await dbOperations.delete(id);

            if (!success) {
                return res
                    .status(404)
                    .json({ error: `${resource.slice(0, -1)} not found` });
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

// Update dashboard endpoint to use user ID
apiRouter.get('/dashboard/stats', requireAuth, async (req, res, next) => {
    try {
        const stats = await dashboardDb.getStats(req.userId);
        res.json(stats);
    } catch (error) {
        next(error);
    }
});

apiRouter.get('/dashboard/activities/:limit?', requireAuth, async (req, res, next) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        const activities = await dashboardDb.getRecentActivities(limit, req.userId);
        res.json(activities);
    } catch (error) {
        next(error);
    }
});

// Update search endpoint to use user ID
apiRouter.get('/search', requireAuth, async (req, res, next) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const results = await searchDb.search(query, req.userId);
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
});
// Mount API router
app.use("/api", apiRouter);

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
