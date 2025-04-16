import { getDbConnection, isUserAdmin, runTransaction } from "./connection.js";
import { logActivity } from "../middleware/auth.js";

/**
 * Communications related database operations
 */
export const communicationsDb = {
    /**
     * Get all communications (admin only)
     * @param {number} userId - The user ID
     * @param {number} limit - Maximum number of communications to return
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Array>} Array of communication objects
     */
    async getAll(userId, limit = 100, offset = 0) {
        const db = await getDbConnection();
        
        // Only admins can get all communications
        const isAdmin = await isUserAdmin(userId);
        
        if (!isAdmin) {
            throw new Error("Only admins can access all communications");
        }
        
        return db.all(`
            SELECT com.*, 
                   c.first_name || ' ' || c.last_name as contact_name,
                   c.contact_id, co.company_name, co.company_id
            FROM communications com
            JOIN contacts c ON com.contact_id = c.contact_id
            LEFT JOIN companies co ON c.company_id = co.company_id
            ORDER BY com.date_contacted DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);
    },
    
    /**
     * Get communications by contact ID (for a specific user)
     * @param {number} contactId - The contact ID
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of communication objects
     */
    async getByContactId(contactId, userId) {
        const db = await getDbConnection();
        
        // Check if user is admin
        const isAdmin = await isUserAdmin(userId);
        
        if (isAdmin) {
            return db.all(
                `SELECT c.*
                 FROM communications c
                 WHERE c.contact_id = ?
                 ORDER BY c.date_contacted DESC`,
                [contactId]
            );
        }
        
        // Check if user has access to the contact
        const { contactsDb } = await import('./contacts.js');
        const hasContactAccess = await contactsDb.checkUserAccess(contactId, userId);
        
        if (!hasContactAccess) {
            return [];
        }
        
        return db.all(
            `SELECT c.*
             FROM communications c
             JOIN user_communications uc ON c.communication_id = uc.communication_id
             WHERE c.contact_id = ? AND uc.user_id = ?
             ORDER BY c.date_contacted DESC`,
            [contactId, userId]
        );
    },

    /**
     * Get a communication by ID (for a specific user)
     * @param {number} id - The communication ID
     * @param {number} userId - The user ID
     * @returns {Promise<object>} The communication object
     */
    async getById(id, userId) {
        const db = await getDbConnection();
        
        // Check if user is admin
        const isAdmin = await isUserAdmin(userId);
        
        if (isAdmin) {
            return db.get(
                `SELECT c.*
                 FROM communications c
                 WHERE c.communication_id = ?`,
                [id]
            );
        }
        
        return db.get(
            `SELECT c.*
             FROM communications c
             JOIN user_communications uc ON c.communication_id = uc.communication_id
             WHERE c.communication_id = ? AND uc.user_id = ?`,
            [id, userId]
        );
    },

    /**
     * Create a new communication
     * @param {object} communication - The communication data
     * @param {number} userId - The user ID
     * @returns {Promise<object>} The created communication with ID
     */
    async create(communication, userId) {
        return await runTransaction(async (db) => {
            try {
                // Check if user has access to the contact
                const { contactsDb } = await import('./contacts.js');
                const hasContactAccess = await contactsDb.checkUserAccess(communication.contact_id, userId);
                
                if (!hasContactAccess) {
                    throw new Error("You don't have access to this contact");
                }
                
                // Insert into communications table
                const result = await db.run(
                    `INSERT INTO communications
                    (contact_id, date_contacted, contact_method, message_content,
                     received_response, response_date, response_content)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        communication.contact_id,
                        communication.date_contacted,
                        communication.contact_method,
                        communication.message_content,
                        communication.received_response ? 1 : 0,
                        communication.response_date,
                        communication.response_content,
                    ]
                );

                const communicationId = result.lastID;

                // Associate communication with user
                await db.run(
                    "INSERT INTO user_communications (user_id, communication_id, is_owner) VALUES (?, ?, 1)",
                    [userId, communicationId]
                );
                
                // Get contact name for activity log
                const contact = await db.get(
                    "SELECT first_name, last_name FROM contacts WHERE contact_id = ?",
                    [communication.contact_id]
                );
                
                // Log activity
                let activityDetails = `Created ${communication.contact_method} communication`;
                if (contact) {
                    activityDetails += ` with ${contact.first_name} ${contact.last_name}`;
                }
                
                await logActivity(
                    userId,
                    'create',
                    'communication',
                    communicationId,
                    activityDetails,
                    null
                );

                return {
                    communication_id: communicationId,
                    ...communication,
                };
            } catch (error) {
                console.error("Error creating communication:", error);
                throw error;
            }
        });
    },

    /**
     * Update a communication
     * @param {number} id - The communication ID
     * @param {object} communication - The updated communication data
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async update(id, communication, userId) {
        const db = await getDbConnection();

        // Check if user has access to this communication
        const hasAccess = await this.checkUserAccess(id, userId);
        if (!hasAccess) {
            return false;
        }
        
        // If contact ID is changing, verify access to the new contact
        if (communication.contact_id) {
            const currentComm = await this.getById(id, userId);
            if (currentComm.contact_id !== communication.contact_id) {
                const { contactsDb } = await import('./contacts.js');
                const hasContactAccess = await contactsDb.checkUserAccess(communication.contact_id, userId);
                
                if (!hasContactAccess) {
                    throw new Error("You don't have access to the target contact");
                }
            }
        }

        try {
            const result = await db.run(
                `UPDATE communications
                SET contact_id = ?, date_contacted = ?, contact_method = ?, message_content = ?,
                    received_response = ?, response_date = ?, response_content = ?
                WHERE communication_id = ?`,
                [
                    communication.contact_id,
                    communication.date_contacted,
                    communication.contact_method,
                    communication.message_content,
                    communication.received_response ? 1 : 0,
                    communication.response_date,
                    communication.response_content,
                    id,
                ]
            );
            
            // Log activity if update was successful
            if (result.changes > 0) {
                // Get contact name for activity log
                const contact = await db.get(
                    "SELECT first_name, last_name FROM contacts WHERE contact_id = ?",
                    [communication.contact_id]
                );
                
                let activityDetails = `Updated ${communication.contact_method} communication`;
                if (contact) {
                    activityDetails += ` with ${contact.first_name} ${contact.last_name}`;
                }
                
                await logActivity(
                    userId,
                    'update',
                    'communication',
                    id,
                    activityDetails,
                    null
                );
            }

            return result.changes > 0;
        } catch (error) {
            console.error("Error updating communication:", error);
            throw error;
        }
    },

    /**
     * Delete a communication
     * @param {number} id - The communication ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id, userId) {
        // Check if user has access to this communication
        const hasAccess = await this.checkUserAccess(id, userId);
        if (!hasAccess) {
            return false;
        }

        return await runTransaction(async (db) => {
            try {
                // Get communication info for activity log
                const comm = await this.getById(id, userId);
                
                // If admin, perform direct delete
                const isAdmin = await isUserAdmin(userId);
                if (isAdmin) {
                    // Delete all user-communication associations
                    await db.run("DELETE FROM user_communications WHERE communication_id = ?", id);
                    
                    // Delete the communication
                    const result = await db.run("DELETE FROM communications WHERE communication_id = ?", id);
                    
                    // Log activity
                    if (result.changes > 0 && comm) {
                        await logActivity(
                            userId,
                            'delete',
                            'communication',
                            id,
                            `Admin deleted ${comm.contact_method} communication`,
                            null
                        );
                    }
                    
                    return result.changes > 0;
                }
                
                // For regular users, check if they're the owner
                const isOwner = await db.get(
                    "SELECT 1 FROM user_communications WHERE communication_id = ? AND user_id = ? AND is_owner = 1",
                    [id, userId]
                );
                
                if (!isOwner) {
                    // Regular users can only remove their association if they're not owners
                    const result = await db.run(
                        "DELETE FROM user_communications WHERE communication_id = ? AND user_id = ?",
                        [id, userId]
                    );
                    
                    // Log activity
                    if (result.changes > 0 && comm) {
                        await logActivity(
                            userId,
                            'remove-access',
                            'communication',
                            id,
                            `Removed access to ${comm.contact_method} communication`,
                            null
                        );
                    }
                    
                    return result.changes > 0;
                }

                // Remove user-communication association
                await db.run(
                    "DELETE FROM user_communications WHERE communication_id = ? AND user_id = ?",
                    [id, userId]
                );

                // Check if other users have access to this communication
                const otherUsersHaveAccess = await db.get(
                    "SELECT 1 FROM user_communications WHERE communication_id = ? LIMIT 1",
                    id
                );

                // If no other users have access, delete the communication
                if (!otherUsersHaveAccess) {
                    await db.run(
                        "DELETE FROM communications WHERE communication_id = ?",
                        id
                    );
                }
                
                // Log activity
                if (comm) {
                    await logActivity(
                        userId,
                        'delete',
                        'communication',
                        id,
                        `Deleted ${comm.contact_method} communication`,
                        null
                    );
                }

                return true;
            } catch (error) {
                console.error("Error deleting communication:", error);
                throw error;
            }
        });
    },

    /**
     * Check if user has access to a communication
     * @param {number} communicationId - The communication ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Whether user has access
     */
    async checkUserAccess(communicationId, userId) {
        const db = await getDbConnection();
        
        // Admins always have access
        const isAdmin = await isUserAdmin(userId);
        if (isAdmin) {
            return true;
        }
        
        // Regular user access check
        const result = await db.get(
            "SELECT 1 FROM user_communications WHERE communication_id = ? AND user_id = ?",
            [communicationId, userId]
        );
        return !!result;
    },
    
    /**
     * Share a communication with another user
     * @param {number} communicationId - The communication ID
     * @param {number} ownerId - The current owner's user ID
     * @param {number} targetUserId - The user ID to share with
     * @param {boolean} isOwner - Whether the target user should be an owner
     * @returns {Promise<boolean>} Success status
     */
    async shareCommunication(communicationId, ownerId, targetUserId, isOwner = false) {
        const db = await getDbConnection();
        
        // Check if owner has access to this communication (or is admin)
        const hasAccess = await this.checkUserAccess(communicationId, ownerId);
        if (!hasAccess) {
            return false;
        }
        
        // Regular users can only share if they are owners
        const isAdmin = await isUserAdmin(ownerId);
        if (!isAdmin) {
            const isActualOwner = await db.get(
                "SELECT 1 FROM user_communications WHERE communication_id = ? AND user_id = ? AND is_owner = 1",
                [communicationId, ownerId]
            );
            
            if (!isActualOwner) {
                return false;
            }
        }
        
        // Check if target user already has access
        const targetHasAccess = await this.checkUserAccess(communicationId, targetUserId);
        if (targetHasAccess) {
            // Update owner status if needed
            if (isOwner) {
                await db.run(
                    "UPDATE user_communications SET is_owner = 1 WHERE communication_id = ? AND user_id = ?",
                    [communicationId, targetUserId]
                );
            }
            return true;
        }
        
        // Add access for target user
        const result = await db.run(
            "INSERT INTO user_communications (user_id, communication_id, is_owner) VALUES (?, ?, ?)",
            [targetUserId, communicationId, isOwner ? 1 : 0]
        );
        
        // Log the sharing activity
        if (result.changes > 0) {
            // Get communication and user info for better logging
            const [comm, targetUser] = await Promise.all([
                db.get("SELECT contact_method FROM communications WHERE communication_id = ?", communicationId),
                db.get("SELECT username FROM users WHERE user_id = ?", targetUserId)
            ]);
            
            await logActivity(
                ownerId,
                'share',
                'communication',
                communicationId,
                `Shared ${comm?.contact_method} communication with user ${targetUser?.username}`,
                null
            );
        }
        
        return result.changes > 0;
    },
    
    /**
     * Get stats about communications for dashboard
     * @param {number} userId - The user ID 
     * @returns {Promise<object>} Communication statistics
     */
    async getStats(userId) {
        const db = await getDbConnection();
        const isAdmin = await isUserAdmin(userId);
        
        let query = `
            SELECT 
                COUNT(*) AS total,
                COUNT(CASE WHEN c.date_contacted > datetime('now', '-30 days') THEN 1 END) AS recent,
                COUNT(CASE WHEN c.contact_method = 'email' THEN 1 END) AS emails,
                COUNT(CASE WHEN c.contact_method = 'phone' THEN 1 END) AS calls,
                COUNT(CASE WHEN c.received_response = 1 THEN 1 END) AS with_response
        `;
        
        if (isAdmin) {
            query += " FROM communications c";
        } else {
            query += `
                FROM communications c
                JOIN user_communications uc ON c.communication_id = uc.communication_id
                WHERE uc.user_id = ?
            `;
        }
        
        const params = isAdmin ? [] : [userId];
        const stats = await db.get(query, params);
        
        return {
            total: stats.total,
            recent: stats.recent,
            emails: stats.emails,
            calls: stats.calls,
            withResponse: stats.with_response,
            responseRate: stats.total > 0 ? (stats.with_response / stats.total * 100).toFixed(1) : 0
        };
    }
};
