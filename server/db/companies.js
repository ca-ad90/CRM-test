import { getDbConnection, isUserAdmin, runTransaction } from "./connection.js";
import { logActivity } from "../middleware/auth.js";

export const companiesDb = {
  /**
   * Get all companies (with admin override for full access)
   * @param {number} userId - The user ID
   * @returns {Promise<Array>} Array of company objects
   */
  async getAll(userId) {
    const db = await getDbConnection();
    
    // Check if user is admin - if so, return all companies
    const isAdmin = await isUserAdmin(userId);
    
    if (isAdmin) {
      return db.all(`
        SELECT c.*,
               (SELECT COUNT(*) FROM contacts WHERE company_id = c.company_id) as contacts_count
        FROM companies c
        ORDER BY c.company_name
      `);
    }
    
    // Regular user - only return companies they have access to
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
   * Get a company by ID (with admin override for access)
   * @param {number} id - The company ID
   * @param {number} userId - The user ID
   * @returns {Promise<object>} The company object
   */
  async getById(id, userId) {
    const db = await getDbConnection();
    
    // Check if user is admin
    const isAdmin = await isUserAdmin(userId);
    
    if (isAdmin) {
      return db.get(
        `SELECT c.*
         FROM companies c
         WHERE c.company_id = ?`,
        [id]
      );
    }
    
    // Regular user access check
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
    return await runTransaction(async (db) => {
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

        // Log activity
        await logActivity(
          userId,
          'create',
          'company',
          companyId,
          `Created company: ${company.company_name}`,
          null
        );

        return {
          company_id: companyId,
          ...company
        };
      } catch (error) {
        console.error("Error creating company:", error);
        throw error;
      }
    });
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

    // Check if user has access to this company (admin always has access)
    const hasAccess = await this.checkUserAccess(id, userId);
    if (!hasAccess) {
      return false;
    }

    try {
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

      // Log activity if update was successful
      if (result.changes > 0) {
        await logActivity(
          userId,
          'update',
          'company',
          id,
          `Updated company: ${company.company_name}`,
          null
        );
      }

      return result.changes > 0;
    } catch (error) {
      console.error("Error updating company:", error);
      throw error;
    }
  },

  /**
   * Delete a company
   * @param {number} id - The company ID
   * @param {number} userId - The user ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id, userId) {
    // Check if user has access to this company
    const hasAccess = await this.checkUserAccess(id, userId);
    if (!hasAccess) {
      return false;
    }

    return await runTransaction(async (db) => {
      try {
        // Get company info for activity log
        const company = await this.getById(id, userId);

        // If admin, perform direct delete
        const isAdmin = await isUserAdmin(userId);
        if (isAdmin) {
          // Delete all user-company associations
          await db.run("DELETE FROM user_companies WHERE company_id = ?", id);
          
          // Delete the company
          const result = await db.run("DELETE FROM companies WHERE company_id = ?", id);
          
          // Log activity
          if (result.changes > 0 && company) {
            await logActivity(
              userId,
              'delete',
              'company',
              id,
              `Admin deleted company: ${company.company_name}`,
              null
            );
          }
          
          return result.changes > 0;
        }
        
        // For regular users, check if they're the owner
        const isOwner = await db.get(
          "SELECT 1 FROM user_companies WHERE company_id = ? AND user_id = ? AND is_owner = 1",
          [id, userId]
        );
        
        if (!isOwner) {
          // Regular users can only remove their association if they're not owners
          const result = await db.run(
            "DELETE FROM user_companies WHERE company_id = ? AND user_id = ?",
            [id, userId]
          );
          
          // Log activity
          if (result.changes > 0 && company) {
            await logActivity(
              userId,
              'remove-access',
              'company',
              id,
              `Removed access to company: ${company.company_name}`,
              null
            );
          }
          
          return result.changes > 0;
        }

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

        // Log activity
        if (company) {
          await logActivity(
            userId,
            'delete',
            'company',
            id,
            `Deleted company: ${company.company_name}`,
            null
          );
        }

        return true;
      } catch (error) {
        console.error("Error deleting company:", error);
        throw error;
      }
    });
  },

  /**
   * Check if user has access to a company (admins always have access)
   * @param {number} companyId - The company ID
   * @param {number} userId - The user ID
   * @returns {Promise<boolean>} Whether user has access
   */
  async checkUserAccess(companyId, userId) {
    const db = await getDbConnection();
    
    // Admins always have access
    const isAdmin = await isUserAdmin(userId);
    if (isAdmin) {
      return true;
    }
    
    // Regular user access check
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
    
    // Check if owner has access to this company (or is admin)
    const hasAccess = await this.checkUserAccess(companyId, ownerId);
    if (!hasAccess) {
      return false;
    }
    
    // Regular users can only share if they are owners
    const isAdmin = await isUserAdmin(ownerId);
    if (!isAdmin) {
      const isActualOwner = await db.get(
        "SELECT 1 FROM user_companies WHERE company_id = ? AND user_id = ? AND is_owner = 1",
        [companyId, ownerId]
      );
      
      if (!isActualOwner) {
        return false;
      }
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
    
    // Log the sharing activity
    if (result.changes > 0) {
      // Get company and user info for better logging
      const [company, targetUser] = await Promise.all([
        db.get("SELECT company_name FROM companies WHERE company_id = ?", companyId),
        db.get("SELECT username FROM users WHERE user_id = ?", targetUserId)
      ]);
      
      await logActivity(
        ownerId,
        'share',
        'company',
        companyId,
        `Shared company "${company?.company_name}" with user ${targetUser?.username}`,
        null
      );
    }
    
    return result.changes > 0;
  },
  
  /**
   * Get stats about companies for dashboard
   * @param {number} userId - The user ID 
   * @returns {Promise<object>} Company statistics
   */
  async getStats(userId) {
    const db = await getDbConnection();
    const isAdmin = await isUserAdmin(userId);
    
    let query = `
      SELECT 
        COUNT(*) AS total,
        COUNT(CASE WHEN c.created_at > datetime('now', '-30 days') THEN 1 END) AS recent
    `;
    
    if (isAdmin) {
      query += " FROM companies c";
    } else {
      query += `
        FROM companies c
        JOIN user_companies uc ON c.company_id = uc.company_id
        WHERE uc.user_id = ?
      `;
    }
    
    const params = isAdmin ? [] : [userId];
    const stats = await db.get(query, params);
    
    return {
      total: stats.total,
      recent: stats.recent
    };
  }
};
