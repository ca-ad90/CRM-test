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
