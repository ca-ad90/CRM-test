import { getDbConnection } from "./connection.js";
import bcrypt from "bcrypt";

export const usersDb = {
  /**
   * Get all users (admin only function)
   * @returns {Promise<Array>} Array of user objects (without passwords)
   */
  async getAll() {
    const db = await getDbConnection();
    return db.all(`
      SELECT u.user_id, u.username, u.email, u.created_at, u.last_login, 
             r.role_name, r.role_id 
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      ORDER BY u.username
    `);
  },

  /**
   * Get a user by ID
   * @param {number} id - The user ID
   * @returns {Promise<object>} User object (without password)
   */
  async getById(id) {
    const db = await getDbConnection();
    return db.get(`
      SELECT u.user_id, u.username, u.email, u.created_at, u.last_login, 
             r.role_name, r.role_id
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.user_id = ?
    `, id);
  },

  /**
   * Get a user by username
   * @param {string} username - The username
   * @returns {Promise<object>} User object (with password hash for authentication)
   */
  async getByUsername(username) {
    const db = await getDbConnection();
    return db.get(`
      SELECT u.*, r.role_name 
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.username = ?
    `, username);
  },

  /**
   * Get a user by email
   * @param {string} email - The email
   * @returns {Promise<object>} User object (with password hash for authentication)
   */
  async getByEmail(email) {
    const db = await getDbConnection();
    return db.get(`
      SELECT u.*, r.role_name 
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.email = ?
    `, email);
  },

  /**
   * Get user permissions
   * @param {number} userId - The user ID
   * @returns {Promise<Array>} Array of permission names
   */
  async getUserPermissions(userId) {
    const db = await getDbConnection();
    const permissions = await db.all(`
      SELECT permission_name 
      FROM user_permissions
      WHERE user_id = ?
    `, userId);
    
    return permissions.map(p => p.permission_name);
  },

  /**
   * Create a new user
   * @param {object} userData - The user data (username, email, password, role_id)
   * @returns {Promise<object>} The created user with ID (without password)
   */
  async create(userData) {
    const db = await getDbConnection();

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Hash the password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Set default role to 'user' if not specified
      const role_id = userData.role_id || 2;

      const result = await db.run(
        `INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)`,
        [userData.username, userData.email, passwordHash, role_id]
      );

      const userId = result.lastID;

      // Get role name
      const role = await db.get(
        "SELECT role_name FROM roles WHERE role_id = ?",
        role_id
      );

      // Commit transaction
      await db.run('COMMIT');

      return {
        user_id: userId,
        username: userData.username,
        email: userData.email,
        role_id: role_id,
        role_name: role.role_name,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      // Rollback transaction in case of error
      await db.run('ROLLBACK');
      throw error;
    }
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
   * Update a user's role
   * @param {number} id - The user ID
   * @param {number} roleId - The new role ID
   * @returns {Promise<boolean>} Success status
   */
  async updateRole(id, roleId) {
    const db = await getDbConnection();

    const result = await db.run(
      "UPDATE users SET role_id = ? WHERE user_id = ?",
      [roleId, id]
    );

    return result.changes > 0;
  },

  /**
   * Update user profile
   * @param {number} id - The user ID
   * @param {object} userData - The updated user data
   * @returns {Promise<boolean>} Success status
   */
  async updateProfile(id, userData) {
    const db = await getDbConnection();

    const result = await db.run(
      "UPDATE users SET username = ?, email = ? WHERE user_id = ?",
      [userData.username, userData.email, id]
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
    
    // Begin transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Delete all user associations
      await db.run("DELETE FROM user_companies WHERE user_id = ?", id);
      await db.run("DELETE FROM user_contacts WHERE user_id = ?", id);
      await db.run("DELETE FROM user_communications WHERE user_id = ?", id);
      await db.run("DELETE FROM user_meetings WHERE user_id = ?", id);
      
      // Get all user tokens
      const userTokens = await db.all(
        "SELECT token_id FROM user_tokens WHERE user_id = ?",
        id
      );
      
      // Delete user-token associations
      await db.run("DELETE FROM user_tokens WHERE user_id = ?", id);
      
      // Delete tokens
      if (userTokens.length > 0) {
        const tokenIds = userTokens.map(t => t.token_id).join(',');
        await db.run(`DELETE FROM tokens WHERE token_id IN (${tokenIds})`);
      }
      
      // Finally delete the user
      const result = await db.run("DELETE FROM users WHERE user_id = ?", id);
      
      // Commit transaction
      await db.run('COMMIT');
      
      return result.changes > 0;
    } catch (error) {
      // Rollback transaction in case of error
      await db.run('ROLLBACK');
      throw error;
    }
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
  },

  /**
   * Get all available roles
   * @returns {Promise<Array>} Array of role objects
   */
  async getAllRoles() {
    const db = await getDbConnection();
    return db.all("SELECT * FROM roles ORDER BY role_id");
  },
  
  /**
   * Get all permissions for a role
   * @param {number} roleId - The role ID
   * @returns {Promise<Array>} Array of permission objects
   */
  async getRolePermissions(roleId) {
    const db = await getDbConnection();
    return db.all(`
      SELECT p.*
      FROM permissions p
      JOIN role_permissions rp ON p.permission_id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.permission_name
    `, roleId);
  },
  
  /**
   * Get user statistics for admin dashboard
   * @returns {Promise<object>} User statistics
   */
  async getUserStats() {
    const db = await getDbConnection();
    
    const totalUsers = await db.get("SELECT COUNT(*) as count FROM users");
    const activeUsers = await db.get(
      "SELECT COUNT(*) as count FROM users WHERE last_login > datetime('now', '-30 day')"
    );
    const usersByRole = await db.all(`
      SELECT r.role_name, COUNT(u.user_id) as count
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      GROUP BY r.role_name
    `);
    
    return {
      totalUsers: totalUsers.count,
      activeUsers: activeUsers.count,
      usersByRole
    };
  }
};
