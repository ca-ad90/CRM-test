<template>
    <div class="space-y-6">
        <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold">Meetings</h1>
            <button @click="showAddMeetingModal = true" class="btn btn-primary">
                <PlusIcon class="h-5 w-5 mr-1 inline" />
                Schedule Meeting
            </button>
        </div>

        <div class="bg-white rounded-lg shadow-md p-4 mb-6">
            <div class="flex flex-wrap items-center gap-4">
                <div>
                    <label for="status-filter" class="label">Status</label>
                    <select
                        id="status-filter"
                        v-model="filters.status"
                        class="p-2 border border-gray-300 rounded-md">
                        <option value="">All Statuses</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                <div>
                    <label for="type-filter" class="label">Type</label>
                    <select
                        id="type-filter"
                        v-model="filters.type"
                        class="p-2 border border-gray-300 rounded-md">
                        <option value="">All Types</option>
                        <option value="in-person">In-Person</option>
                        <option value="virtual">Virtual</option>
                        <option value="phone">Phone</option>
                    </select>
                </div>
                <div>
                    <label for="date-filter" class="label">Date Range</label>
                    <select
                        id="date-filter"
                        v-model="filters.dateRange"
                        class="p-2 border border-gray-300 rounded-md">
                        <option value="all">All Dates</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="past">Past</option>
                        <option value="today">Today</option>
                        <option value="this-week">This Week</option>
                        <option value="this-month">This Month</option>
                    </select>
                </div>
                <div class="ml-auto">
                    <button
                        @click="resetFilters"
                        class="btn btn-secondary mt-6">
                        Reset Filters
                    </button>
                </div>
            </div>
        </div>

        <div v-if="loading" class="py-8">
            <LoadingSpinner />
        </div>
        <div v-else-if="filteredMeetings.length === 0" class="text-center py-8">
            <div class="text-gray-500">No meetings found</div>
            <button
                @click="showAddMeetingModal = true"
                class="btn btn-primary mt-4">
                Schedule Your First Meeting
            </button>
        </div>
        <div v-else class="overflow-x-auto shadow-md rounded-lg">
            <table class="min-w-full divide-y divide-gray-200 bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date & Time
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Company
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr
                        v-for="meeting in filteredMeetings"
                        :key="meeting.meeting_id"
                        class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap">
                            {{ formatDateTime(meeting.meeting_date) }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <router-link
                                :to="`/contacts/${meeting.contact_id}`"
                                class="text-blue-600 hover:underline font-medium">
                                {{ meeting.first_name }} {{ meeting.last_name }}
                            </router-link>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <router-link
                                v-if="meeting.company_id"
                                :to="`/companies/${meeting.company_id}`"
                                class="text-blue-600 hover:underline">
                                {{ meeting.company_name || "N/A" }}
                            </router-link>
                            <span v-else class="text-gray-500">  {{ meeting.company_name || "N/A" }}</span>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-gray-700 capitalize">
                            {{ meeting.meeting_type }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-gray-700">
                            {{ meeting.location || "N/A" }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span
                                :class="[
                                    'px-2 py-1 text-xs font-medium rounded-full capitalize',
                                    meeting.meeting_status === 'completed'
                                        ? 'bg-green-100 text-green-800'
                                        : meeting.meeting_status === 'cancelled'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-blue-100 text-blue-800',
                                ]">
                                {{ meeting.meeting_status }}
                            </span>
                            <span
                                v-if="meeting.follow_up_needed"
                                class="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                Follow-up
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-center">
                            <div class="flex justify-center space-x-2">
                                <button
                                    @click="viewMeeting(meeting)"
                                    title="View Details"
                                    class="text-blue-600 hover:text-blue-900">
                                    <EyeIcon class="h-5 w-5" />
                                </button>
                                <button
                                    @click="editMeeting(meeting)"
                                    title="Edit Meeting"
                                    class="text-indigo-600 hover:text-indigo-900">
                                    <PencilSquareIcon class="h-5 w-5" />
                                </button>
                                <button
                                    @click="confirmDelete(meeting)"
                                    title="Delete Meeting"
                                    class="text-red-600 hover:text-red-900">
                                    <TrashIcon class="h-5 w-5" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Add/Edit Meeting Modal -->
        <div
            v-if="showAddMeetingModal || showEditMeetingModal"
            class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h2 class="text-xl font-bold mb-4">
                    {{
                        showEditMeetingModal
                            ? "Edit Meeting"
                            : "Schedule New Meeting"
                    }}
                </h2>
                <MeetingForm
                    :meeting="currentMeeting"
                    :is-editing="showEditMeetingModal"
                    @submit="handleMeetingSubmit"
                    @cancel="closeModals" />
            </div>
        </div>

        <!-- View Meeting Modal -->
        <div
            v-if="showViewMeetingModal && currentMeeting"
            class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="bg-white rounded-lg p-6 max-w-2xl w-full shadow-xl">
                <div class="flex justify-between items-start">
                    <h2 class="text-xl font-bold mb-4">Meeting Details</h2>
                    <button
                        @click="showViewMeetingModal = false"
                        class="text-gray-500 hover:text-gray-700">
                        <XMarkIcon class="h-5 w-5" />
                    </button>
                </div>

                <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                Contact
                            </h3>
                            <p class="font-medium">
                                <router-link
                                    :to="`/contacts/${currentMeeting.contact_id}`"
                                    class="text-blue-600 hover:underline"
                                    @click="showViewMeetingModal = false">
                                    {{ currentMeeting.first_name }}
                                    {{ currentMeeting.last_name }}
                                </router-link>
                            </p>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                Company
                            </h3>
                            <p v-if="currentMeeting.company_name">
                                <router-link
                                    :to="`/companies/${currentMeeting.company_id}`"
                                    class="text-blue-600 hover:underline"
                                    @click="showViewMeetingModal = false">
                                    {{ currentMeeting.company_name }}
                                </router-link>
                            </p>
                            <p v-else class="text-gray-700">N/A</p>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                Date & Time
                            </h3>
                            <p class="text-gray-700">
                                {{
                                    formatDateTime(currentMeeting.meeting_date)
                                }}
                            </p>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                Location
                            </h3>
                            <p class="text-gray-700">
                                {{ currentMeeting.location || "N/A" }}
                            </p>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                Type
                            </h3>
                            <p class="text-gray-700 capitalize">
                                {{ currentMeeting.meeting_type }}
                            </p>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                Status
                            </h3>
                            <p>
                                <span
                                    :class="[
                                        'px-2 py-1 text-xs font-medium rounded-full capitalize',
                                        currentMeeting.meeting_status ===
                                        'completed'
                                            ? 'bg-green-100 text-green-800'
                                            : currentMeeting.meeting_status ===
                                              'cancelled'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-blue-100 text-blue-800',
                                    ]">
                                    {{ currentMeeting.meeting_status }}
                                </span>
                                <span
                                    v-if="currentMeeting.follow_up_needed"
                                    class="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                    Follow-up needed
                                </span>
                            </p>
                        </div>
                    </div>

                    <div>
                        <h3 class="text-sm font-medium text-gray-500">Notes</h3>
                        <p class="text-gray-700 whitespace-pre-line mt-1">
                            {{ currentMeeting.meeting_notes || "No notes" }}
                        </p>
                    </div>

                    <div class="flex justify-end space-x-2 mt-6">
                        <button
                            @click="editMeetingFromDetails"
                            class="btn btn-secondary">
                            <PencilIcon class="h-5 w-5 mr-1 inline" />
                            Edit
                        </button>
                        <button
                            @click="confirmDeleteFromDetails"
                            class="btn btn-danger">
                            <TrashIcon class="h-5 w-5 mr-1 inline" />
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <DeleteConfirmation
            v-if="showDeleteModal"
            :message="`Are you sure you want to delete this meeting?`"
            @confirm="deleteMeeting"
            @cancel="showDeleteModal = false" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import {
    format,
    isAfter,
    isBefore,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
} from "date-fns";
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    EyeIcon,
    PencilIcon,
    XMarkIcon,
} from "@heroicons/vue/24/outline";
import { useMeetingStore } from "../stores/meetings";
import MeetingForm from "../components/MeetingForm.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import DeleteConfirmation from "../components/DeleteConfirmation.vue";

const meetingStore = useMeetingStore();
const toast = useToast();

// State
const loading = ref(true);
const showAddMeetingModal = ref(false);
const showEditMeetingModal = ref(false);
const showViewMeetingModal = ref(false);
const showDeleteModal = ref(false);
const currentMeeting = ref(null);
const filters = ref({
    status: "",
    type: "",
    dateRange: "all",
});

// Computed
const meetings = computed(() => meetingStore.meetings);
const filteredMeetings = computed(() => {
    let result = [...meetings.value];
    const now = new Date();

    // Filter by status
    if (filters.value.status) {
        result = result.filter(
            (meeting) => meeting.meeting_status === filters.value.status,
        );
    }

    // Filter by type
    if (filters.value.type) {
        result = result.filter(
            (meeting) => meeting.meeting_type === filters.value.type,
        );
    }

    // Filter by date range
    if (filters.value.dateRange !== "all") {
        switch (filters.value.dateRange) {
            case "upcoming":
                result = result.filter((meeting) =>
                    isAfter(new Date(meeting.meeting_date), now),
                );
                break;
            case "past":
                result = result.filter((meeting) =>
                    isBefore(new Date(meeting.meeting_date), now),
                );
                break;
            case "today":
                const todayStart = startOfDay(now);
                const todayEnd = endOfDay(now);
                result = result.filter((meeting) => {
                    const meetingDate = new Date(meeting.meeting_date);
                    return (
                        isAfter(meetingDate, todayStart) &&
                        isBefore(meetingDate, todayEnd)
                    );
                });
                break;
            case "this-week":
                const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Start on Monday
                const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
                result = result.filter((meeting) => {
                    const meetingDate = new Date(meeting.meeting_date);
                    return (
                        isAfter(meetingDate, weekStart) &&
                        isBefore(meetingDate, weekEnd)
                    );
                });
                break;
            case "this-month":
                const monthStart = startOfMonth(now);
                const monthEnd = endOfMonth(now);
                result = result.filter((meeting) => {
                    const meetingDate = new Date(meeting.meeting_date);
                    return (
                        isAfter(meetingDate, monthStart) &&
                        isBefore(meetingDate, monthEnd)
                    );
                });
                break;
        }
    }

    // Sort by date (most recent first for past meetings, soonest first for upcoming)
    result.sort((a, b) => {
        const dateA = new Date(a.meeting_date);
        const dateB = new Date(b.meeting_date);

        if (filters.value.dateRange === "past") {
            return dateB - dateA; // Most recent first for past meetings
        } else {
            return dateA - dateB; // Soonest first for upcoming or all
        }
    });

    return result;
});

// Methods
const resetFilters = () => {
    filters.value = {
        status: "",
        type: "",
        dateRange: "all",
    };
};

const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
};

const viewMeeting = (meeting) => {
    currentMeeting.value = { ...meeting };
    showViewMeetingModal.value = true;
};

const editMeeting = (meeting) => {
    currentMeeting.value = { ...meeting };
    showEditMeetingModal.value = true;
};

const editMeetingFromDetails = () => {
    showViewMeetingModal.value = false;
    showEditMeetingModal.value = true;
};

const confirmDelete = (meeting) => {
    currentMeeting.value = meeting;
    showDeleteModal.value = true;
};

const confirmDeleteFromDetails = () => {
    showViewMeetingModal.value = false;
    showDeleteModal.value = true;
};

const closeModals = () => {
    showAddMeetingModal.value = false;
    showEditMeetingModal.value = false;
    showViewMeetingModal.value = false;
    showDeleteModal.value = false;
    currentMeeting.value = null;
};

const handleMeetingSubmit = async (formData) => {
    try {
        if (showEditMeetingModal.value) {
            await meetingStore.updateMeeting(
                currentMeeting.value.meeting_id,
                formData,
            );
            toast.success("Meeting updated successfully");
        } else {
            await meetingStore.createMeeting(formData);
            toast.success("Meeting scheduled successfully");
        }
        closeModals();
        await meetingStore.fetchMeetings();
    } catch (error) {
        toast.error("An error occurred: " + (error.message || "Unknown error"));
    }
};

const deleteMeeting = async () => {
    try {
        await meetingStore.deleteMeeting(currentMeeting.value.meeting_id);
        toast.success("Meeting deleted successfully");
        closeModals();
    } catch (error) {
        toast.error(
            "Failed to delete meeting: " + (error.message || "Unknown error"),
        );
    }
};

// Lifecycle hooks
onMounted(async () => {
    try {
        await meetingStore.fetchMeetings();
    } catch (error) {
        toast.error(
            "Failed to fetch meetings: " + (error.message || "Unknown error"),
        );
    } finally {
        loading.value = false;
    }
});
</script>
