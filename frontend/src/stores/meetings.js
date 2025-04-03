import { defineStore } from "pinia";
import axios from "axios";

export const useMeetingStore = defineStore("meetings", {
    state: () => ({
        meetings: [],
        meeting: null,
        contactMeetings: [],
        loading: false,
        error: null,
    }),
    actions: {
        async fetchMeetings() {
            this.loading = true;
            try {
                const response = await axios.get("/api/meetings");
                this.meetings = response.data;
                this.error = null;
            } catch (err) {
                this.error = err.message || "Failed to fetch meetings";
                console.error(this.error);
            } finally {
                this.loading = false;
            }
        },
        async fetchMeeting(id) {
            this.loading = true;
            try {
                const response = await axios.get(`/api/meetings/${id}`);
                this.meeting = response.data;
                this.error = null;
            } catch (err) {
                this.error = err.message || "Failed to fetch meeting";
                console.error(this.error);
            } finally {
                this.loading = false;
            }
        },
        async fetchMeetingsByContact(contactId) {
            this.loading = true;
            try {
                const response = await axios.get(
                    `/api/contacts/${contactId}/meetings`,
                );
                this.contactMeetings = response.data;
                this.error = null;
            } catch (err) {
                this.error = err.message || "Failed to fetch contact meetings";
                console.error(this.error);
            } finally {
                this.loading = false;
            }
        },
        async createMeeting(meeting) {
            this.loading = true;
            try {
                const response = await axios.post("/api/meetings", meeting);
                this.meetings.push(response.data);
                this.error = null;
                return response.data;
            } catch (err) {
                this.error = err.message || "Failed to create meeting";
                console.error(this.error);
                throw err;
            } finally {
                this.loading = false;
            }
        },
        async updateMeeting(id, meeting) {
            this.loading = true;
            try {
                const response = await axios.put(
                    `/api/meetings/${id}`,
                    meeting,
                );
                const index = this.meetings.findIndex(
                    (m) => m.meeting_id === id,
                );
                if (index !== -1) {
                    this.meetings[index] = response.data;
                }
                if (this.meeting && this.meeting.meeting_id === id) {
                    this.meeting = response.data;
                }
                this.error = null;
                return response.data;
            } catch (err) {
                this.error = err.message || "Failed to update meeting";
                console.error(this.error);
                throw err;
            } finally {
                this.loading = false;
            }
        },
        async deleteMeeting(id) {
            this.loading = true;
            try {
                await axios.delete(`/api/meetings/${id}`);
                this.meetings = this.meetings.filter(
                    (m) => m.meeting_id !== id,
                );
                if (this.meeting && this.meeting.meeting_id === id) {
                    this.meeting = null;
                }
                this.error = null;
                return true;
            } catch (err) {
                this.error = err.message || "Failed to delete meeting";
                console.error(this.error);
                throw err;
            } finally {
                this.loading = false;
            }
        },
    },
});
