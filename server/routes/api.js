import express from "express";
import { companiesDb } from "../db/companies.js";
import { contactsDb } from "../db/contacts.js";
import { communicationsDb } from "../db/communications.js";
import { meetingsDb } from "../db/meetings.js";
import { dashboardDb } from "../db/dashboard.js";
import { searchDb } from "../db/search.js";
import { getFilteredCompanies, getFilteredContacts } from "../db/filtered-queries.js";
import { authenticate, checkResourceAccess, logActivity } from "../middleware/auth.js";

const apiRouter = express.Router();

// Apply authentication middleware to all routes
apiRouter.use(authenticate);

// Dynamic route handler creator with authentication and access control
const createDynamicRoutes = (router, resource, dbOperations, resourceType) => {
    // Get all (with user filter)
    router.get(`/${resource}`, async (req, res, next) => {
        try {
            const data = await dbOperations.getAll(req.userId);
            res.json(data);
            
            // Log activity
            logActivity(
                req.userId,
                'view',
                resourceType,
                null,
                `Viewed all ${resourceType}s`,
                req.ip
            );
        } catch (error) {
            next(error);
        }
    });

    // Get by ID (with user access check)
    router.get(`/${resource}/:id`, checkResourceAccess(resourceType), async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const data = await dbOperations.getById(id, req.userId);

            if (!data) {
                return res
                    .status(404)
                    .json({ error: `${resourceType} not found or access denied` });
            }

            res.json(data);
            
            // Log activity
            logActivity(
                req.userId,
                'view',
                resourceType,
                id,
                `Viewed ${resourceType} details`,
                req.ip
            );
        } catch (error) {
            next(error);
        }
    });

    // Create (with user association)
    router.post(`/${resource}`, async (req, res, next) => {
        try {
            const newItem = await dbOperations.create(req.body, req.userId);
            
            // Log activity
            logActivity(
                req.userId,
                'create',
                resourceType,
                newItem[`${resourceType}_id`],
                `Created new ${resourceType}`,
                req.ip
            );
            
            res.status(201).json(newItem);
        } catch (error) {
            next(error);
        }
    });

    // Update (with user access check)
    router.put(`/${resource}/:id`, checkResourceAccess(resourceType), async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const success = await dbOperations.update(id, req.body, req.userId);

            if (!success) {
                return res
                    .status(404)
                    .json({ error: `${resourceType} not found or access denied` });
            }

            const updatedItem = await dbOperations.getById(id, req.userId);
            
            // Log activity
            logActivity(
                req.userId,
                'update',
                resourceType,
                id,
                `Updated ${resourceType}`,
                req.ip
            );
            
            res.json(updatedItem);
        } catch (error) {
            next(error);
        }
    });

    // Delete (with user access check)
    router.delete(`/${resource}/:id`, checkResourceAccess(resourceType), async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const success = await dbOperations.delete(id, req.userId);

            if (!success) {
                return res
                    .status(404)
                    .json({ error: `${resourceType} not found or access denied` });
            }
            
            // Log activity
            logActivity(
                req.userId,
                'delete',
                resourceType,
                id,
                `Deleted ${resourceType}`,
                req.ip
            );

            res.status(204).end();
        } catch (error) {
            next(error);
        }
    });
    
    // Share resource with another user (owner only)
    router.post(`/${resource}/:id/share`, checkResourceAccess(resourceType), async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const { targetUserId, isOwner = false } = req.body;
            
            if (!targetUserId) {
                return res.status(400).json({ error: "Target user ID is required" });
            }
            
            // Check if the target user exists
            const { usersDb } = await import("../db/users.js");
            const targetUser = await usersDb.getById(targetUserId);
            
            if (!targetUser) {
                return res.status(404).json({ error: "Target user not found" });
            }
            
            // Share the resource
            let success;
            
            switch (resourceType) {
                case 'company':
                    success = await companiesDb.shareCompany(id, req.userId, targetUserId, isOwner);
                    break;
                case 'contact':
                    success = await contactsDb.shareContact(id, req.userId, targetUserId, isOwner);
                    break;
                case 'communication':
                    success = await communicationsDb.shareCommunication(id, req.userId, targetUserId, isOwner);
                    break;
                case 'meeting':
                    success = await meetingsDb.shareMeeting(id, req.userId, targetUserId, isOwner);
                    break;
                default:
                    return res.status(400).json({ error: "Invalid resource type" });
            }
            
            if (!success) {
                return res.status(403).json({ 
                    error: "You don't have permission to share this resource or it doesn't exist"
                });
            }
            
            // Log activity
            logActivity(
                req.userId,
                'share',
                resourceType,
                id,
                `Shared ${resourceType} with user ${targetUser.username}`,
                req.ip
            );
            
            res.json({ 
                message: `${resourceType} successfully shared with ${targetUser.username}`,
                shared_with: {
                    user_id: targetUser.user_id,
                    username: targetUser.username,
                    is_owner: isOwner
                }
            });
        } catch (error) {
            next(error);
        }
    });
};

// Set up dynamic routes for main resources
createDynamicRoutes(apiRouter, "companies", companiesDb, "company");
createDynamicRoutes(apiRouter, "contacts", contactsDb, "contact");
createDynamicRoutes(apiRouter, "meetings", meetingsDb, "meeting");

// Special routes for contacts by company
apiRouter.get("/companies/:id/contacts", checkResourceAccess("company"), async (req, res, next) => {
    try {
        const companyId = parseInt(req.params.id);
        const contacts = await contactsDb.getByCompanyId(companyId, req.userId);
        
        res.json(contacts);
        
        // Log activity
        logActivity(
            req.userId,
            'view',
            'contacts',
            null,
            `Viewed contacts for company #${companyId}`,
            req.ip
        );
    } catch (error) {
        next(error);
    }
});

// Communications routes
apiRouter.get("/communications/:id", checkResourceAccess("communication"), async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const communication = await communicationsDb.getById(id, req.userId);

        if (!communication) {
            return res.status(404).json({ error: "Communication not found" });
        }

        res.json(communication);
        
        // Log activity
        logActivity(
            req.userId,
            'view',
            'communication',
            id,
            `Viewed communication details`,
            req.ip
        );
    } catch (error) {
        next(error);
    }
});

apiRouter.get("/contacts/:id/communications", checkResourceAccess("contact"), async (req, res, next) => {
    try {
        const contactId = parseInt(req.params.id);
        const communications = await communicationsDb.getByContactId(contactId, req.userId);
        
        res.json(communications);
        
        // Log activity
        logActivity(
            req.userId,
            'view',
            'communications',
            null,
            `Viewed communications for contact #${contactId}`,
            req.ip
        );
    } catch (error) {
        next(error);
    }
});

apiRouter.post("/communications", async (req, res, next) => {
    try {
        const newCommunication = await communicationsDb.create(req.body, req.userId);
        
        // Log activity
        logActivity(
            req.userId,
            'create',
            'communication',
            newCommunication.communication_id,
            `Created new communication`,
            req.ip
        );
        
        res.status(201).json(newCommunication);
    } catch (error) {
        next(error);
    }
});

apiRouter.put("/communications/:id", checkResourceAccess("communication"), async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const success = await communicationsDb.update(id, req.body, req.userId);

        if (!success) {
            return res.status(404).json({ error: "Communication not found or access denied" });
        }

        const updatedCommunication = await communicationsDb.getById(id, req.userId);
        
        // Log activity
        logActivity(
            req.userId,
            'update',
            'communication',
            id,
            `Updated communication`,
            req.ip
        );
        
        res.json(updatedCommunication);
    } catch (error) {
        next(error);
    }
});

apiRouter.delete("/communications/:id", checkResourceAccess("communication"), async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const success = await communicationsDb.delete(id, req.userId);

        if (!success) {
            return res.status(404).json({ error: "Communication not found or access denied" });
        }
        
        // Log activity
        logActivity(
            req.userId,
            'delete',
            'communication',
            id,
            `Deleted communication`,
            req.ip
        );

        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

// Contact meetings routes
apiRouter.get("/contacts/:id/meetings", checkResourceAccess("contact"), async (req, res, next) => {
    try {
        const contactId = parseInt(req.params.id);
        const meetings = await meetingsDb.getByContactId(contactId, req.userId);
        
        res.json(meetings);
        
        // Log activity
        logActivity(
            req.userId,
            'view',
            'meetings',
            null,
            `Viewed meetings for contact #${contactId}`,
            req.ip
        );
    } catch (error) {
        next(error);
    }
});

// Upcoming meetings
apiRouter.get("/meetings/upcoming/:limit?", async (req, res, next) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        const meetings = await meetingsDb.getUpcoming(limit, req.userId);
        
        res.json(meetings);
        
        // Log activity
        logActivity(
            req.userId,
            'view',
            'meetings',
            null,
            `Viewed upcoming meetings`,
            req.ip
        );
    } catch (error) {
        next(error);
    }
});

// Dashboard routes
apiRouter.get("/dashboard/stats", async (req, res, next) => {
    try {
        const stats = await dashboardDb.getStats(req.userId);
        
        res.json(stats);
        
        // Log activity
        logActivity(
            req.userId,
            'view',
            'dashboard',
            null,
            `Viewed dashboard stats`,
            req.ip
        );
    } catch (error) {
        next(error);
    }
});

apiRouter.get("/dashboard/activities/:limit?", async (req, res, next) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        const activities = await dashboardDb.getRecentActivities(limit, req.userId);
        
        res.json(activities);
        
        // Log activity
        logActivity(
            req.userId,
            'view',
            'activities',
            null,
            `Viewed dashboard activities`,
            req.ip
        );
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

        const results = await searchDb.search(query, req.userId);
        
        res.json(results);
        
        // Log activity
        logActivity(
            req.userId,
            'search',
            'system',
            null,
            `Searched for: ${query}`,
            req.ip
        );
    } catch (error) {
        next(error);
    }
});

// Filtered companies endpoint
apiRouter.get("/companies/filter/:status", async (req, res, next) => {
    try {
        const status = req.params.status;
        const companies = await getFilteredCompanies(status, req.userId);
        
        res.json(companies);
        
        // Log activity
        logActivity(
            req.userId,
            'view',
            'companies',
            null,
            `Viewed filtered companies (${status})`,
            req.ip
        );
    } catch (error) {
        next(error);
    }
});

// Filtered contacts endpoint
apiRouter.get("/contacts/filter/:status", async (req, res, next) => {
    try {
        const status = req.params.status;
        const contacts = await getFilteredContacts(status, req.userId);
        
        res.json(contacts);
        
        // Log activity
        logActivity(
            req.userId,
            'view',
            'contacts',
            null,
            `Viewed filtered contacts (${status})`,
            req.ip
        );
    } catch (error) {
        next(error);
    }
});

export default apiRouter;