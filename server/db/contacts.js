import { getDbConnection } from "./connection.js";

export const contactsDb = {
    /**
     * Get all contacts for a user
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of contact objects
     */
    async getAll(userId) {
        const db = await getDbConnection();
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
     * Get a contact by ID (for a specific user)
     * @param {number} id - The contact ID
     * @param {number} userId - The user ID
     * @returns {Promise<object>} The contact object
     */
    async getById(id, userId) {
        const db = await getDbConnection();
        return db.get(
            `
            SELECT c.*, co.company_name
            FROM contacts c
            JOIN user_contacts uc ON c.contact_id = uc.contact_id
            LEFT JOIN companies co ON c.company_id = co.company_id
            WHERE c.contact_id = ? AND uc.user_id = ?
            `,
            [id, userId]
        );
    },

    /**
     * Get contacts by company ID (for a specific user)
     * @param {number} companyId - The company ID
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of contact objects
     */
    async getByCompanyId(companyId, userId) {
        const db = await getDbConnection();
        return db.all(
            `
            SELECT c.*
            FROM contacts c
            JOIN user_contacts uc ON c.contact_id = uc.contact_id
            WHERE c.company_id = ? AND uc.user_id = ?
            ORDER BY c.last_name, c.first_name
            `,
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
        const db = await getDbConnection();

        // Begin transaction
        await db.run('BEGIN TRANSACTION');

        try {
            // Insert into contacts table
            const result = await db.run(
                `INSERT INTO contacts
                (company_id, first_name, last_name, position, email, phone, linkedin_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    contact.company_id,
                    contact.first_name,
                    contact.last_name,
                    contact.position,
                    contact.email,
                    contact.phone,
                    contact.linkedin_url,
                ]
            );

            const contactId = result.lastID;

            // Associate contact with user
            await db.run(
                "INSERT INTO user_contacts (user_id, contact_id, is_owner) VALUES (?, ?, 1)",
                [userId, contactId]
            );

            // Commit transaction
            await db.run('COMMIT');

            return {
                contact_id: contactId,
                ...contact,
            };
        } catch (error) {
            // Rollback transaction in case of error
            await db.run('ROLLBACK');
            throw error;
        }
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

        const result = await db.run(
            `UPDATE contacts
            SET company_id = ?, first_name = ?, last_name = ?, position = ?,
                email = ?, phone = ?, linkedin_url = ?
            WHERE contact_id = ?`,
            [
                contact.company_id,
                contact.first_name,
                contact.last_name,
                contact.position,
                contact.email,
                contact.phone,
                contact.linkedin_url,
                id,
            ]
        );

        return result.changes > 0;
    },

    /**
     * Delete a contact
     * @param {number} id - The contact ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id, userId) {
        const db = await getDbConnection();

        // Check if user has access to this contact
        const hasAccess = await this.checkUserAccess(id, userId);
        if (!hasAccess) {
            return false;
        }

        // Begin transaction
        await db.run('BEGIN TRANSACTION');

        try {
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

            // Commit transaction
            await db.run('COMMIT');
            return true;
        } catch (error) {
            // Rollback transaction in case of error
            await db.run('ROLLBACK');
            throw error;
        }
    },

    /**
     * Check if user has access to a contact
     * @param {number} contactId - The contact ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Whether user has access
     */
    async checkUserAccess(contactId, userId) {
        const db = await getDbConnection();
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

        // Check if owner has access to this contact
        const hasAccess = await this.checkUserAccess(contactId, ownerId);
        if (!hasAccess) {
            return false;
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

        return result.changes > 0;
    }
};
