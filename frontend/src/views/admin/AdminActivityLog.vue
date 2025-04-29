<!-- src/views/admin/AdminActivityLog.vue -->
<template>
    <AdminLayout title="Activity Log">
        <template>
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">Activity Log</h1>
                </div>

                <!-- Filters -->
                <div class="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label for="user-filter" class="label">User</label>
                            <select
                                id="user-filter"
                                v-model="filters.user_id"
                                class="input">
                                <option value="">All Users</option>
                                <option
                                    v-for="user in users"
                                    :key="user.user_id"
                                    :value="user.user_id">
                                    {{ user.username }}
                                </option>
                            </select>
                        </div>
                        <div>
                            <label for="action-filter" class="label"
                                >Action Type</label
                            >
                            <select
                                id="action-filter"
                                v-model="filters.action_type"
                                class="input">
                                <option value="">All Actions</option>
                                <option value="view">View</option>
                                <option value="create">Create</option>
                                <option value="update">Update</option>
                                <option value="delete">Delete</option>
                                <option value="login">Login</option>
                                <option value="logout">Logout</option>
                                <option value="register">Register</option>
                                <option value="share">Share</option>
                                <option value="error">Error</option>
                            </select>
                        </div>
                        <div>
                            <label for="entity-filter" class="label"
                                >Entity Type</label
                            >
                            <select
                                id="entity-filter"
                                v-model="filters.entity_type"
                                class="input">
                                <option value="">All Entities</option>
                                <option value="user">User</option>
                                <option value="company">Company</option>
                                <option value="contact">Contact</option>
                                <option value="communication">
                                    Communication
                                </option>
                                <option value="meeting">Meeting</option>
                                <option value="dashboard">Dashboard</option>
                                <option value="system">System</option>
                            </select>
                        </div>
                        <div class="flex items-end">
                            <button
                                @click="applyFilters"
                                class="btn btn-primary mr-2">
                                Apply Filters
                            </button>
                            <button
                                @click="resetFilters"
                                class="btn btn-secondary">
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                <div v-if="loading" class="py-8">
                    <LoadingSpinner />
                </div>
                <div v-else class="overflow-x-auto shadow-md rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200 bg-white">
                        <thead class="bg-gray-50">
                            <tr>
                                <th
                                    scope="col"
                                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Time
                                </th>
                                <th
                                    scope="col"
                                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th
                                    scope="col"
                                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Action
                                </th>
                                <th
                                    scope="col"
                                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Entity
                                </th>
                                <th
                                    scope="col"
                                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Details
                                </th>
                                <th
                                    scope="col"
                                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    IP Address
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr
                                v-for="log in activityLog.logs"
                                :key="log.log_id"
                                class="hover:bg-gray-50">
                                <td
                                    class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    {{ formatDateTime(log.created_at) }}
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap">
                                    <div
                                        class="text-sm font-medium text-gray-900">
                                        {{ log.username }}
                                    </div>
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap">
                                    <span
                                        :class="
                                            getActionBadgeColor(log.action_type)
                                        "
                                        class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize">
                                        {{ log.action_type }}
                                    </span>
                                </td>
                                <td
                                    class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <span class="capitalize">{{
                                        log.entity_type
                                    }}</span>
                                    {{
                                        log.entity_id ? `#${log.entity_id}` : ""
                                    }}
                                </td>
                                <td
                                    class="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                                    {{ log.details }}
                                </td>
                                <td
                                    class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    {{ log.ip_address }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div
                    v-if="activityLog.logs.length > 0"
                    class="flex justify-between items-center bg-white p-4 rounded-lg shadow">
                    <div class="text-sm text-gray-700">
                        Showing
                        <span class="font-medium">{{
                            activityLog.pagination.offset + 1
                        }}</span>
                        to
                        <span class="font-medium">{{
                            activityLog.pagination.offset +
                            activityLog.logs.length
                        }}</span>
                        of
                        <span class="font-medium">{{
                            activityLog.pagination.total
                        }}</span>
                        results
                    </div>
                    <div class="flex space-x-2">
                        <button
                            @click="previousPage"
                            class="btn btn-secondary"
                            :disabled="activityLog.pagination.offset === 0"
                            :class="{
                                'opacity-50 cursor-not-allowed':
                                    activityLog.pagination.offset === 0,
                            }">
                            Previous
                        </button>
                        <button
                            @click="nextPage"
                            class="btn btn-secondary"
                            :disabled="!activityLog.pagination.hasMore"
                            :class="{
                                'opacity-50 cursor-not-allowed':
                                    !activityLog.pagination.hasMore,
                            }">
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </template>
    </AdminLayout>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAdminStore } from "../../stores/admin";
import { useToast } from "vue-toastification";
import { format } from "date-fns";
import LoadingSpinner from "../../components/LoadingSpinner.vue";
import AdminLayout from "../../layouts/AdminLayout.vue";

const adminStore = useAdminStore();
const toast = useToast();

const loading = ref(true);
const filters = ref({
    user_id: "",
    action_type: "",
    entity_type: "",
    limit: 50,
    offset: 0,
});

const activityLog = computed(() => adminStore.activityLog);
const users = computed(() => adminStore.users);

const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy HH:mm:ss");
};

const getActionBadgeColor = (actionType) => {
    const colors = {
        view: "bg-blue-100 text-blue-800",
        create: "bg-green-100 text-green-800",
        update: "bg-yellow-100 text-yellow-800",
        delete: "bg-red-100 text-red-800",
        login: "bg-purple-100 text-purple-800",
        logout: "bg-gray-100 text-gray-800",
        register: "bg-indigo-100 text-indigo-800",
        share: "bg-pink-100 text-pink-800",
        error: "bg-orange-100 text-orange-800",
    };

    return colors[actionType] || "bg-gray-100 text-gray-800";
};

const applyFilters = async () => {
    try {
        loading.value = true;
        filters.value.offset = 0; // Reset to first page
        await adminStore.fetchActivityLog(filters.value);
    } catch (error) {
        toast.error("Failed to apply filters");
    } finally {
        loading.value = false;
    }
};

const resetFilters = async () => {
    filters.value = {
        user_id: "",
        action_type: "",
        entity_type: "",
        limit: 50,
        offset: 0,
    };
    await applyFilters();
};

const nextPage = async () => {
    if (activityLog.value.pagination.hasMore) {
        try {
            loading.value = true;
            filters.value.offset += filters.value.limit;
            await adminStore.fetchActivityLog(filters.value);
        } catch (error) {
            toast.error("Failed to load next page");
            filters.value.offset -= filters.value.limit; // Restore previous offset on error
        } finally {
            loading.value = false;
        }
    }
};

const previousPage = async () => {
    if (filters.value.offset > 0) {
        try {
            loading.value = true;
            filters.value.offset = Math.max(
                0,
                filters.value.offset - filters.value.limit,
            );
            await adminStore.fetchActivityLog(filters.value);
        } catch (error) {
            toast.error("Failed to load previous page");
        } finally {
            loading.value = false;
        }
    }
};

onMounted(async () => {
    try {
        loading.value = true;
        // Load users for filter dropdown if not already loaded
        if (!adminStore.users || adminStore.users.length === 0) {
            await adminStore.fetchUsers();
        }
        await adminStore.fetchActivityLog(filters.value);
    } catch (error) {
        toast.error("Failed to load activity log");
    } finally {
        loading.value = false;
    }
});
</script>
