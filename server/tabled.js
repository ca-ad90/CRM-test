let tables = {
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


const create = async (tableName, data) => {
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
const userAccessTable = async (tableName, dataId, userId, isOwner = 1) => {
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
const getAll = async (tableName) =>  {
    const db = await getDbConnection();
    return db.all(
    `SELECT c.* FROM ${tableName} c
    INNER JOIN user_${tableName} uc ON c.${tables[tableName].id_column} = uc.${tables[tableName].id_column}
    WHERE uc.user_id = ? ORDER BY c.${tables[tableName].id_column}`);
let userID= req.id

}
@echo off
REM Batch script to create necessary .js files in the server/db directory

echo Creating directory structure: server\db ...
REM Create the directory if it doesn't exist. Suppress error if it already exists.
mkdir server\db 2>nul

echo Creating JavaScript files in server\db ...

REM Use 'type nul >' to create empty files
type nul > server\db\connection.js
echo Created: server\db\connection.js

type nul > server\db\companies.js
echo Created: server\db\companies.js

type nul > server\db\contacts.js
echo Created: server\db\contacts.js

type nul > server\db\communications.js
echo Created: server\db\communications.js

type nul > server\db\meetings.js
echo Created: server\db\meetings.js

type nul > server\db\dashboard.js
echo Created: server\db\dashboard.js

type nul > server\db\search.js
echo Created: server\db\search.js

type nul > server\db\users.js
echo Created: server\db\users.js

echo.
echo All specified files created successfully in server\db.

REM You can add 'pause' below if you want the window to stay open after running by double-clicking
REM pause
