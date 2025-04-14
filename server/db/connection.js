import sqlite3 from "sqlite3";
import { open } from "sqlite";
import * as path from 'path';
import { fileURLToPath } from 'url';
// Database connection singleton

global.db = null;
/**
 * Initialize the database connection
 * @returns {Promise<object>} The database connection object
 */
export async function getDbConnection() {
    if (global.db) {
        return global.db;
    }

    // Open the database connection
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbPath = path.join(__dirname, "database.sqlite")
    global.db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    console.log("Database connection established");
    return global.db;
}
export const tables = {
  companies: {
      columns: [
          "company_id",
          "company_name",
          "website",
          "address",
          "phone",
          "email",
      ],
      user: "user_companies",
      id_column: "company_Id",
  },
  contacts: {
      columns: [
          "contact_id",
          "company_id",
          "first_name",
          "last_name",
          "position",
          "email",
          "phone",
          "linkedin_url",
          "notes",
      ],
      user: "user_contacts",
      id_column: "contact_Id",
  },
  communications: {
      columns: [
          "communication_id",
          "contact_id",
          "date_contacted",
          "contact_method",
          "message_content",
          "received_response",
          "response_date",
          "response_content",
      ],
      user: "user_communications",
      id_column: "communication_id",
  },
  meetings: {
      columns: [
          "meeting_id",
          "contact_id",
          "meeting_date",
          "location",
          "meeting_type",
          "meeting_status",
          "meeting_notes",
          "follow_up_needed",
      ],
      user: "user_meetings",
      id_column: "meeting_id",
  },
  users: {
      columns: ["user_id", "username", "last_login"],
      id_column: "user_id",
  },
  user_companies: {
      columns: ["company_id", "user_id", "is_owner"],
  },
  user_contacts: {
      columns: ["contact_id", "user_id", "is_owner"],
  },
  user_meetings: {
      columns: ["meeting_id", "user_id", "is_owner"],
  },
  user_communications: {
      columns: ["communication_id", "user_id", "is_owner"],
  },
};


export const create = async (tableName, data) => {
  const db = await getDbConnection();
  const dataResult = await db.run(
      `INSERT INTO ${tableName}
(${tables[tableName].join(", ")})
VALUES (${tables[tableName].map(() => "?").join(", ")})`,
      [{ ...data }],
  );
  const dataId = dataResult.lastID;

  return {
      contact_id: result.lastID,
      ...contact,
  };
};
export const userAccessTable = async (tableName, dataId, userId, isOwner = 1) => {
  const db = await getDbConnection();
  const idName = tables[tableName].id_column;
  const dataResult = await db.run(
      `INSERT INTO user_${tableName}
      (${tables[`user_${tableName}`].join(", ")})
      VALUES (${tables[tableName].map(() => "?").join(", ")})`,
      [{ user_id: userId, [idName]: dataId, is_owner: isOwner }],
  );
  const dataId = dataResult.lastID;
};
