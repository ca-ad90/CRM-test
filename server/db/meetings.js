import { getDbConnection, isUserAdmin, runTransaction } from "./connection.js";
import { logActivity } from "../middleware/auth.js";

/**
 * Meetings related database operations
 */
export const meetingsDb = {
    /**
     * Get all meetings for a specific user (or all for admin)
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of meeting objects
     */
    async getAll(userId) {
        const db = await getDbConnection();
        
        // Check if user is admin - if so, return all meetings
        const isAdmin = await isUserAdmin(userId);
        
        if (isAdmin) {
            return db.all(`
                SELECT m.*, c.first_name, c.last_name, co.company_name
                FROM meetings m
                JOIN contacts c ON m.contact_id = c.contact_id
                LEFT JOIN companies co ON c.company_id = co.company_id
                ORDER BY m.meeting_date DESC
            `);
        }
        
        // Regular user - only return meetings they have access to
        return db.all(`
            SELECT m.*, c.first_name, c.last_name, co.company_name
            FROM meetings m
            JOIN user_meetings um ON m.meeting_id = um.meeting_id
            JOIN contacts c ON m.contact_id = c.contact_id
            LEFT JOIN companies co ON c.company_id = co.company_id
            WHERE um.user_id = ?
            ORDER BY m.meeting_date DESC
        `, userId);
    },

    /**
     * Get meetings by contact ID (for a specific user)
     * @param {number} contactId - The contact ID
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of meeting objects
     */
    async getByContactId(contactId, userId) {
        const db = await getDbConnection();
        
        // Check if user is admin
        const isAdmin = await isUserAdmin(userId);
        
        if (isAdmin) {
            return db.all(
                `SELECT m.*
                 FROM meetings m
                 WHERE m.contact_id = ?
                 ORDER BY m.meeting_date DESC`,
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
            `SELECT m.*
             FROM meetings m
             JOIN user_meetings um ON m.meeting_id = um.meeting_id
             WHERE m.contact_id = ? AND um.user_id = ?
             ORDER BY m.meeting_date DESC`,
            [contactId, userId]
        );
    },

    /**
     * Get a meeting by ID (for a specific user)
     * @param {number} id - The meeting ID
     * @param {number} userId - The user ID
     * @returns {Promise<object>} The meeting object
     */
    async getById(id, userId) {
        const db = await getDbConnection();
        
        // Check if user is admin
        const isAdmin = await isUserAdmin(userId);
        
        if (isAdmin) {
            return db.get(
                `SELECT m.*, c.first_name, c.last_name, co.company_name
                 FROM meetings m
                 JOIN contacts c ON m.contact_id = c.contact_id
                 LEFT JOIN companies co ON c.company_id = co.company_id
                 WHERE m.meeting_id = ?`,
                [id]
            );
        }
        
        return db.get(
            `SELECT m.*, c.first_name, c.last_name, co.company_name
             FROM meetings m
             JOIN user_meetings um ON m.meeting_id = um.meeting_id
             JOIN contacts c ON m.contact_id = c.contact_id
             LEFT JOIN companies co ON c.company_id = co.company_id
             WHERE m.meeting_id = ? AND um.user_id = ?`,
            [id, userId]
        );
    },

    /**
     * Create a new meeting
     * @param {object} meeting - The meeting data
     * @param {number} userId - The user ID
     * @returns {Promise<object>} The created meeting with ID
     */
    async create(meeting, userId) {
        return await runTransaction(async (db) => {
            try {
                // Check if user has access to the contact
                const { contactsDb } = await import('./contacts.js');
                const hasContactAccess = await contactsDb.checkUserAccess(meeting.contact_id, userId);
                
                if (!hasContactAccess) {
                    throw new Error("You don't have access to this contact");
                }
                
                // Insert into meetings table
                const result = await db.run(
                    `INSERT INTO meetings
                    (contact_id, meeting_date, location, meeting_type, meeting_status,
                     meeting_notes, follow_up_needed)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        meeting.contact_id,
                        meeting.meeting_date,
                        meeting.location,
                        meeting.meeting_type,
                        meeting.meeting_status,
                        meeting.meeting_notes,
                        meeting.follow_up_needed ? 1 : 0,
                    ]
                );

                const meetingId = result.lastID;

                // Associate meeting with user
                await db.run(
                    "INSERT INTO user_meetings (user_id, meeting_id, is_owner) VALUES (?, ?, 1)",
                    [userId, meetingId]
                );
                
                // Get contact name for activity log
                const contact = await db.get(
                    "SELECT first_name, last_name FROM contacts WHERE contact_id = ?",
                    [meeting.contact_id]
                );
                
                // Log activity
                let activityDetails = `Created ${meeting.meeting_type} meeting (${meeting.meeting_status})`;
                if (contact) {
                    activityDetails += ` with ${contact.first_name} ${contact.last_name}`;
                }
                
                await logActivity(
                    userId,
                    'create',
                    'meeting',
                    meetingId,
                    activityDetails,
                    null
                );

                return {
                    meeting_id: meetingId,
                    ...meeting,
                };
            } catch (error) {
                console.error("Error creating meeting:", error);
                throw error;
            }
        });
    },

    /**
     * Update a meeting
     * @param {number} id - The meeting ID
     * @param {object} meeting - The updated meeting data
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async update(id, meeting, userId) {
        const db = await getDbConnection();

        // Check if user has access to this meeting
        const hasAccess = await this.checkUserAccess(id, userId);
        if (!hasAccess) {
            return false;
        }
        
        // If contact ID is changing, verify access to the new contact
        if (meeting.contact_id) {
            const currentMeeting = await this.getById(id, userId);
            if (currentMeeting.contact_id !== meeting.contact_id) {
                const { contactsDb } = await import('./contacts.js');
                const hasContactAccess = await contactsDb.checkUserAccess(meeting.contact_id, userId);
                
                if (!hasContactAccess) {
                    throw new Error("You don't have access to the target contact");
                }
            }
        }

        try {
            const result = await db.run(
                `UPDATE meetings
                SET contact_id = ?, meeting_date = ?, location = ?, meeting_type = ?,
                    meeting_status = ?, meeting_notes = ?, follow_up_needed = ?
                WHERE meeting_id = ?`,
                [
                    meeting.contact_id,
                    meeting.meeting_date,
                    meeting.location,
                    meeting.meeting_type,
                    meeting.meeting_status,
                    meeting.meeting_notes,
                    meeting.follow_up_needed ? 1 : 0,
                    id,
                ]
            );
            
            // Log activity if update was successful
            if (result.changes > 0) {
                // Get contact name for activity log
                const contact = await db.get(
                    "SELECT first_name, last_name FROM contacts WHERE contact_id = ?",
                    [meeting.contact_id]
                );
                
                let activityDetails = `Updated ${meeting.meeting_type} meeting (${meeting.meeting_status})`;
                if (contact) {
                    activityDetails += ` with ${contact.first_name} ${contact.last_name}`;
                }
                
                await logActivity(
                    userId,
                    'update',
                    'meeting',
                    id,
                    activityDetails,
                    null
                );
            }

            return result.changes > 0;
        } catch (error) {
            console.error("Error updating meeting:", error);
            throw error;
        }
    },

    /**
     * Delete a meeting
     * @param {number} id - The meeting ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id, userId) {
        // Check if user has access to this meeting
        const hasAccess = await this.checkUserAccess(id, userId);
        if (!hasAccess) {
            return false;
        }

        return await runTransaction(async (db) => {
            try {
                // Get meeting info for activity log
                const meeting = await this.getById(id, userId);
                
                // If admin, perform direct delete
                const isAdmin = await isUserAdmin(userId);
                if (isAdmin) {
                    // Delete all user-meeting associations
                    await db.run("DELETE FROM user_meetings WHERE meeting_id = ?", id);
                    
                    // Delete the meeting
                    const result = await db.run("DELETE FROM meetings WHERE meeting_id = ?", id);
                    
                    // Log activity
                    if (result.changes > 0 && meeting) {
                        await logActivity(
                            userId,
                            'delete',
                            'meeting',
                            id,
                            `Admin deleted ${meeting.meeting_type} meeting with ${meeting.first_name} ${meeting.last_name}`,
                            null
                        );
                    }
                    
                    return result.changes > 0;
                }
                
                // For regular users, check if they're the owner
                const isOwner = await db.get(
                    "SELECT 1 FROM user_meetings WHERE meeting_id = ? AND user_id = ? AND is_owner = 1",
                    [id, userId]
                );
                
                if (!isOwner) {
                    // Regular users can only remove their association if they're not owners
                    const result = await db.run(
                        "DELETE FROM user_meetings WHERE meeting_id = ? AND user_id = ?",
                        [id, userId]
                    );
                    
                    // Log activity
                    if (result.changes > 0 && meeting) {
                        await logActivity(
                            userId,
                            'remove-access',
                            'meeting',
                            id,
                            `Removed access to meeting with ${meeting.first_name} ${meeting.last_name}`,
                            null
                        );
                    }
                    
                    return result.changes > 0;
                }

                // Remove user-meeting association
                await db.run(
                    "DELETE FROM user_meetings WHERE meeting_id = ? AND user_id = ?",
                    [id, userId]
                );

                // Check if other users have access to this meeting
                const otherUsersHaveAccess = await db.get(
                    "SELECT 1 FROM user_meetings WHERE meeting_id = ? LIMIT 1",
                    id
                );

                // If no other users have access, delete the meeting
                if (!otherUsersHaveAccess) {
                    await db.run(
                        "DELETE FROM meetings WHERE meeting_id = ?",
                        id
                    );
                }
                
                // Log activity
                if (meeting) {
                    await logActivity(
                        userId,
                        'delete',
                        'meeting',
                        id,
                        `Deleted ${meeting.meeting_type} meeting with ${meeting.first_name} ${meeting.last_name}`,
                        null
                    );
                }

                return true;
            } catch (error) {
                console.error("Error deleting meeting:", error);
                throw error;
            }
        });
    },

    /**
     * Get upcoming meetings (for a specific user)
     * @param {number} limit - Maximum number of meetings to return
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of upcoming meeting objects
     */
    async getUpcoming(limit = 10, userId) {
        const db = await getDbConnection();
        const now = new Date().toISOString();
        
        // Check if user is admin
        const isAdmin = await isUserAdmin(userId);
        
        if (isAdmin) {
            return db.all(
                `SELECT m.*, c.first_name, c.last_name, co.company_name
                 FROM meetings m
                 JOIN contacts c ON m.contact_id = c.contact_id
                 LEFT JOIN companies co ON c.company_id = co.company_id
                 WHERE m.meeting_date > ?
                 AND m.meeting_status != 'cancelled'
                 ORDER BY m.meeting_date ASC
                 LIMIT ?`,
                [now, limit]
            );
        }
        
        return db.all(
            `SELECT m.*, c.first_name, c.last_name, co.company_name
             FROM meetings m
             JOIN user_meetings um ON m.meeting_id = um.meeting_id
             JOIN contacts c ON m.contact_id = c.contact_id
             LEFT JOIN companies co ON c.company_id = co.company_id
             WHERE m.meeting_date > ?
             AND m.meeting_status != 'cancelled'
             AND um.user_id = ?
             ORDER BY m.meeting_date ASC
             LIMIT ?`,
            [now, userId, limit]
        );
    },

    /**
     * Check if user has access to a meeting (admins always have access)
     * @param {number} meetingId - The meeting ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Whether user has access
     */
    async checkUserAccess(meetingId, userId) {
        const db = await getDbConnection();
        
        // Admins always have access
        const isAdmin = await isUserAdmin(userId);
        if (isAdmin) {
            return true;
        }
        
        // Regular user access check
        const result = await db.get(
            "SELECT 1 FROM user_meetings WHERE meeting_id = ? AND user_id = ?",
            [meetingId, userId]
        );
        return !!result;
    },
    
    /**
     * Share a meeting with another user
     * @param {number} meetingId - The meeting ID
     * @param {number} ownerId - The current owner's user ID
     * @param {number} targetUserId - The user ID to share with
     * @param {boolean} isOwner - Whether the target user should be an owner
     * @returns {Promise<boolean>} Success status
     */
    async shareMeeting(meetingId, ownerId, targetUserId, isOwner = false) {
        const db = await getDbConnection();
        
        // Check if owner has access to this meeting (or is admin)
        const hasAccess = await this.checkUserAccess(meetingId, ownerId);
        if (!hasAccess) {
            return false;
        }
        
        // Regular users can only share if they are owners
        const isAdmin = await isUserAdmin(ownerId);
        if (!isAdmin) {
            const isActualOwner = await db.get(
                "SELECT 1 FROM user_meetings WHERE meeting_id = ? AND user_id = ? AND is_owner = 1",
                [meetingId, ownerId]
            );
            
            if (!isActualOwner) {
                return false;
            }
        }
        
        // Check if target user already has access
        const targetHasAccess = await this.checkUserAccess(meetingId, targetUserId);
        if (targetHasAccess) {
            // Update owner status if needed
            if (isOwner) {
                await db.run(
                    "UPDATE user_meetings SET is_owner = 1 WHERE meeting_id = ? AND user_id = ?",
                    [meetingId, targetUserId]
                );
            }
            return true;
        }
        
        // Add access for target user
        const result = await db.run(
            "INSERT INTO user_meetings (user_id, meeting_id, is_owner) VALUES (?, ?, ?)",
            [targetUserId, meetingId, isOwner ? 1 : 0]
        );
        
        // Log the sharing activity
        if (result.changes > 0) {
            // Get meeting and user info for better logging
            const [meeting, targetUser] = await Promise.all([
                this.getById(meetingId, ownerId),
                db.get("SELECT username FROM users WHERE user_id = ?", targetUserId)
            ]);
            
            let activityDetails = `Shared meeting with user ${targetUser?.username}`;
            if (meeting) {
                activityDetails = `Shared ${meeting.meeting_type} meeting with ${meeting.first_name} ${meeting.last_name} with user ${targetUser?.username}`;
            }
            
            await logActivity(
                ownerId,
                'share',
                'meeting',
                meetingId,
                activityDetails,
                null
            );
        }
        
        return result.changes > 0;
    },
    
    /**
     * Get stats about meetings for dashboard
     * @param {number} userId - The user ID 
     * @returns {Promise<object>} Meeting statistics
     */
    async getStats(userId) {
        const db = await getDbConnection();
        const isAdmin = await isUserAdmin(userId);
        const now = new Date().toISOString();
        
        let query = `
            SELECT 
                COUNT(*) AS total,
                COUNT(CASE WHEN m.meeting_date > ? THEN 1 END) AS upcoming,
                COUNT(CASE WHEN m.meeting_date < ? AND m.meeting_status = 'completed' THEN 1 END) AS completed,
                COUNT(CASE WHEN m.meeting_status = 'cancelled' THEN 1 END) AS cancelled,
                COUNT(CASE WHEN m.follow_up_needed = 1 THEN 1 END) AS needs_followup
        `;
        
        if (isAdmin) {
            query += " FROM meetings m";
        } else {
            query += `
                FROM meetings m
                JOIN user_meetings um ON m.meeting_id = um.meeting_id
                WHERE um.user_id = ?
            `;
        }
        
        const params = isAdmin ? [now, now] : [now, now, userId];
        const stats = await db.get(query, params);
        
        return {
            total: stats.total,
            upcoming: stats.upcoming,
            completed: stats.completed,
            cancelled: stats.cancelled,
            needsFollowup: stats.needs_followup
        };
    },
    
    /**
     * Get meetings that need follow-up
     * @param {number} limit - Maximum number of meetings to return
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of meeting objects
     */
    async getFollowupNeeded(limit = 10, userId) {
        const db = await getDbConnection();
        
        // Check if user is admin
        const isAdmin = await isUserAdmin(userId);
        
        if (isAdmin) {
            return db.all(
                `SELECT m.*, c.first_name, c.last_name, co.company_name
                 FROM meetings m
                 JOIN contacts c ON m.contact_id = c.contact_id
                 LEFT JOIN companies co ON c.company_id = co.company_id
                 WHERE m.follow_up_needed = 1
                 AND m.meeting_status = 'completed'
                 ORDER BY m.meeting_date DESC
                 LIMIT ?`,
                [limit]
            );
        }
        
        return db.all(
            `SELECT m.*, c.first_name, c.last_name, co.company_name
             FROM meetings m
             JOIN user_meetings um ON m.meeting_id = um.meeting_id
             JOIN contacts c ON m.contact_id = c.contact_id
             LEFT JOIN companies co ON c.company_id = co.company_id
             WHERE m.follow_up_needed = 1
             AND m.meeting_status = 'completed'
             AND um.user_id = ?
             ORDER BY m.meeting_date DESC
             LIMIT ?`,
            [userId, limit]
        );
    }
};
