// db/users.js - User-related database operations

import { getDbConnection } from './connection.js';

/**
 * User related database operations
 */
export const usersDb = {
    /**
     * Get all users
     * @returns {Promise<Array>} Array of user objects
     */
    async getAll() {
        const db = await getDbConnection();
        return db.all("SELECT * FROM users ORDER BY username");
    },

    /**
     * Get a user by ID
     * @param {number} id - The user ID
     * @returns {Promise<object>} The user object
     */
    async getById(id) {
        const db = await getDbConnection();
        return db.get("SELECT * FROM users WHERE user_id = ?", id);
    },

    /**
     * Get a user by username
     * @param {string} username - The username
     * @returns {Promise<object>} The user object
     */
    async getByUsername(username) {
        const db = await getDbConnection();
        return db.get("SELECT * FROM users WHERE username = ?", username);
    },

    /**
     * Create a new user
     * @param {object} user - The user data
     * @returns {Promise<object>} The created user with ID
     */
    async create(user) {
        const db = await getDbConnection();
        const result = await db.run(
            "INSERT INTO users (username) VALUES (?)",
            [user.username]
        );

        return {
            user_id: result.lastID,
            ...user,
        };
    },

    /**
     * Update a user's last login time
     * @param {number} id - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async updateLastLogin(id) {
        const db = await getDbConnection();
        const result = await db.run(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?",
            [id]
        );

        return result.changes > 0;
    },

    /**
     * Delete a user
     * @param {number} id - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        const db = await getDbConnection();
        const result = await db.run(
            "DELETE FROM users WHERE user_id = ?",
            id
        );
        return result.changes > 0;
    }
};
