// src/stores/admin.js
import { defineStore } from "pinia";
import axios from "axios";

export const useAdminStore = defineStore("admin", {
    state: () => ({
        stats: null,
        users: [],
        companies: [],
        contacts: [],
        communications: [],
        meetings: [],
        activityLog: {
            logs: [],
            pagination: {
                total: 0,
                limit: 50,
                offset: 0,
                hasMore: false
            }
        },
        roles: [],
        reports: {
            usersActivity: [],
            systemOverview: null
        },
        loading: false,
        error: null,
    }),

    actions: {
        async fetchAdminDashboard() {
            this.loading = true;
            try {
                const response = await axios.get("/api/admin/dashboard");
                this.stats = response.data;
                this.error = null;
                return response.data;
            } catch (error) {
                this.error = error.response?.data?.error || "Failed to fetch admin dashboard";
                console.error(this.error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchUsers() {
            this.loading = true;
            try {
                const response = await axios.get("/api/admin/users");
                this.users = response.data;
                this.error = null;
                return response.data;
            } catch (error) {
                this.error = error.response?.data?.error || "Failed to fetch users";
                console.error(this.error);
                throw error;
            } finally {
                this.loading = false;
            }
        },
        async fetchCompanies() {
            this.loading = true;
            try {
                const response = await axios.get("/api/admin/companies");
                this.companies = response.data;
                this.error = null;
                return response.data;
            } catch (error) {
                this.error = error.response?.data?.error || "Failed to fetch companies";
                console.error(this.error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchContacts() {
            this.loading = true;
            try {
                const response = await axios.get("/api/admin/contacts");
                this.contacts = response.data;
                this.error = null;
                return response.data;
            } catch (error) {
                this.error = error.response?.data?.error || "Failed to fetch contacts";
                console.error(this.error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchCommunications() {
            this.loading = true;
            try {
                const response = await axios.get("/api/admin/communications");
                this.communications = response.data;
                this.error = null;
                return response.data;
            } catch (error) {
                this.error = error.response?.data?.error || "Failed to fetch communications";
                console.error(this.error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchMeetings() {
            this.loading = true;
            try {
                const response = await axios.get("/api/admin/meetings");
                this.meetings = response.data;
                this.error = null;
                return response.data;
            } catch (error) {
                this.error = error.response?.data?.error || "Failed to fetch meetings";
                console.error(this.error);
                throw error;
            } finally {
                this.loading = false;
            }
            },

        async createUser(userData) {
            this.loading = true;
            try {
                const response = await axios.post("/api/admin/users", userData);
                this.users.push(response.data.user);
                this.error = null;
                return response.data;
            } catch (error) {
                this.error = error.response?.data?.error || "Failed to create user";
                console.error(this.error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async updateUser(userId, userData) {
            this.loading = true;
            try {
                const response = await axios.put(`/api/admin/users/${userId}`, userData);
                const index = this.users.findIndex(user => user.user_id === userId);
                if (index !== -1) {
                    this.users[index] = response.data.user;
                }
                this.error = null;
                return response.data;
            } catch (error) {
                this.error = error.response?.data?.error || "Failed to update user";
                console.error(this.error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async deleteUser(userId) {
            this.loading = true;
            try {
                await axios.delete(`/api/admin/users/${userId}`);
                this.users = this.users.filter(user => user.user_id !== userId);
                this.error = null;
                return true;
            } catch (error) {
                this.error = error.response?.data?.error || "Failed to delete user";
                console.error(this.error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchActivityLog(params = {}) {
            this.loading = true;
            try {
                const queryParams = new URLSearchParams();
                if (params.limit) queryParams.append('limit', params.limit);
                if (params.offset) queryParams.append('offset', params.offset);
                if (params.user_id) queryParams.append('user_id', params.user_id);
                if (params.action_type) queryParams.append('action_type', params.action_type);
                if (params.entity_type) queryParams.append('entity_type', params.entity_type);

                const response = await axios.get(`/api/admin/activity-log?${queryParams.toString()}`);
                this.activityLog = response.data;
                this.error = null;
                return response.data;
            } catch (error) {
                this.error = error.response?.data?.error || "Failed to fetch activity log";
                console.error(this.error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchRoles() {
            this.loading = true;
            try {
                const response = await axios.get("/api/admin/roles");
                this.roles = response.data;
                this.error = null;
                return response.data;
            } catch (error) {
                this.error = error.response?.data?.error || "Failed to fetch roles";
                console.error(this.error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchRolePermissions(roleId) {
            this.loading = true;
            try {
                const response = await axios.get(`/api/admin/roles/${roleId}/permissions`);
                this.error = null;
                return response.data;
            } catch (error) {
                this.error = error.response?.data?.error || "Failed to fetch role permissions";
                console.error(this.error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchUsersActivityReport() {
            this.loading = true;
            try {
                const response = await axios.get("/api/admin/reports/users-activity");
                this.reports.usersActivity = response.data;
                this.error = null;
                return response.data;
            } catch (error) {
                this.error = error.response?.data?.error || "Failed to fetch users activity report";
                console.error(this.error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchSystemOverviewReport() {
            this.loading = true;
            try {
                const response = await axios.get("/api/admin/reports/system-overview");
                this.reports.systemOverview = response.data;
                this.error = null;
                return response.data;
            } catch (error) {
                this.error = error.response?.data?.error || "Failed to fetch system overview report";
                console.error(this.error);
                throw error;
            } finally {
                this.loading = false;
            }
        }
    }
});
