-- Create tables for company database

CREATE TABLE companies (
    company_id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    website TEXT,
    address TEXT,
    phone text,
    email text
);

CREATE TABLE contacts (
    contact_id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    position TEXT,
    email TEXT,
    phone TEXT,
    linkedin_url TEXT,
    notes TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(company_id)
);

CREATE TABLE communications (
    communication_id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER,
    date_contacted TIMESTAMP NOT NULL,
    contact_method TEXT, -- email, phone, linkedin, etc.
    message_content TEXT,
    received_response INTEGER DEFAULT 0,
    response_date TIMESTAMP,
    response_content TEXT,
    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id)
);

CREATE TABLE meetings (
    meeting_id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER,
    meeting_date TIMESTAMP NOT NULL,
    location TEXT,
    meeting_type TEXT, -- in-person, virtual, phone
    meeting_status TEXT, -- scheduled, completed, cancelled
    meeting_notes TEXT,
    follow_up_needed INTEGER DEFAULT 0,
    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id)
);

-- Add indexes for better query performance
CREATE INDEX idx_communications_contact_id ON communications(contact_id);
CREATE INDEX idx_meetings_contact_id ON meetings(contact_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
