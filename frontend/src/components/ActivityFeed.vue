<template>
    <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <div v-if="loading" class="py-4">
            <LoadingSpinner />
        </div>
        <div
            v-else-if="activities.length === 0"
            class="text-center py-6 text-gray-500">
            No recent activities found
        </div>
        <ul v-else class="space-y-4">
            <li
                v-for="activity in activities"
                :key="`${activity.type}-${activity.id}`"
                class="bg-white rounded-md shadow p-4">
                <div class="flex">
                    <div
                        :class="[
                            'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center',
                            activity.type === 'meeting'
                                ? 'bg-purple-100'
                                : 'bg-blue-100',
                        ]">
                        <CalendarIcon
                            v-if="activity.type === 'meeting'"
                            class="h-6 w-6 text-purple-600" />
                        <ChatBubbleLeftRightIcon
                            v-else
                            class="h-6 w-6 text-blue-600" />
                    </div>
                    <div class="ml-4 flex-1">
                        <div class="flex items-center justify-between">
                            <h3 class="text-sm font-medium">
                                <router-link
                                    :to="`/contacts/${activity.contact_id}`"
                                    class="text-blue-600 hover:underline">
                                    {{ activity.contact_name }}
                                </router-link>
                                <span class="text-gray-500"> at </span>
                                <router-link
                                    :to="`/companies/${activity.company_id}`"
                                    class="text-blue-600 hover:underline">
                                    {{ activity.company_name }}
                                </router-link>
                            </h3>
                            <time
                                :datetime="activity.date"
                                class="text-sm text-gray-500">
                                {{ formatDate(activity.date) }}
                            </time>
                        </div>
                        <p class="text-sm text-gray-500 mt-1">
                            {{ activity.description }}
                        </p>
                        <div class="mt-2">
                            <router-link
                                :to="`/${activity.type}s/${activity.id}`"
                                class="text-sm text-blue-600 hover:text-blue-800">
                                View details
                            </router-link>
                        </div>
                    </div>
                </div>
            </li>
        </ul>
    </div>
</template>

<script setup>
import { defineProps } from "vue";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import {
    CalendarIcon,
    ChatBubbleLeftRightIcon,
} from "@heroicons/vue/24/outline";
import LoadingSpinner from "./LoadingSpinner.vue";

const props = defineProps({
    activities: {
        type: Array,
        default: () => [],
    },
    loading: {
        type: Boolean,
        default: false,
    },
});

const formatDate = (dateString) => {
    const date = new Date(dateString);

    if (isToday(date)) {
        return `Today at ${format(date, "h:mm a")}`;
    } else if (isYesterday(date)) {
        return `Yesterday at ${format(date, "h:mm a")}`;
    } else if (isThisWeek(date)) {
        return format(date, "EEEE at h:mm a");
    } else {
        return format(date, "MMM d, yyyy");
    }
};
</script>
