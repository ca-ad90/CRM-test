import { defineStore } from "pinia";
import axios from "axios";

export const useContactStore = defineStore("contacts", {
    state: () => ({
        contacts: [],
        contact: null,
        companyContacts: [],
        loading: false,
        error: null,
    }),
    actions: {
        async fetchContacts() {
            this.loading = true;
            try {
                const response = await axios.get("/api/contacts");
                this.contacts = response.data;
                this.error = null;
            } catch (err) {
                this.error = err.message || "Failed to fetch contacts";
                console.error(this.error);
            } finally {
                this.loading = false;
            }
        },
        async fetchContact(id) {
            this.loading = true;
            try {
                const response = await axios.get(`/api/contacts/${id}`);
                this.contact = response.data;
                this.error = null;
            } catch (err) {
                this.error = err.message || "Failed to fetch contact";
                console.error(this.error);
            } finally {
                this.loading = false;
            }
        },
        async fetchContactsByCompany(companyId) {
            this.loading = true;
            try {
                const response = await axios.get(
                    `/api/companies/${companyId}/contacts`,
                );
                this.companyContacts = response.data;
                this.error = null;
            } catch (err) {
                this.error = err.message || "Failed to fetch company contacts";
                console.error(this.error);
            } finally {
                this.loading = false;
            }
        },
        async createContact(contact) {
            this.loading = true;
            try {
                const response = await axios.post("/api/contacts", contact);
                this.contacts.push(response.data);
                this.error = null;
                return response.data;
            } catch (err) {
                this.error = err.message || "Failed to create contact";
                console.error(this.error);
                throw err;
            } finally {
                this.loading = false;
            }
        },
        async updateContact(id, contact) {
            this.loading = true;
            try {
                const response = await axios.put(
                    `/api/contacts/${id}`,
                    contact,
                );
                const index = this.contacts.findIndex(
                    (c) => c.contact_id === id,
                );
                if (index !== -1) {
                    this.contacts[index] = response.data;
                }
                if (this.contact && this.contact.contact_id === id) {
                    this.contact = response.data;
                }
                this.error = null;
                return response.data;
            } catch (err) {
                this.error = err.message || "Failed to update contact";
                console.error(this.error);
                throw err;
            } finally {
                this.loading = false;
            }
        },
        async deleteContact(id) {
            this.loading = true;
            try {
                await axios.delete(`/api/contacts/${id}`);
                this.contacts = this.contacts.filter(
                    (c) => c.contact_id !== id,
                );
                if (this.contact && this.contact.contact_id === id) {
                    this.contact = null;
                }
                this.error = null;
                return true;
            } catch (err) {
                this.error = err.message || "Failed to delete contact";
                console.error(this.error);
                throw err;
            } finally {
                this.loading = false;
            }
        },
    },
});
