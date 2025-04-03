<template>
    <div class="space-y-6">
        <h1 class="text-2xl font-bold">Dashboard</h1>

        <div v-if="loading" class="py-8">
            <LoadingSpinner />
        </div>
        <template v-else>
            <!-- Key Stats -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Companies"
                    :value="stats.companiesCount"
                    :icon="BuildingOfficeIcon"
                    bg-color-class="bg-blue-600" />
                <StatsCard
                    title="Contacts"
                    :value="stats.contactsCount"
                    :icon="UserIcon"
                    bg-color-class="bg-green-600" />
                <StatsCard
                    title="Upcoming Meetings"
                    :value="stats.upcomingMeetingsCount"
                    :icon="CalendarIcon"
                    bg-color-class="bg-purple-600" />
                <StatsCard
                    title="Pending Follow-ups"
                    :value="stats.pendingFollowUpsCount"
                    :icon="ClockIcon"
                    bg-color-class="bg-yellow-600" />
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Recent Activity -->
                <div class="card">
                    <ActivityFeed :activities="activities" :loading="false" />
                </div>

                <!-- Upcoming Meetings -->
                <div class="card">
                    <h2 class="text-lg font-semibold text-gray-900 mb-4">
                        Upcoming Meetings
                    </h2>
                    <div
                        v-if="upcomingMeetings.length === 0"
                        class="text-center py-6 text-gray-500">
                        No upcoming meetings scheduled
                    </div>
                    <ul v-else class="divide-y divide-gray-200">
                        <li
                            v-for="meeting in upcomingMeetings"
                            :key="meeting.meeting_id"
                            class="py-4">
                            <div class="flex items-center">
                                <div
                                    class="w-2 h-2 rounded-full bg-green-500 mr-3"></div>
                                <div class="flex-1">
                                    <h3 class="text-sm font-medium">
                                        <router-link
                                            :to="`/meetings/${meeting.meeting_id}`"
                                            class="text-blue-600 hover:underline">
                                            {{ meeting.meeting_type }} Meeting
                                            with {{ meeting.first_name }}
                                            {{ meeting.last_name }}
                                        </router-link>
                                    </h3>
                                    <p class="text-sm text-gray-500">
                                        {{ formatDate(meeting.meeting_date) }}
                                        at {{ meeting.location || "N/A" }}
                                    </p>
                                </div>
                                <div>
                                    <router-link
                                        :to="`/meetings/${meeting.meeting_id}`"
                                        class="text-sm text-blue-600 hover:text-blue-800">
                                        Details
                                    </router-link>
                                </div>
                            </div>
                        </li>
                    </ul>

                    <div class="mt-4">
                        <router-link
                            to="/meetings"
                            class="text-sm text-blue-600 hover:text-blue-800">
                            View all meetings
                        </router-link>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { format } from "date-fns";
import {
    BuildingOfficeIcon,
    UserIcon,
    CalendarIcon,
    ClockIcon,
} from "@heroicons/vue/24/outline";
import { useDashboardStore } from "../stores/dashboard";
import StatsCard from "../components/StatsCard.vue";
import ActivityFeed from "../components/ActivityFeed.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";

const dashboardStore = useDashboardStore();
const loading = ref(true);

const stats = computed(
    () =>
        dashboardStore.stats || {
            companiesCount: 0,
            contactsCount: 0,
            upcomingMeetingsCount: 0,
            pendingFollowUpsCount: 0,
        },
);

const activities = computed(() => dashboardStore.activities || []);
const upcomingMeetings = computed(() => dashboardStore.upcomingMeetings || []);

const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
};

onMounted(async () => {
    try {
        await dashboardStore.fetchDashboardData();
    } catch (error) {
        console.error("Failed to fetch dashboard data", error);
    } finally {
        loading.value = false;
    }
});
</script>
