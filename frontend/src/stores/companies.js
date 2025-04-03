import { defineStore } from "pinia";
import axios from "axios";

export const useCompanyStore = defineStore("companies", {
    state: () => ({
        companies: [],
        company: null,
        loading: false,
        error: null,
    }),
    actions: {
        async fetchCompanies() {
            this.loading = true;
            try {
                const response = await axios.get("/api/companies");
                this.companies = response.data;
                this.error = null;
            } catch (err) {
                this.error = err.message || "Failed to fetch companies";
                console.error(this.error);
            } finally {
                this.loading = false;
            }
        },
        async fetchCompany(id) {
            this.loading = true;
            try {
                const response = await axios.get(`/api/companies/${id}`);
                this.company = response.data;
                this.error = null;
            } catch (err) {
                this.error = err.message || "Failed to fetch company";
                console.error(this.error);
            } finally {
                this.loading = false;
            }
        },
        async createCompany(company) {
            this.loading = true;
            try {
                const response = await axios.post("/api/companies", company);
                this.companies.push(response.data);
                this.error = null;
                return response.data;
            } catch (err) {
                this.error = err.message || "Failed to create company";
                console.error(this.error);
                throw err;
            } finally {
                this.loading = false;
            }
        },
        async updateCompany(id, company) {
            this.loading = true;
            try {
                const response = await axios.put(
                    `/api/companies/${id}`,
                    company,
                );
                const index = this.companies.findIndex(
                    (c) => c.company_id === id,
                );
                if (index !== -1) {
                    this.companies[index] = response.data;
                }
                if (this.company && this.company.company_id === id) {
                    this.company = response.data;
                }
                this.error = null;
                return response.data;
            } catch (err) {
                this.error = err.message || "Failed to update company";
                console.error(this.error);
                throw err;
            } finally {
                this.loading = false;
            }
        },
        async deleteCompany(id) {
            this.loading = true;
            try {
                await axios.delete(`/api/companies/${id}`);
                this.companies = this.companies.filter(
                    (c) => c.company_id !== id,
                );
                if (this.company && this.company.company_id === id) {
                    this.company = null;
                }
                this.error = null;
                return true;
            } catch (err) {
                this.error = err.message || "Failed to delete company";
                console.error(this.error);
                throw err;
            } finally {
                this.loading = false;
            }
        },
    },
});
