<!-- src/views/admin/AdminReports.vue -->
<template>
    <AdminLayout title="System Reports">
    <div class="space-y-6">
        <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold">System Reports</h1>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1">
                <div class="bg-white rounded-lg shadow-md p-4">
                    <h2 class="text-lg font-semibold mb-4">Available Reports</h2>
                    <ul class="space-y-2">
                        <li>
                            <button
                                @click="loadReport('usersActivity')"
                                class="w-full text-left px-4 py-2 rounded-md transition-colors"
                                :class="activeReport === 'usersActivity' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'">
                                User Activity Report
                            </button>
                        </li>
                        <li>
                            <button
                                @click="loadReport('systemOverview')"
                                class="w-full text-left px-4 py-2 rounded-md transition-colors"
                                :class="activeReport === 'systemOverview' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'">
                                System Overview Report
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="lg:col-span-2">
                <div v-if="loading" class="py-8">
                    <LoadingSpinner />
                </div>
                <div v-else-if="!activeReport" class="bg-white rounded-lg shadow-md p-8 text-center">

                    <p class="mt-4 text-gray-600">Select a report from the list to view</p>
                </div>

                <!-- User Activity Report -->
                <div v-else-if="activeReport === 'usersActivity'" class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-xl font-semibold mb-4">User Activity Report</h2>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Username
                                    </th>
                                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Activities
                                    </th>
                                    <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Companies
                                    </th>
                                    <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Contacts
                                    </th>
                                    <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Meetings
                                    </th>
                                    <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Comms
                                    </th>
                                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last Login
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                <tr v-for="user in usersActivity" :key="user.user_id" class="hover:bg-gray-50">
                                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {{ user.username }}
                                    </td>
                                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                        {{ user.email }}
                                    </td>
                                    <td class="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold">
                                        {{ user.activity_count }}
                                    </td>
                                    <td class="px-4 py-3 whitespace-nowrap text-sm text-center">
                                        {{ user.companies_count }}
                                    </td>
                                    <td class="px-4 py-3 whitespace-nowrap text-sm text-center">
                                        {{ user.contacts_count }}
                                    </td>
                                    <td class="px-4 py-3 whitespace-nowrap text-sm text-center">
                                        {{ user.meetings_count }}
                                    </td>
                                    <td class="px-4 py-3 whitespace-nowrap text-sm text-center">
                                        {{ user.communications_count }}
                                    </td>
                                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                        {{ user.last_login ? formatDate(user.last_login) : 'Never' }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- System Overview Report -->
                <div v-else-if="activeReport === 'systemOverview'" class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-xl font-semibold mb-4">System Overview Report</h2>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h3 class="text-lg font-medium mb-3">Time Period Comparison</h3>
                            <div class="overflow-x-auto">
                                <table class="min-w-full divide-y divide-gray-200">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Metric
                                            </th>
                                            <th scope="col" class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Today
                                            </th>
                                            <th scope="col" class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Week
                                            </th>
                                            <th scope="col" class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Month
                                            </th>
                                            <th scope="col" class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Year
                                            </th>
                                            <th scope="col" class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-white divide-y divide-gray-200">
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                Users
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.today.users }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastWeek.users }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastMonth.users }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastYear.users }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center font-medium">
                                                {{ systemOverview.total.users }}
                                            </td>
                                        </tr>
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                Companies
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.today.companies }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastWeek.companies }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastMonth.companies }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastYear.companies }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center font-medium">
                                                {{ systemOverview.total.companies }}
                                            </td>
                                        </tr>
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                Contacts
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.today.contacts }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastWeek.contacts }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastMonth.contacts }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastYear.contacts }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center font-medium">
                                                {{ systemOverview.total.contacts }}
                                            </td>
                                        </tr>
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                Communications
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.today.communications }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastWeek.communications }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastMonth.communications }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastYear.communications }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center font-medium">
                                                {{ systemOverview.total.communications }}
                                            </td>
                                        </tr>
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                Meetings
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.today.meetings }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastWeek.meetings }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastMonth.meetings }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastYear.meetings }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center font-medium">
                                                {{ systemOverview.total.meetings }}
                                            </td>
                                        </tr>
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                Activities
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.today.activities }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastWeek.activities }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastMonth.activities }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center">
                                                {{ systemOverview.lastYear.activities }}
                                            </td>
                                            <td class="px-3 py-2 whitespace-nowrap text-sm text-center font-medium">
                                                {{ systemOverview.total.activities }}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </AdminLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAdminStore } from '../../stores/admin';
import { useToast } from 'vue-toastification';
import { format } from 'date-fns';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import AdminLayout from "../../layouts/AdminLayout.vue";

const adminStore = useAdminStore();
const toast = useToast();

const loading = ref(false);
const activeReport = ref('');

const usersActivity = computed(() => adminStore.reports.usersActivity);
const systemOverview = computed(() => adminStore.reports.systemOverview);

const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
};

const loadReport = async (reportType) => {
    if (activeReport.value === reportType) return;

    try {
        loading.value = true;
        activeReport.value = reportType;

        if (reportType === 'usersActivity') {
            await adminStore.fetchUsersActivityReport();
        } else if (reportType === 'systemOverview') {
            await adminStore.fetchSystemOverviewReport();
        }
    } catch (error) {
        toast.error(`Failed to load ${reportType} report`);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    // Optional: Load a default report on component mount
    // loadReport('usersActivity');
});
</script>
