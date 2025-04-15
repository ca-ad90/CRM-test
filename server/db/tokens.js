import { getDbConnection } from "./connection.js";
import crypto from "crypto";

export const tokensDb = {
  /**
   * Create a new authentication token
   * @param {number} userId - The user ID
   * @param {number} expiresInHours - Hours until token expiration (default: 24)
   * @returns {Promise<string>} The created token
   */
  async createToken(userId, expiresInHours = 24) {
    const db = await getDbConnection();

    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiration time
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    // Insert the token into the tokens table
    const tokenResult = await db.run(
      `INSERT INTO tokens (token, expires_at) VALUES (?, ?)`,
      [token, expiresAt.toISOString()]
    );

    const tokenId = tokenResult.lastID;

    // Associate token with user
    await db.run(
      `INSERT INTO user_tokens (user_id, token_id) VALUES (?, ?)`,
      [userId, tokenId]
    );

    return token;
  },

  /**
   * Validate a token and get associated user
   * @param {string} token - The token to validate
   * @returns {Promise<object|null>} User object if valid, null otherwise
   */
  async validateToken(token) {
    const db = await getDbConnection();

    // Get token with user information
    const result = await db.get(
      `SELECT t.token_id, t.expires_at, t.is_valid, u.user_id, u.username, u.email
       FROM tokens t
       JOIN user_tokens ut ON t.token_id = ut.token_id
       JOIN users u ON ut.user_id = u.user_id
       WHERE t.token = ? AND t.is_valid = 1`,
      token
    );

    if (!result) {
      return null;
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(result.expires_at);

    if (now > expiresAt) {
      // Invalidate expired token
      await this.invalidateToken(token);
      return null;
    }

    return {
      user_id: result.user_id,
      username: result.username,
      email: result.email
    };
  },

  /**
   * Invalidate a token
   * @param {string} token - The token to invalidate
   * @returns {Promise<boolean>} Success status
   */
  async invalidateToken(token) {
    const db = await getDbConnection();

    const result = await db.run(
      "UPDATE tokens SET is_valid = 0 WHERE token = ?",
      token
    );

    return result.changes > 0;
  },

  /**
   * Invalidate all tokens for a user
   * @param {number} userId - The user ID
   * @returns {Promise<boolean>} Success status
   */
  async invalidateAllUserTokens(userId) {
    const db = await getDbConnection();

    const result = await db.run(
      `UPDATE tokens
       SET is_valid = 0
       WHERE token_id IN (
         SELECT token_id FROM user_tokens WHERE user_id = ?
       )`,
      userId
    );

    return result.changes > 0;
  },

  /**
   * Clean up expired tokens
   * @returns {Promise<number>} Number of deleted tokens
   */
  async cleanupExpiredTokens() {
    const db = await getDbConnection();
    const now = new Date().toISOString();

    const result = await db.run(
      "DELETE FROM tokens WHERE expires_at < ? OR is_valid = 0",
      now
    );

    return result.changes;
  }
};
