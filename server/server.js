import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from 'dotenv';
import {
    initializeDatabase,
} from "./db/index.js";
import { authenticate, optionalAuth, logActivity } from "./middleware/auth.js";
import authRouter from "./routes/auth.js";
import apiRouter from "./routes/api.js";
import adminRouter from "./routes/admin.js";

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

// Request logging
const loggerFormat = process.env.NODE_ENV === 'production' 
    ? 'combined' 
    : 'dev';
app.use(morgan(loggerFormat, {
    skip: (req) => req.path === '/health' || req.path === '/favicon.ico'
}));

// Request ID middleware
app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    next();
});

// Database initialization
(async () => {
    try {
        await initializeDatabase();
        console.log("Database initialized successfully");

        // Schedule token cleanup (every hour)
        const { tokensDb } = await import('./db/tokens.js');
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
    console.error(`[Error] [${req.requestId}]`, err.stack);
    
    // Log error for admin review
    if (req.userId) {
        logActivity(
            req.userId,
            'error',
            'system',
            null,
            `Error: ${err.message}`,
            req.ip
        ).catch(e => console.error('Failed to log error activity', e));
    }
    
    res.status(err.statusCode || 500).json({
        error: err.message || "Internal Server Error",
        requestId: req.requestId
    });
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Mount routers
app.use("/api/auth", authRouter);
app.use("/api", apiRouter);
app.use("/api/admin", adminRouter);

// Root route
app.get("/", optionalAuth, (req, res) => {
    const userInfo = req.user 
        ? { 
            username: req.user.username, 
            role: req.user.role_name 
          } 
        : null;
        
    res.json({
        message: "CRM API Server",
        version: "1.1.0",
        authenticated: !!req.user,
        user: userInfo,
        endpoints: {
            auth: "/api/auth",
            companies: "/api/companies",
            contacts: "/api/contacts",
            communications: "/api/communications",
            meetings: "/api/meetings",
            dashboard: "/api/dashboard",
            search: "/api/search?q=query",
            admin: "/api/admin"
        },
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Not Found", path: req.path });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
