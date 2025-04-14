// db/userPermissionsHelper.js - Helper functions to update database operations for user permissions

import { getDbConnection } from './connection.js';
import { companiesDb } from './companies.js';
import { contactsDb } from './contacts.js';
import { communicationsDb } from './communications.js';
import { meetingsDb } from './meetings.js';
import { dashboardDb } from './dashboard.js';
import { searchDb } from './search.js';
import { userPermissionsDb } from './permissions.js';

/**
 * When creating new resources, associate them with the creator
 */
export const updateCreationOperations = () => {
  // Modify company creation
  const originalCompanyCreate = companiesDb.create;
  companiesDb.create = async function(company, userId) {
    const db = await getDbConnection();

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create the company
      const result = await originalCompanyCreate.call(this, company);
      const companyId = result.company_id;

      // If userId is provided, add user as owner
      if (userId) {
        await db.run(
          "INSERT INTO user_companies (company_id, user_id, is_owner) VALUES (?, ?, 1)",
          [companyId, userId]
        );
      }

      // Commit transaction
      await db.run('COMMIT');

      return result;
    } catch (error) {
      // Rollback on error
      await db.run('ROLLBACK');
      console.error('Error creating company:', error);
      throw error;
    }
  };

  // Modify contact creation
  const originalContactCreate = contactsDb.create;
  contactsDb.create = async function(contact, userId) {
    const db = await getDbConnection();

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create the contact
      const result = await originalContactCreate.call(this, contact);
      const contactId = result.contact_id;

      // If userId is provided, add user as owner
      if (userId) {
        await db.run(
          "INSERT INTO user_contacts (contact_id, user_id, is_owner) VALUES (?, ?, 1)",
          [contactId, userId]
        );

        // If this contact belongs to a company, ensure user has access to it
        if (contact.company_id) {
          const companyAccess = await db.get(
            "SELECT 1 FROM user_companies WHERE company_id = ? AND user_id = ?",
            [contact.company_id, userId]
          );

          if (!companyAccess) {
            await db.run(
              "INSERT INTO user_companies (company_id, user_id, is_owner) VALUES (?, ?, 0)",
              [contact.company_id, userId]
            );
          }
        }
      }

      // Commit transaction
      await db.run('COMMIT');

      return result;
    } catch (error) {
      // Rollback on error
      await db.run('ROLLBACK');
      console.error('Error creating contact:', error);
      throw error;
    }
  };

  // Modify meeting creation
  const originalMeetingCreate = meetingsDb.create;
  meetingsDb.create = async function(meeting, userId) {
    const db = await getDbConnection();

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create the meeting
      const result = await originalMeetingCreate.call(this, meeting);
      const meetingId = result.meeting_id;

      // If userId is provided, add user as owner
      if (userId) {
        await db.run(
          "INSERT INTO user_meetings (meeting_id, user_id, is_owner) VALUES (?, ?, 1)",
          [meetingId, userId]
        );

        // Ensure user has access to the contact involved in this meeting
        const contactAccess = await db.get(
          "SELECT 1 FROM user_contacts WHERE contact_id = ? AND user_id = ?",
          [meeting.contact_id, userId]
        );

        if (!contactAccess) {
          await db.run(
            "INSERT INTO user_contacts (contact_id, user_id, is_owner) VALUES (?, ?, 0)",
            [meeting.contact_id, userId]
          );

          // Get company_id for the contact if any
          const contact = await db.get(
            "SELECT company_id FROM contacts WHERE contact_id = ?",
            [meeting.contact_id]
          );

          // If contact belongs to a company, ensure user has access
          if (contact && contact.company_id) {
            const companyAccess = await db.get(
              "SELECT 1 FROM user_companies WHERE company_id = ? AND user_id = ?",
              [contact.company_id, userId]
            );

            if (!companyAccess) {
              await db.run(
                "INSERT INTO user_companies (company_id, user_id, is_owner) VALUES (?, ?, 0)",
                [contact.company_id, userId]
              );
            }
          }
        }
      }

      // Commit transaction
      await db.run('COMMIT');

      return result;
    } catch (error) {
      // Rollback on error
      await db.run('ROLLBACK');
      console.error('Error creating meeting:', error);
      throw error;
    }
  };

  // Modify communication creation
  const originalCommunicationCreate = communicationsDb.create;
  communicationsDb.create = async function(communication, userId) {
    const db = await getDbConnection();

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create the communication
      const result = await originalCommunicationCreate.call(this, communication);
      const communicationId = result.communication_id;

      // If userId is provided, add user as owner
      if (userId) {
        await db.run(
          "INSERT INTO user_communications (communication_id, user_id, is_owner) VALUES (?, ?, 1)",
          [communicationId, userId]
        );

        // Ensure user has access to the contact involved in this communication
        const contactAccess = await db.get(
          "SELECT 1 FROM user_contacts WHERE contact_id = ? AND user_id = ?",
          [communication.contact_id, userId]
        );

        if (!contactAccess) {
          await db.run(
            "INSERT INTO user_contacts (contact_id, user_id, is_owner) VALUES (?, ?, 0)",
            [communication.contact_id, userId]
          );

          // Get company_id for the contact if any
          const contact = await db.get(
            "SELECT company_id FROM contacts WHERE contact_id = ?",
            [communication.contact_id]
          );

          // If contact belongs to a company, ensure user has access
          if (contact && contact.company_id) {
            const companyAccess = await db.get(
              "SELECT 1 FROM user_companies WHERE company_id = ? AND user_id = ?",
              [contact.company_id, userId]
            );

            if (!companyAccess) {
              await db.run(
                "INSERT INTO user_companies (company_id, user_id, is_owner) VALUES (?, ?, 0)",
                [contact.company_id, userId]
              );
            }
          }
        }
      }

      // Commit transaction
      await db.run('COMMIT');

      return result;
    } catch (error) {
      // Rollback on error
      await db.run('ROLLBACK');
      console.error('Error creating communication:', error);
      throw error;
    }
  };
};

/**
 * Update get operations to respect user permissions
 */
export const updateGetOperations = () => {
  // Modify company retrieval
  const originalCompanyGetAll = companiesDb.getAll;
  companiesDb.getAll = async function(userId) {
    if (!userId) {
      return originalCompanyGetAll.call(this);
    }

    const db = await getDbConnection();
    return db.all(`
      SELECT c.*, (uc.is_owner = 1) as is_owner
      FROM companies c
      JOIN user_companies uc ON c.company_id = uc.company_id
      WHERE uc.user_id = ?
      ORDER BY c.company_name
    `, userId);
  };

  const originalCompanyGetById = companiesDb.getById;
  companiesDb.getById = async function(id, userId) {
    if (!userId) {
      return originalCompanyGetById.call(this, id);
    }

    const db = await getDbConnection();
    return db.get(`
      SELECT c.*, (uc.is_owner = 1) as is_owner
      FROM companies c
      JOIN user_companies uc ON c.company_id = uc.company_id
      WHERE c.company_id = ? AND uc.user_id = ?
    `, [id, userId]);
  };

  // Modify contact retrieval
  const originalContactGetAll = contactsDb.getAll;
  contactsDb.getAll = async function(userId) {
    if (!userId) {
      return originalContactGetAll.call(this);
    }

    const db = await getDbConnection();
    return db.all(`
      SELECT c.*, co.company_name, (uc.is_owner = 1) as is_owner
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.company_id
      JOIN user_contacts uc ON c.contact_id = uc.contact_id
      WHERE uc.user_id = ?
      ORDER BY c.last_name, c.first_name
    `, userId);
  };

  const originalContactGetById = contactsDb.getById;
  contactsDb.getById = async function(id, userId) {
    if (!userId) {
      return originalContactGetById.call(this, id);
    }

    const db = await getDbConnection();
    return db.get(`
      SELECT c.*, co.company_name, (uc.is_owner = 1) as is_owner
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.company_id
      JOIN user_contacts uc ON c.contact_id = uc.contact_id
      WHERE c.contact_id = ? AND uc.user_id = ?
    `, [id, userId]);
  };

  const originalContactGetByCompanyId = contactsDb.getByCompanyId;
  contactsDb.getByCompanyId = async function(companyId, userId) {
    if (!userId) {
      return originalContactGetByCompanyId.call(this, companyId);
    }

    const db = await getDbConnection();
    return db.all(`
      SELECT c.*, (uc.is_owner = 1) as is_owner
      FROM contacts c
      JOIN user_contacts uc ON c.contact_id = uc.contact_id
      WHERE c.company_id = ? AND uc.user_id = ?
      ORDER BY c.last_name, c.first_name
    `, [companyId, userId]);
  };

  // Modify meeting retrieval
  const originalMeetingGetAll = meetingsDb.getAll;
  meetingsDb.getAll = async function(userId) {
    if (!userId) {
      return originalMeetingGetAll.call(this);
    }

    const db = await getDbConnection();
    return db.all(`
      SELECT m.*, c.first_name, c.last_name, co.company_name, (um.is_owner = 1) as is_owner
      FROM meetings m
      JOIN contacts c ON m.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      JOIN user_meetings um ON m.meeting_id = um.meeting_id
      WHERE um.user_id = ?
      ORDER BY m.meeting_date DESC
    `, userId);
  };

  const originalMeetingGetById = meetingsDb.getById;
  meetingsDb.getById = async function(id, userId) {
    if (!userId) {
      return originalMeetingGetById.call(this, id);
    }

    const db = await getDbConnection();
    return db.get(`
      SELECT m.*, c.first_name, c.last_name, co.company_name, (um.is_owner = 1) as is_owner
      FROM meetings m
      JOIN contacts c ON m.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      JOIN user_meetings um ON m.meeting_id = um.meeting_id
      WHERE m.meeting_id = ? AND um.user_id = ?
    `, [id, userId]);
  };

  const originalMeetingGetByContactId = meetingsDb.getByContactId;
  meetingsDb.getByContactId = async function(contactId, userId) {
    if (!userId) {
      return originalMeetingGetByContactId.call(this, contactId);
    }

    const db = await getDbConnection();
    return db.all(`
      SELECT m.*, (um.is_owner = 1) as is_owner
      FROM meetings m
      JOIN user_meetings um ON m.meeting_id = um.meeting_id
      WHERE m.contact_id = ? AND um.user_id = ?
      ORDER BY m.meeting_date DESC
    `, [contactId, userId]);
  };

  // Modify communication retrieval
  const originalCommunicationGetByContactId = communicationsDb.getByContactId;
  communicationsDb.getByContactId = async function(contactId, userId) {
    if (!userId) {
      return originalCommunicationGetByContactId.call(this, contactId);
    }

    const db = await getDbConnection();
    return db.all(`
      SELECT com.*, (uc.is_owner = 1) as is_owner
      FROM communications com
      JOIN user_communications uc ON com.communication_id = uc.communication_id
      WHERE com.contact_id = ? AND uc.user_id = ?
      ORDER BY com.date_contacted DESC
    `, [contactId, userId]);
  };

  const originalCommunicationGetById = communicationsDb.getById;
  communicationsDb.getById = async function(id, userId) {
    if (!userId) {
      return originalCommunicationGetById.call(this, id);
    }

    const db = await getDbConnection();
    return db.get(`
      SELECT com.*, (uc.is_owner = 1) as is_owner
      FROM communications com
      JOIN user_communications uc ON com.communication_id = uc.communication_id
      WHERE com.communication_id = ? AND uc.user_id = ?
    `, [id, userId]);
  };

  // Update upcoming meetings to respect permissions
  const originalGetUpcoming = meetingsDb.getUpcoming;
  meetingsDb.getUpcoming = async function(limit = 10, userId) {
    if (!userId) {
      return originalGetUpcoming.call(this, limit);
    }

    const db = await getDbConnection();
    const now = new Date().toISOString();
    return db.all(`
      SELECT m.*, c.first_name, c.last_name, co.company_name
      FROM meetings m
      JOIN contacts c ON m.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      JOIN user_meetings um ON m.meeting_id = um.meeting_id
      WHERE m.meeting_date > ? AND m.meeting_status != 'cancelled' AND um.user_id = ?
      ORDER BY m.meeting_date ASC
      LIMIT ?
    `, [now, userId, limit]);
  };
};

/**
 * Update delete operations to check ownership
 */
export const updateDeleteOperations = () => {
  // Modify company deletion
  const originalCompanyDelete = companiesDb.delete;
  companiesDb.delete = async function(id, userId) {
    if (!userId) {
      return originalCompanyDelete.call(this, id);
    }

    const db = await getDbConnection();

    // Check if user is the owner
    const isOwner = await db.get(
      "SELECT 1 FROM user_companies WHERE company_id = ? AND user_id = ? AND is_owner = 1",
      [id, userId]
    );

    if (!isOwner) {
      return false; // Not authorized to delete
    }

    return originalCompanyDelete.call(this, id);
  };

  // Modify contact deletion
  const originalContactDelete = contactsDb.delete;
  contactsDb.delete = async function(id, userId) {
    if (!userId) {
      return originalContactDelete.call(this, id);
    }

    const db = await getDbConnection();

    // Check if user is the owner
    const isOwner = await db.get(
      "SELECT 1 FROM user_contacts WHERE contact_id = ? AND user_id = ? AND is_owner = 1",
      [id, userId]
    );

    if (!isOwner) {
      return false; // Not authorized to delete
    }

    return originalContactDelete.call(this, id);
  };

  // Modify meeting deletion
  const originalMeetingDelete = meetingsDb.delete;
  meetingsDb.delete = async function(id, userId) {
    if (!userId) {
      return originalMeetingDelete.call(this, id);
    }

    const db = await getDbConnection();

    // Check if user is the owner
    const isOwner = await db.get(
      "SELECT 1 FROM user_meetings WHERE meeting_id = ? AND user_id = ? AND is_owner = 1",
      [id, userId]
    );

    if (!isOwner) {
      return false; // Not authorized to delete
    }

    return originalMeetingDelete.call(this, id);
  };

  // Modify communication deletion
  const originalCommunicationDelete = communicationsDb.delete;
  communicationsDb.delete = async function(id, userId) {
    if (!userId) {
      return originalCommunicationDelete.call(this, id);
    }

    const db = await getDbConnection();

    // Check if user is the owner
    const isOwner = await db.get(
      "SELECT 1 FROM user_communications WHERE communication_id = ? AND user_id = ? AND is_owner = 1",
      [id, userId]
    );

    if (!isOwner) {
      return false; // Not authorized to delete
    }

    return originalCommunicationDelete.call(this, id);
  };
};

/**
 * Update dashboard data to respect user permissions
 */
export const updateDashboardOperations = () => {
  const originalGetStats = dashboardDb.getStats;
  dashboardDb.getStats = async function(userId) {
    if (!userId) {
      return originalGetStats.call(this);
    }

    const db = await getDbConnection();

    // Get counts of resources accessible to the user
    const companiesCount = await db.get(
      "SELECT COUNT(*) as count FROM user_companies WHERE user_id = ?",
      userId
    );

    const contactsCount = await db.get(
      "SELECT COUNT(*) as count FROM user_contacts WHERE user_id = ?",
      userId
    );

    const communicationsCount = await db.get(
      "SELECT COUNT(*) as count FROM user_communications WHERE user_id = ?",
      userId
    );

    const meetingsCount = await db.get(
      "SELECT COUNT(*) as count FROM user_meetings WHERE user_id = ?",
      userId
    );

    // Get upcoming meetings count
    const now = new Date().toISOString();
    const upcomingMeetingsCount = await db.get(
      `SELECT COUNT(*) as count
       FROM meetings m
       JOIN user_meetings um ON m.meeting_id = um.meeting_id
       WHERE um.user_id = ? AND m.meeting_date > ? AND m.meeting_status != 'cancelled'`,
      [userId, now]
    );

    // Get pending follow-ups count
    const pendingFollowUpsCount = await db.get(
      `SELECT COUNT(*) as count
       FROM meetings m
       JOIN user_meetings um ON m.meeting_id = um.meeting_id
       WHERE um.user_id = ? AND m.follow_up_needed = 1`,
      userId
    );

    return {
      companiesCount: companiesCount.count,
      contactsCount: contactsCount.count,
      communicationsCount: communicationsCount.count,
      meetingsCount: meetingsCount.count,
      upcomingMeetingsCount: upcomingMeetingsCount.count,
      pendingFollowUpsCount: pendingFollowUpsCount.count,
    };
  };

  const originalGetRecentActivities = dashboardDb.getRecentActivities;
  dashboardDb.getRecentActivities = async function(limit = 10, userId) {
    if (!userId) {
      return originalGetRecentActivities.call(this, limit);
    }

    const db = await getDbConnection();

    // Get recent communications accessible to the user
    const recentCommunications = await db.all(
      `SELECT
        'communication' as type,
        com.communication_id as id,
        com.date_contacted as date,
        c.first_name || ' ' || c.last_name as contact_name,
        c.contact_id,
        co.company_name,
        co.company_id,
        com.contact_method as description
      FROM communications com
      JOIN contacts c ON com.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      JOIN user_communications uc ON com.communication_id = uc.communication_id
      WHERE uc.user_id = ?
      ORDER BY com.date_contacted DESC
      LIMIT ?`,
      [userId, limit]
    );

    // Get recent meetings accessible to the user
    const recentMeetings = await db.all(
      `SELECT
        'meeting' as type,
        m.meeting_id as id,
        m.meeting_date as date,
        c.first_name || ' ' || c.last_name as contact_name,
        c.contact_id,
        co.company_name,
        co.company_id,
        m.meeting_type || ' meeting - ' || m.meeting_status as description
      FROM meetings m
      JOIN contacts c ON m.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      JOIN user_meetings um ON m.meeting_id = um.meeting_id
      WHERE um.user_id = ?
      ORDER BY m.meeting_date DESC
      LIMIT ?`,
      [userId, limit]
    );

    // Combine and sort by date
    const activities = [...recentCommunications, ...recentMeetings];
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Return limited number of activities
    return activities.slice(0, limit);
  };
};

/**
 * Update search to respect user permissions
 */
export const updateSearchOperations = () => {
  const originalSearch = searchDb.search;
  searchDb.search = async function(query, userId) {
    if (!userId) {
      return originalSearch.call(this, query);
    }

    if (!query || query.trim() === "") {
      return {
        companies: [],
        contacts: [],
      };
    }

    const searchTerm = `%${query.trim()}%`;
    const db = await getDbConnection();

    // Search companies accessible to the user
    const companies = await db.all(
      `SELECT c.*
       FROM companies c
       JOIN user_companies uc ON c.company_id = uc.company_id
       WHERE uc.user_id = ? AND
             (c.company_name LIKE ? OR c.website LIKE ? OR c.address LIKE ?)
       ORDER BY c.company_name
       LIMIT 20`,
      [userId, searchTerm, searchTerm, searchTerm]
    );

    // Search contacts accessible to the user
    const contacts = await db.all(
      `SELECT c.*, co.company_name
       FROM contacts c
       LEFT JOIN companies co ON c.company_id = co.company_id
       JOIN user_contacts uc ON c.contact_id = uc.contact_id
       WHERE uc.user_id = ? AND
             (c.first_name LIKE ? OR c.last_name LIKE ? OR
              c.email LIKE ? OR c.position LIKE ? OR
              c.first_name || ' ' || c.last_name LIKE ?)
       ORDER BY c.last_name, c.first_name
       LIMIT 20`,
      [userId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
    );

    return {
      companies,
      contacts,
    };
  };
};

/**
 * Update filtered companies and contacts to respect user permissions
 */
export const getFilteredCompanies = async (status, userId) => {
  const db = await getDbConnection();

  if (!userId) {
    // Use the original function if no userId provided
    const { getFilteredCompanies } = await import('./companies.js');
    return getFilteredCompanies(status);
  }

  if (status === 'contacted') {
    // Get companies that have been contacted and that the user has access to
    return db.all(`
      SELECT DISTINCT c.*
      FROM companies c
      INNER JOIN contacts ct ON c.company_id = ct.company_id
      INNER JOIN communications com ON ct.contact_id = com.contact_id
      INNER JOIN user_companies uc ON c.company_id = uc.company_id
      WHERE uc.user_id = ?
      ORDER BY c.company_name
    `, userId);
  } else if (status === 'not-contacted') {
    // Get companies that have not been contacted and that the user has access to
    return db.all(`
      SELECT DISTINCT c.*
      FROM companies c
      INNER JOIN contacts ct ON c.company_id = ct.company_id
      INNER JOIN user_companies uc ON c.company_id = uc.company_id
      WHERE uc.user_id = ? AND ct.contact_id NOT IN (
        SELECT DISTINCT contact_id
        FROM communications
      )
      ORDER BY c.company_name
    `, userId);
  } else if (status === 'no-contacts') {
    // Get companies that have no contacts and that the user has access to
    return db.all(`
      SELECT c.*
      FROM companies c
      INNER JOIN user_companies uc ON c.company_id = uc.company_id
      WHERE uc.user_id = ? AND c.company_id NOT IN (
        SELECT DISTINCT company_id
        FROM contacts
      )
      ORDER BY c.company_name
    `, userId);
  } else {
    // Default to all companies the user has access to
    return db.all(`
      SELECT c.*
      FROM companies c
      INNER JOIN user_companies uc ON c.company_id = uc.company_id
      WHERE uc.user_id = ?
      ORDER BY c.company_name
    `, userId);
  }
};

export const getFilteredContacts = async (status, userId) => {
  const db = await getDbConnection();

  if (!userId) {
    // Use the original function if no userId provided
    const { getFilteredContacts } = await import('./contacts.js');
    return getFilteredContacts(status);
  }

  if (status === 'contacted') {
    // Get contacts that have been contacted and that the user has access to
    return db.all(`
      SELECT DISTINCT c.*, co.company_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.company_id
      INNER JOIN communications com ON c.contact_id = com.contact_id
      INNER JOIN user_contacts uc ON c.contact_id = uc.contact_id
      WHERE uc.user_id = ?
      ORDER BY c.last_name, c.first_name
    `, userId);
  } else if (status === 'not-contacted') {
    // Get contacts that have not been contacted and that the user has access to
    return db.all(`
      SELECT c.*, co.company_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.company_id
      INNER JOIN user_contacts uc ON c.contact_id = uc.contact_id
      WHERE uc.user_id = ? AND c.contact_id NOT IN (
        SELECT DISTINCT com.contact_id
        FROM communications com
      )
      ORDER BY c.last_name, c.first_name
    `, userId);
  } else if (status === 'called') {
    // Get contacts that have been called and that the user has access to
    return db.all(`
      SELECT DISTINCT c.*, co.company_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.company_id
      INNER JOIN communications com ON c.contact_id = com.contact_id
      INNER JOIN user_contacts uc ON c.contact_id = uc.contact_id
      WHERE uc.user_id = ? AND com.contact_method = 'phone' AND com.received_response = 1
      ORDER BY c.last_name, c.first_name
    `, userId);
  } else if (status === 'emailed') {
    // Get contacts that have been emailed and that the user has access to
    return db.all(`
      SELECT DISTINCT c.*, co.company_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.company_id
      INNER JOIN communications com ON c.contact_id = com.contact_id
      INNER JOIN user_contacts uc ON c.contact_id = uc.contact_id
      WHERE uc.user_id = ? AND com.contact_method = 'email'
      ORDER BY c.last_name, c.first_name
    `, userId);
  } else {
    // Default to all contacts the user has access to
    return db.all(`
      SELECT c.*, co.company_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.company_id
      INNER JOIN user_contacts uc ON c.contact_id = uc.contact_id
      WHERE uc.user_id = ?
      ORDER BY c.last_name, c.first_name
    `, userId);
  }
};

/**
 * Initialize all permission updates
 */
export const initializeUserPermissions = () => {
  updateCreationOperations();
  updateGetOperations();
  updateDeleteOperations();
  updateDashboardOperations();
  updateSearchOperations();

  console.log("User permissions initialized");
};
* When creating new resources, associate them with the creator
 */
export const updateCreationOperations = () => {
  // Modify company creation
  const originalCompanyCreate = companiesDb.create;
  companiesDb.create = async function(company, userId) {
    const db = await getDbConnection();

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create the company
      const result = await originalCompanyCreate.call(this, company);
      const companyId = result.company_id;

      // If userId is provided, add user as owner
      if (userId) {
        await db.run(
          "INSERT INTO user_companies (company_id, user_id, is_owner) VALUES (?, ?, 1)",
          [companyId, userId]
        );
      }

      // Commit transaction
      await db.run('COMMIT');

      return result;
    } catch (error) {
      // Rollback on error
      await db.run('ROLLBACK');
      console.error('Error creating company:', error);
      throw error;
    }
  };

  // Modify contact creation
  const originalContactCreate = contactsDb.create;
  contactsDb.create = async function(contact, userId) {
    const db = await getDbConnection();

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create the contact
      const result = await originalContactCreate.call(this, contact);
      const contactId = result.contact_id;

      // If userId is provided, add user as owner
      if (userId) {
        await db.run(
          "INSERT INTO user_contacts (contact_id, user_id, is_owner) VALUES (?, ?, 1)",
          [contactId, userId]
        );

        // If this contact belongs to a company, ensure user has access to it
        if (contact.company_id) {
          const companyAccess = await db.get(
            "SELECT 1 FROM user_companies WHERE company_id = ? AND user_id = ?",
            [contact.company_id, userId]
          );

          if (!companyAccess) {
            await db.run(
              "INSERT INTO user_companies (company_id, user_id, is_owner) VALUES (?, ?, 0)",
              [contact.company_id, userId]
            );
          }
        }
      }

      // Commit transaction
      await db.run('COMMIT');

      return result;
    } catch (error) {
      // Rollback on error
      await db.run('ROLLBACK');
      console.error('Error creating contact:', error);
      throw error;
    }
  };

  // Modify meeting creation
  const originalMeetingCreate = meetingsDb.create;
  meetingsDb.create = async function(meeting, userId) {
    const db = await getDbConnection();

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create the meeting
      const result = await originalMeetingCreate.call(this, meeting);
      const meetingId = result.meeting_id;

      // If userId is provided, add user as owner
      if (userId) {
        await db.run(
          "INSERT INTO user_meetings (meeting_id, user_id, is_owner) VALUES (?, ?, 1)",
          [meetingId, userId]
        );

        // Ensure user has access to the contact involved in this meeting
        const contactAccess = await db.get(
          "SELECT 1 FROM user_contacts WHERE contact_id = ? AND user_id = ?",
          [meeting.contact_id, userId]
        );

        if (!contactAccess) {
          await db.run(
            "INSERT INTO user_contacts (contact_id, user_id, is_owner) VALUES (?, ?, 0)",
            [meeting.contact_id, userId]
          );

          // Get company_id for the contact if any
          const contact = await db.get(
            "SELECT company_id FROM contacts WHERE contact_id = ?",
            [meeting.contact_id]
          );

          // If contact belongs to a company, ensure user has access
          if (contact && contact.company_id) {
            const companyAccess = await db.get(
              "SELECT 1 FROM user_companies WHERE company_id = ? AND user_id = ?",
              [contact.company_id, userId]
            );

            if (!companyAccess) {
              await db.run(
                "INSERT INTO user_companies (company_id, user_id, is_owner) VALUES (?, ?, 0)",
                [contact.company_id, userId]
              );
            }
          }
        }
      }

      // Commit transaction
      await db.run('COMMIT');

      return result;
    } catch (error) {
      // Rollback on error
      await db.run('ROLLBACK');
      console.error('Error creating meeting:', error);
      throw error;
    }
  };

  // Modify communication creation
  const originalCommunicationCreate = communicationsDb.create;
  communicationsDb.create = async function(communication, userId) {
    const db = await getDbConnection();

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create the communication
      const result = await originalCommunicationCreate.call(this, communication);
      const communicationId = result.communication_i
