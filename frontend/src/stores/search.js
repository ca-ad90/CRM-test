import { defineStore } from "pinia";
import axios from "axios";

export const useSearchStore = defineStore("search", {
    state: () => ({
        results: {
            companies: [],
            contacts: [],
        },
        query: "",
        loading: false,
        error: null,
    }),
    actions: {
        async search(query) {
            if (!query || query.trim() === "") {
                this.results = { companies: [], contacts: [] };
                this.query = "";
                return;
            }

            this.loading = true;
            this.query = query;

            try {
                const response = await axios.get(
                    `/api/search?q=${encodeURIComponent(query)}`,
                );
                this.results = response.data;
                this.error = null;
            } catch (err) {
                this.error = err.message || "Search failed";
                console.error(this.error);
            } finally {
                this.loading = false;
            }
        },
    },
});
