import { defineStore } from "pinia";
import axios from "axios";

export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null,
        token: null,
        loading: false,
        error: null,
    }),

// src/stores/auth.js - Update the store to handle roles and permissions

// Add isAdmin getter
getters: {
    isAuthenticated: (state) => !!state.user,
    userFullName: (state) => {
        if (!state.user) return '';
        return `${state.user.username}`;
    },
    isAdmin: (state) => state.user?.role_id === 1,
},

// Update login handler to store role information

    actions: {
        /**
         * Register a new user
         * @param {object} credentials - The registration data
         * @returns {Promise<boolean>} Success status
         */
        async register(credentials) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axios.post("/api/auth/register", credentials, {
                    withCredentials: true // Important for cookies
                });

                this.user = response.data.user;
                this.token = response.data.token;

                // Set the token in axios headers for all future requests
                axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;

                return true;
            } catch (err) {
                this.error = err.response?.data?.error || "Registration failed";
                console.error(this.error);
                return false;
            } finally {
                this.loading = false;
            }
        },

        /**
         * Login a user
         * @param {object} credentials - The login credentials
         * @returns {Promise<boolean>} Success status
         */

async login(credentials) {
    console.log("store login");
    this.loading = true;
    this.error = null;

    try {
        const response = await axios.post("/api/auth/login", credentials, {
            withCredentials: true // Important for cookies
        });
        console.log(response.data);
        this.user = {
            ...response.data.user,
            role_id: response.data.user.role === 'admin' ? 1 : 2,
            role: response.data.user.role
        };
        this.token = response.data.token;

        // Set the token in axios headers for all future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;

        // Store auth details in localStorage (optional, as we're using cookies too)
        localStorage.setItem('user', JSON.stringify(this.user));
        localStorage.setItem('token', response.data.token);

        return true;
    } catch (err) {
        this.error = err.response?.data?.error || "Login failed";
        console.error(this.error);
        return false;
    } finally {
        this.loading = false;
    }
},
        /**
         * Logout the user
         */
        async logout() {
            this.loading = true;

            try {
                // Call logout endpoint to invalidate the token
                await axios.post("/api/auth/logout", {}, {
                    withCredentials: true
                });
            } catch (err) {
                console.error("Logout error:", err);
            } finally {
                // Clear auth state regardless of API success
                this.user = null;
                this.token = null;

                // Remove Authorization header
                delete axios.defaults.headers.common['Authorization'];

                // Clear localStorage
                localStorage.removeItem('user');
                localStorage.removeItem('token');

                this.loading = false;
            }
        },

        /**
         * Initialize authentication state from localStorage or session
         */
        initAuth() {
            this.loading = true;

            try {
                // Try to get user and token from localStorage
                const user = JSON.parse(localStorage.getItem('user'));
                const token = localStorage.getItem('token');

                if (user && token) {
                    this.user = user;
                    this.token = token;

                    // Set the token in axios headers
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                    // Verify token validity with the server
                    this.checkAuth();
                }
            } catch (err) {
                console.error("Init auth error:", err);
                this.user = null;
                this.token = null;
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            } finally {
                this.loading = false;
            }
        },

        /**
         * Check authentication status with the server
         */
        async checkAuth() {
            if (!this.token) return;

            try {
                const response = await axios.get("/api/auth/me", {
                    withCredentials: true
                });

                // Update user data
                this.user = response.data;
            } catch (err) {
                // Token is invalid, clear auth state
                this.user = null;
                this.token = null;
                delete axios.defaults.headers.common['Authorization'];
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        },

        /**
         * Set an error message
         * @param {string} error - The error message
         */
        setError(error) {
            this.error = error;
        },

        /**
         * Clear the error message
         */
        clearError() {
            this.error = null;
        }

    }
});
