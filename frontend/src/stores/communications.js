import { defineStore } from "pinia";
import axios from "axios";

export const useCommunicationStore = defineStore("communications", {
    state: () => ({
        communications: [],
        communication: null,
        contactCommunications: [],
        loading: false,
        error: null,
    }),
    actions: {
        async fetchCommunication(id) {
            this.loading = true;
            try {
                const response = await axios.get(`/api/communications/${id}`);
                this.communication = response.data;
                this.error = null;
            } catch (err) {
                this.error = err.message || "Failed to fetch communication";
                console.error(this.error);
            } finally {
                this.loading = false;
            }
        },
        async fetchCommunicationsByContact(contactId) {
            this.loading = true;
            try {
                const response = await axios.get(
                    `/api/contacts/${contactId}/communications`,
                );
                this.contactCommunications = response.data;
                this.error = null;
            } catch (err) {
                this.error =
                    err.message || "Failed to fetch contact communications";
                console.error(this.error);
            } finally {
                this.loading = false;
            }
        },
        async createCommunication(communication) {
            this.loading = true;
            try {
                const response = await axios.post(
                    "/api/communications",
                    communication,
                );
                this.contactCommunications.unshift(response.data);
                this.error = null;
                return response.data;
            } catch (err) {
                this.error = err.message || "Failed to create communication";
                console.error(this.error);
                throw err;
            } finally {
                this.loading = false;
            }
        },
        async updateCommunication(id, communication) {
            this.loading = true;
            try {
                const response = await axios.put(
                    `/api/communications/${id}`,
                    communication,
                );
                const index = this.contactCommunications.findIndex(
                    (c) => c.communication_id === id,
                );
                if (index !== -1) {
                    this.contactCommunications[index] = response.data;
                }
                if (
                    this.communication &&
                    this.communication.communication_id === id
                ) {
                    this.communication = response.data;
                }
                this.error = null;
                return response.data;
            } catch (err) {
                this.error = err.message || "Failed to update communication";
                console.error(this.error);
                throw err;
            } finally {
                this.loading = false;
            }
        },
        async deleteCommunication(id) {
            this.loading = true;
            try {
                await axios.delete(`/api/communications/${id}`);
                this.contactCommunications = this.contactCommunications.filter(
                    (c) => c.communication_id !== id,
                );
                if (
                    this.communication &&
                    this.communication.communication_id === id
                ) {
                    this.communication = null;
                }
                this.error = null;
                return true;
            } catch (err) {
                this.error = err.message || "Failed to delete communication";
                console.error(this.error);
                throw err;
            } finally {
                this.loading = false;
            }
        },
    },
});
