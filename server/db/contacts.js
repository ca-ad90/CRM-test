import { getDbConnection, isUserAdmin, runTransaction } from "./connection.js";
import { logActivity } from "../middleware/auth.js";

export const contactsDb = {
    /**
     * Get all contacts for a user (or all for admin)
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of contact objects
     */
    async getAll(userId) {
        const db = await getDbConnection();
        
        // Check if user is admin
        const isAdmin = await isUserAdmin(userId);
        
        if (isAdmin) {
            return db.all(`
                SELECT c.*, co.company_name
                FROM contacts c
                LEFT JOIN companies co ON c.company_id = co.company_id
                ORDER BY c.last_name, c.first_name
            `);
        }
        
        // Regular user - only return contacts they have access to
        return db.all(`
            SELECT c.*, co.company_name
            FROM contacts c
            JOIN user_contacts uc ON c.contact_id = uc.contact_id
            LEFT JOIN companies co ON c.company_id = co.company_id
            WHERE uc.user_id = ?
            ORDER BY c.last_name, c.first_name
        `, userId);
    },

    /**
     * Get a contact by ID (with admin override)
     * @param {number} id - The contact ID
     * @param {number} userId - The user ID
     * @returns {Promise<object>} The contact object
     */
    async getById(id, userId) {
        const db = await getDbConnection();
        
        // Check if user is admin
        const isAdmin = await isUserAdmin(userId);
        
        if (isAdmin) {
            return db.get(
                `SELECT c.*, co.company_name
                 FROM contacts c
                 LEFT JOIN companies co ON c.company_id = co.company_id
                 WHERE c.contact_id = ?`,
                [id]
            );
        }
        
        // Regular user access check
        return db.get(
            `SELECT c.*, co.company_name
             FROM contacts c
             JOIN user_contacts uc ON c.contact_id = uc.contact_id
             LEFT JOIN companies co ON c.company_id = co.company_id
             WHERE c.contact_id = ? AND uc.user_id = ?`,
            [id, userId]
        );
    },

    /**
     * Get contacts by company ID (with admin override)
     * @param {number} companyId - The company ID
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of contact objects
     */
    async getByCompanyId(companyId, userId) {
        const db = await getDbConnection();
        
        // Check if user is admin
        const isAdmin = await isUserAdmin(userId);
        
        if (isAdmin) {
            return db.all(
                `SELECT c.*
                 FROM contacts c
                 WHERE c.company_id = ?
                 ORDER BY c.last_name, c.first_name`,
                [companyId]
            );
        }
        
        // Check if user has access to company
        const { companiesDb } = await import('./companies.js');
        const hasCompanyAccess = await companiesDb.checkUserAccess(companyId, userId);
        
        if (hasCompanyAccess) {
            return db.all(
                `SELECT c.*
                 FROM contacts c
                 LEFT JOIN user_contacts uc ON c.contact_id = uc.contact_id AND uc.user_id = ?
                 WHERE c.company_id = ?
                 ORDER BY c.last_name, c.first_name`,
                [userId, companyId]
            );
        }
        
        // Regular user access - only contacts they have direct access to
        return db.all(
            `SELECT c.*
             FROM contacts c
             JOIN user_contacts uc ON c.contact_id = uc.contact_id
             WHERE c.company_id = ? AND uc.user_id = ?
             ORDER BY c.last_name, c.first_name`,
            [companyId, userId]
        );
    },

    /**
     * Create a new contact
     * @param {object} contact - The contact data
     * @param {number} userId - The user ID
     * @returns {Promise<object>} The created contact with ID
     */
    async create(contact, userId) {
        return await runTransaction(async (db) => {
            try {
                // Check company access if company ID is provided
                if (contact.company_id) {
                    const { companiesDb } = await import('./companies.js');
                    const hasCompanyAccess = await companiesDb.checkUserAccess(contact.company_id, userId);
                    
                    if (!hasCompanyAccess) {
                        throw new Error("You don't have access to this company");
                    }
                }
                
                // Insert into contacts table
                const result = await db.run(
                    `INSERT INTO contacts
                    (company_id, first_name, last_name, position, email, phone, linkedin_url, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        contact.company_id,
                        contact.first_name,
                        contact.last_name,
                        contact.position,
                        contact.email,
                        contact.phone,
                        contact.linkedin_url,
                        contact.notes
                    ]
                );

                const contactId = result.lastID;

                // Associate contact with user
                await db.run(
                    "INSERT INTO user_contacts (user_id, contact_id, is_owner) VALUES (?, ?, 1)",
                    [userId, contactId]
                );
                
                // Log activity
                await logActivity(
                    userId,
                    'create',
                    'contact',
                    contactId,
                    `Created contact: ${contact.first_name} ${contact.last_name}`,
                    null
                );

                return {
                    contact_id: contactId,
                    ...contact,
                };
            } catch (error) {
                console.error("Error creating contact:", error);
                throw error;
            }
        });
    },

    /**
     * Update a contact
     * @param {number} id - The contact ID
     * @param {object} contact - The updated contact data
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async update(id, contact, userId) {
        const db = await getDbConnection();

        // Check if user has access to this contact
        const hasAccess = await this.checkUserAccess(id, userId);
        if (!hasAccess) {
            return false;
        }

        // Check company access if company ID is provided and changed
        if (contact.company_id) {
            const currentContact = await this.getById(id, userId);
            
            if (currentContact.company_id !== contact.company_id) {
                const { companiesDb } = await import('./companies.js');
                const hasCompanyAccess = await companiesDb.checkUserAccess(contact.company_id, userId);
                
                if (!hasCompanyAccess) {
                    throw new Error("You don't have access to the target company");
                }
            }
        }

        try {
            const result = await db.run(
                `UPDATE contacts
                SET company_id = ?, first_name = ?, last_name = ?, position = ?,
                    email = ?, phone = ?, linkedin_url = ?, notes = ?
                WHERE contact_id = ?`,
                [
                    contact.company_id,
                    contact.first_name,
                    contact.last_name,
                    contact.position,
                    contact.email,
                    contact.phone,
                    contact.linkedin_url,
                    contact.notes,
                    id,
                ]
            );
            
            // Log activity if update was successful
            if (result.changes > 0) {
                await logActivity(
                    userId,
                    'update',
                    'contact',
                    id,
                    `Updated contact: ${contact.first_name} ${contact.last_name}`,
                    null
                );
            }

            return result.changes > 0;
        } catch (error) {
            console.error("Error updating contact:", error);
            throw error;
        }
    },

    /**
     * Delete a contact
     * @param {number} id - The contact ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id, userId) {
        // Check if user has access to this contact
        const hasAccess = await this.checkUserAccess(id, userId);
        if (!hasAccess) {
            return false;
        }

        return await runTransaction(async (db) => {
            try {
                // Get contact info for activity log
                const contact = await this.getById(id, userId);
                
                // If admin, perform direct delete
                const isAdmin = await isUserAdmin(userId);
                if (isAdmin) {
                    // Delete all user-contact associations
                    await db.run("DELETE FROM user_contacts WHERE contact_id = ?", id);
                    
                    // Delete the contact
                    const result = await db.run("DELETE FROM contacts WHERE contact_id = ?", id);
                    
                    // Log activity
                    if (result.changes > 0 && contact) {
                        await logActivity(
                            userId,
                            'delete',
                            'contact',
                            id,
                            `Admin deleted contact: ${contact.first_name} ${contact.last_name}`,
                            null
                        );
                    }
                    
                    return result.changes > 0;
                }
                
                // For regular users, check if they're the owner
                const isOwner = await db.get(
                    "SELECT 1 FROM user_contacts WHERE contact_id = ? AND user_id = ? AND is_owner = 1",
                    [id, userId]
                );
                
                if (!isOwner) {
                    // Regular users can only remove their association if they're not owners
                    const result = await db.run(
                        "DELETE FROM user_contacts WHERE contact_id = ? AND user_id = ?",
                        [id, userId]
                    );
                    
                    // Log activity
                    if (result.changes > 0 && contact) {
                        await logActivity(
                            userId,
                            'remove-access',
                            'contact',
                            id,
                            `Removed access to contact: ${contact.first_name} ${contact.last_name}`,
                            null
                        );
                    }
                    
                    return result.changes > 0;
                }

                // Remove user-contact association
                await db.run(
                    "DELETE FROM user_contacts WHERE contact_id = ? AND user_id = ?",
                    [id, userId]
                );

                // Check if other users have access to this contact
                const otherUsersHaveAccess = await db.get(
                    "SELECT 1 FROM user_contacts WHERE contact_id = ? LIMIT 1",
                    id
                );

                // If no other users have access, delete the contact
                if (!otherUsersHaveAccess) {
                    await db.run(
                        "DELETE FROM contacts WHERE contact_id = ?",
                        id
                    );
                }
                
                // Log activity
                if (contact) {
                    await logActivity(
                        userId,
                        'delete',
                        'contact',
                        id,
                        `Deleted contact: ${contact.first_name} ${contact.last_name}`,
                        null
                    );
                }

                return true;
            } catch (error) {
                console.error("Error deleting contact:", error);
                throw error;
            }
        });
    },

    /**
     * Check if user has access to a contact (admins always have access)
     * @param {number} contactId - The contact ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Whether user has access
     */
    async checkUserAccess(contactId, userId) {
        const db = await getDbConnection();
        
        // Admins always have access
        const isAdmin = await isUserAdmin(userId);
        if (isAdmin) {
            return true;
        }
        
        // Regular user access check
        const result = await db.get(
            "SELECT 1 FROM user_contacts WHERE contact_id = ? AND user_id = ?",
            [contactId, userId]
        );
        return !!result;
    },

    /**
     * Share a contact with another user
     * @param {number} contactId - The contact ID
     * @param {number} ownerId - The current owner's user ID
     * @param {number} targetUserId - The user ID to share with
     * @param {boolean} isOwner - Whether the target user should be an owner
     * @returns {Promise<boolean>} Success status
     */
    async shareContact(contactId, ownerId, targetUserId, isOwner = false) {
        const db = await getDbConnection();
        
        // Check if owner has access to this contact (or is admin)
        const hasAccess = await this.checkUserAccess(contactId, ownerId);
        if (!hasAccess) {
            return false;
        }
        
        // Regular users can only share if they are owners
        const isAdmin = await isUserAdmin(ownerId);
        if (!isAdmin) {
            const isActualOwner = await db.get(
                "SELECT 1 FROM user_contacts WHERE contact_id = ? AND user_id = ? AND is_owner = 1",
                [contactId, ownerId]
            );
            
            if (!isActualOwner) {
                return false;
            }
        }
        
        // Check if target user already has access
        const targetHasAccess = await this.checkUserAccess(contactId, targetUserId);
        if (targetHasAccess) {
            // Update owner status if needed
            if (isOwner) {
                await db.run(
                    "UPDATE user_contacts SET is_owner = 1 WHERE contact_id = ? AND user_id = ?",
                    [contactId, targetUserId]
                );
            }
            return true;
        }
        
        // Add access for target user
        const result = await db.run(
            "INSERT INTO user_contacts (user_id, contact_id, is_owner) VALUES (?, ?, ?)",
            [targetUserId, contactId, isOwner ? 1 : 0]
        );
        
        // Log the sharing activity
        if (result.changes > 0) {
            // Get contact and user info for better logging
            const [contact, targetUser] = await Promise.all([
                db.get("SELECT first_name, last_name FROM contacts WHERE contact_id = ?", contactId),
                db.get("SELECT username FROM users WHERE user_id = ?", targetUserId)
            ]);
            
            await logActivity(
                ownerId,
                'share',
                'contact',
                contactId,
                `Shared contact "${contact?.first_name} ${contact?.last_name}" with user ${targetUser?.username}`,
                null
            );
        }
        
        return result.changes > 0;
    },
    
    /**
     * Get stats about contacts for dashboard
     * @param {number} userId - The user ID 
     * @returns {Promise<object>} Contact statistics
     */
    async getStats(userId) {
        const db = await getDbConnection();
        const isAdmin = await isUserAdmin(userId);
        
        let query = `
            SELECT 
                COUNT(*) AS total,
                COUNT(CASE WHEN c.created_at > datetime('now', '-30 days') THEN 1 END) AS recent,
                COUNT(DISTINCT c.company_id) AS companies_with_contacts
        `;
        
        if (isAdmin) {
            query += " FROM contacts c";
        } else {
            query += `
                FROM contacts c
                JOIN user_contacts uc ON c.contact_id = uc.contact_id
                WHERE uc.user_id = ?
            `;
        }
        
        const params = isAdmin ? [] : [userId];
        const stats = await db.get(query, params);
        
        return {
            total: stats.total,
            recent: stats.recent,
            companiesWithContacts: stats.companies_with_contacts
        };
    }
};
