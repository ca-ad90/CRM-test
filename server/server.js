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
});
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
