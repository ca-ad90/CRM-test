import { getDbConnection } from "./connection.js";
import bcrypt from "bcrypt";

export const usersDb = {
  /**
   * Get all users (admin only function)
   * @returns {Promise<Array>} Array of user objects (without passwords)
   */
  async getAll() {
    const db = await getDbConnection();
    return db.all(
      "SELECT user_id, username, email, created_at, last_login FROM users"
    );
  },

  /**
   * Get a user by ID
   * @param {number} id - The user ID
   * @returns {Promise<object>} User object (without password)
   */
  async getById(id) {
    const db = await getDbConnection();
    return db.get(
      "SELECT user_id, username, email, created_at, last_login FROM users WHERE user_id = ?",
      id
    );
  },

  /**
   * Get a user by username
   * @param {string} username - The username
   * @returns {Promise<object>} User object (with password hash for authentication)
   */
  async getByUsername(username) {
    const db = await getDbConnection();
    return db.get(
      "SELECT * FROM users WHERE username = ?",
      username
    );
  },

  /**
   * Get a user by email
   * @param {string} email - The email
   * @returns {Promise<object>} User object (with password hash for authentication)
   */
  async getByEmail(email) {
    const db = await getDbConnection();
    return db.get(
      "SELECT * FROM users WHERE email = ?",
      email
    );
  },

  /**
   * Create a new user
   * @param {object} userData - The user data (username, email, password)
   * @returns {Promise<object>} The created user with ID (without password)
   */
  async create(userData) {
    const db = await getDbConnection();

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    const result = await db.run(
      `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
      [userData.username, userData.email, passwordHash]
    );

    return {
      user_id: result.lastID,
      username: userData.username,
      email: userData.email,
      created_at: new Date().toISOString()
    };
  },

  /**
   * Update a user's last login time
   * @param {number} id - The user ID
   * @returns {Promise<boolean>} Success status
   */
  async updateLastLogin(id) {
    const db = await getDbConnection();
    const now = new Date().toISOString();

    const result = await db.run(
      "UPDATE users SET last_login = ? WHERE user_id = ?",
      [now, id]
    );

    return result.changes > 0;
  },

  /**
   * Update a user's password
   * @param {number} id - The user ID
   * @param {string} newPassword - The new password
   * @returns {Promise<boolean>} Success status
   */
  async updatePassword(id, newPassword) {
    const db = await getDbConnection();

    // Hash the new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const result = await db.run(
      "UPDATE users SET password_hash = ? WHERE user_id = ?",
      [passwordHash, id]
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
  },

  /**
   * Check if a username or email already exists
   * @param {string} username - The username to check
   * @param {string} email - The email to check
   * @returns {Promise<object>} Object with exists and field properties
   */
  async checkUserExists(username, email) {
    const db = await getDbConnection();

    const userByUsername = await db.get(
      "SELECT user_id FROM users WHERE username = ?",
      username
    );

    if (userByUsername) {
      return { exists: true, field: 'username' };
    }

    const userByEmail = await db.get(
      "SELECT user_id FROM users WHERE email = ?",
      email
    );

    if (userByEmail) {
      return { exists: true, field: 'email' };
    }

    return { exists: false };
  },

  /**
   * Validate user credentials
   * @param {string} username - The username
   * @param {string} password - The password
   * @returns {Promise<object|null>} User object if valid, null otherwise
   */
  async validateCredentials(username, password) {
    const user = await this.getByUsername(username);

    if (!user) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return null;
    }

    // Update last login time
    await this.updateLastLogin(user.user_id);

    // Return user without password
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
};
