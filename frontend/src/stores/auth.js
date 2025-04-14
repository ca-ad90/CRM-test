// frontend/src/stores/auth.js
import { defineStore } from "pinia";
import axios from "axios";

export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null,
        token: localStorage.getItem('token') || null,
        loading: false,
        error: null,
    }),
    getters: {
        isAuthenticated: (state) => !!state.token && !!state.user,
        currentUser: (state) => state.user,
    },
    actions: {
        async login(username) {
            this.loading = true;
            try {
                const response = await axios.post("/api/auth/login", { username });
                this.user = response.data.user;
                this.token = response.data.token;
                this.error = null;

                // Save token to localStorage
                localStorage.setItem('token', this.token);

                // Set the Authorization header for all future requests
                axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;

                return this.user;
            } catch (err) {
                this.error = err.message || "Failed to login";
                console.error(this.error);
                throw err;
            } finally {
                this.loading = false;
            }
        },

        async fetchCurrentUser() {
            if (!this.token) return null;

            this.loading = true;
            try {
                // Set the Authorization header
                axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;

                const response = await axios.get("/api/auth/me");
                this.user = response.data;
                this.error = null;
                return this.user;
            } catch (err) {
                this.error = err.message || "Failed to fetch user";
                console.error(this.error);
                // If unauthorized, logout
                if (err.response?.status === 401) {
                    this.logout();
                }
                return null;
            } finally {
                this.loading = false;
            }
        },

        logout() {
            // Clear user data and token
            this.user = null;
            this.token = null;
            this.error = null;

            // Remove token from localStorage
            localStorage.removeItem('token');

            // Remove Authorization header
            delete axios.defaults.headers.common['Authorization'];
        },

        async getUsers() {
            if (!this.token) return [];

            try {
                const response = await axios.get("/api/users");
                return response.data;
            } catch (err) {
                console.error("Failed to fetch users:", err);
                return [];
            }
        },

        // Share a company with a user
        async shareCompany(companyId, userId) {
            try {
                await axios.post(`/api/companies/${companyId}/share`, { userId });
                return true;
            } catch (err) {
                console.error("Failed to share company:", err);
                throw err;
            }
        },

        // Unshare a company
        async unshareCompany(companyId, userId) {
            try {
                await axios.delete(`/api/companies/${companyId}/share`, {
                    data: { userId }
                });
                return true;
            } catch (err) {
                console.error("Failed to unshare company:", err);
                throw err;
            }
        },

        // Get users who have access to a company
        async getCompanyUsers(companyId) {
            try {
                const response = await axios.get(`/api/companies/${companyId}/users`);
                return response.data;
            } catch (err) {
                console.error("Failed to get company users:", err);
                return [];
            }
        },

        // Share a contact with a user
        async shareContact(contactId, userId) {
            try {
                await axios.post(`/api/contacts/${contactId}/share`, { userId });
                return true;
            } catch (err) {
                console.error("Failed to share contact:", err);
                throw err;
            }
        },

        // Share a meeting with a user
        async shareMeeting(meetingId, userId) {
            try {
                await axios.post(`/api/meetings/${meetingId}/share`, { userId });
                return true;
            } catch (err) {
                console.error("Failed to share meeting:", err);
                throw err;
            }
        },
    },
});
