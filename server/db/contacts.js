export const contactsDb = {
    /**
     * Get all contacts
     * @returns {Promise<Array>} Array of contact objects
     */
    async getAll() {
        const db = await getDbConnection();
        console.log("get all contacts")
        return db.all(`
      SELECT c.*, co.company_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.company_id
      ORDER BY c.last_name, c.first_name
    `);

    },

    /**
     * Get a contact by ID
     * @param {number} id - The contact ID
     * @returns {Promise<object>} The contact object
     */
    async getById(id) {
        const db = await getDbConnection();
        return db.get(
            `
      SELECT c.*, co.company_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.company_id
      WHERE c.contact_id = ?
    `,
            id,
        );
    },

    /**
     * Get contacts by company ID
     * @param {number} companyId - The company ID
     * @returns {Promise<Array>} Array of contact objects
     */
    async getByCompanyId(companyId) {
        const db = await getDbConnection();
        return db.all(
            "SELECT * FROM contacts WHERE company_id = ? ORDER BY last_name, first_name",
            companyId,
        );
    },

    /**
     * Create a new contact
     * @param {object} contact - The contact data
     * @returns {Promise<object>} The created contact with ID
     */
    async create(contact) {
        const db = await getDbConnection();
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
            ],
        );

        return {
            contact_id: result.lastID,
            ...contact,
        };
    },

    /**
     * Update a contact
     * @param {number} id - The contact ID
     * @param {object} contact - The updated contact data
     * @returns {Promise<boolean>} Success status
     */
    async update(id, contact) {
        const db = await getDbConnection();
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
            ],
        );

        return result.changes > 0;
    },

    /**
     * Delete a contact
     * @param {number} id - The contact ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        const db = await getDbConnection();
        const result = await db.run(
            "DELETE FROM contacts WHERE contact_id = ?",
            id,
        );
        return result.changes > 0;
    },
};
