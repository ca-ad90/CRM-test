import { defineStore } from "pinia";
import axios from "axios";

export const useDashboardStore = defineStore("dashboard", {
    state: () => ({
        stats: null,
        activities: [],
        upcomingMeetings: [],
        loading: false,
        error: null,
    }),
    actions: {
        async fetchDashboardData() {
            this.loading = true;
            try {
                const [statsResponse, activitiesResponse, meetingsResponse] =
                    await Promise.all([
                        axios.get("/api/dashboard/stats"),
                        axios.get("/api/dashboard/activities"),
                        axios.get("/api/meetings/upcoming"),
                    ]);

                this.stats = statsResponse.data;
                this.activities = activitiesResponse.data;
                this.upcomingMeetings = meetingsResponse.data;
                this.error = null;
            } catch (err) {
                this.error = err.message || "Failed to fetch dashboard data";
                console.error(this.error);
            } finally {
                this.loading = false;
            }
        },
    },
});
