import { getDbConnection } from "./connection.js";

export const companiesDb = {
  /**
   * Get all companies for a user
   * @param {number} userId - The user ID
   * @returns {Promise<Array>} Array of company objects
   */
  async getAll(userId) {
    const db = await getDbConnection();
    return db.all(
      `SELECT c.*
       FROM companies c
       JOIN user_companies uc ON c.company_id = uc.company_id
       WHERE uc.user_id = ?
       ORDER BY c.company_name`,
      userId
    );
  },

  /**
   * Get a company by ID (for a specific user)
   * @param {number} id - The company ID
   * @param {number} userId - The user ID
   * @returns {Promise<object>} The company object
   */
  async getById(id, userId) {
    const db = await getDbConnection();
    return db.get(
      `SELECT c.*
       FROM companies c
       JOIN user_companies uc ON c.company_id = uc.company_id
       WHERE c.company_id = ? AND uc.user_id = ?`,
      [id, userId]
    );
  },

  /**
   * Create a new company
   * @param {object} company - The company data
   * @param {number} userId - The user ID
   * @returns {Promise<object>} The created company with ID
   */
  async create(company, userId) {
    const db = await getDbConnection();

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Insert into companies table
      const result = await db.run(
        "INSERT INTO companies (company_name, website, address, phone, email) VALUES (?, ?, ?, ?, ?)",
        [
          company.company_name,
          company.website,
          company.address,
          company.phone,
          company.email
        ]
      );

      const companyId = result.lastID;

      // Associate company with user
      await db.run(
        "INSERT INTO user_companies (user_id, company_id, is_owner) VALUES (?, ?, 1)",
        [userId, companyId]
      );

      // Commit transaction
      await db.run('COMMIT');

      return {
        company_id: companyId,
        ...company
      };
    } catch (error) {
      // Rollback transaction in case of error
      await db.run('ROLLBACK');
      throw error;
    }
  },

  /**
   * Update a company
   * @param {number} id - The company ID
   * @param {object} company - The updated company data
   * @param {number} userId - The user ID
   * @returns {Promise<boolean>} Success status
   */
  async update(id, company, userId) {
    const db = await getDbConnection();

    // Check if user has access to this company
    const hasAccess = await this.checkUserAccess(id, userId);
    if (!hasAccess) {
      return false;
    }

    const result = await db.run(
      "UPDATE companies SET company_name = ?, website = ?, address = ?, phone = ?, email = ? WHERE company_id = ?",
      [
        company.company_name,
        company.website,
        company.address,
        company.phone,
        company.email,
        id
      ]
    );

    return result.changes > 0;
  },

  /**
   * Delete a company
   * @param {number} id - The company ID
   * @param {number} userId - The user ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id, userId) {
    const db = await getDbConnection();

    // Check if user has access to this company
    const hasAccess = await this.checkUserAccess(id, userId);
    if (!hasAccess) {
      return false;
    }

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Remove user-company association
      await db.run(
        "DELETE FROM user_companies WHERE company_id = ? AND user_id = ?",
        [id, userId]
      );

      // Check if other users have access to this company
      const otherUsersHaveAccess = await db.get(
        "SELECT 1 FROM user_companies WHERE company_id = ? LIMIT 1",
        id
      );

      // If no other users have access, delete the company
      if (!otherUsersHaveAccess) {
        await db.run(
          "DELETE FROM companies WHERE company_id = ?",
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
   * Check if user has access to a company
   * @param {number} companyId - The company ID
   * @param {number} userId - The user ID
   * @returns {Promise<boolean>} Whether user has access
   */
  async checkUserAccess(companyId, userId) {
    const db = await getDbConnection();
    const result = await db.get(
      "SELECT 1 FROM user_companies WHERE company_id = ? AND user_id = ?",
      [companyId, userId]
    );
    return !!result;
  },

  /**
   * Share a company with another user
   * @param {number} companyId - The company ID
   * @param {number} ownerId - The current owner's user ID
   * @param {number} targetUserId - The user ID to share with
   * @param {boolean} isOwner - Whether the target user should be an owner
   * @returns {Promise<boolean>} Success status
   */
  async shareCompany(companyId, ownerId, targetUserId, isOwner = false) {
    const db = await getDbConnection();

    // Check if owner has access to this company
    const hasAccess = await this.checkUserAccess(companyId, ownerId);
    if (!hasAccess) {
      return false;
    }

    // Check if target user already has access
    const targetHasAccess = await this.checkUserAccess(companyId, targetUserId);
    if (targetHasAccess) {
      // Update owner status if needed
      if (isOwner) {
        await db.run(
          "UPDATE user_companies SET is_owner = 1 WHERE company_id = ? AND user_id = ?",
          [companyId, targetUserId]
        );
      }
      return true;
    }

    // Add access for target user
    const result = await db.run(
      "INSERT INTO user_companies (user_id, company_id, is_owner) VALUES (?, ?, ?)",
      [targetUserId, companyId, isOwner ? 1 : 0]
    );

    return result.changes > 0;
  }
};
