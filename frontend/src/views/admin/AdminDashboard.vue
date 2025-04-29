<!-- src/views/admin/AdminDashboard.vue -->
<template>
    <AdminLayout>

  <div class="space-y-6">
      <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      <div v-if="loading" class="py-8">
          <LoadingSpinner />
      </div>
      <template v-else-if="stats">
          <!-- User Stats -->
          <div class="card mb-6">
              <h2 class="text-lg font-semibold mb-4">User Statistics</h2>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatsCard
                      title="Total Users"
                      :value="stats.userStats.totalUsers"
                      :icon="UserGroupIcon"
                      bg-color-class="bg-blue-600"
                  />
                  <StatsCard
                      title="Active Users"
                      :value="stats.userStats.activeUsers"
                      :icon="UserIcon"
                      bg-color-class="bg-green-600"
                  />
                  <StatsCard
                      title="Admin Users"
                      :value="stats.userStats.adminUsers"
                      :icon="ShieldCheckIcon"
                      bg-color-class="bg-purple-600"
                  />
                  <StatsCard
                      title="New Users (30d)"
                      :value="stats.userStats.newUsers"
                      :icon="UserPlusIcon"
                      bg-color-class="bg-yellow-600"
                  />
              </div>
          </div>

          <!-- System Statistics -->
          <div class="card mb-6">
              <h2 class="text-lg font-semibold mb-4">System Statistics</h2>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatsCard
                      title="Companies"
                      :value="stats.counts.companies"
                      :icon="BuildingOfficeIcon"
                      bg-color-class="bg-indigo-600"
                  />
                  <StatsCard
                      title="Contacts"
                      :value="stats.counts.contacts"
                      :icon="IdentificationIcon"
                      bg-color-class="bg-pink-600"
                  />
                  <StatsCard
                      title="Communications"
                      :value="stats.counts.communications"
                      :icon="ChatBubbleLeftRightIcon"
                      bg-color-class="bg-cyan-600"
                  />
                  <StatsCard
                      title="Meetings"
                      :value="stats.counts.meetings"
                      :icon="CalendarIcon"
                      bg-color-class="bg-amber-600"
                  />
              </div>
          </div>

          <!-- Recent Activity -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div class="card">
                  <h2 class="text-lg font-semibold mb-4">Recent Activity</h2>
                  <div class="overflow-x-auto">
                      <table class="min-w-full divide-y divide-gray-200">
                          <thead class="bg-gray-50">
                              <tr>
                                  <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      User
                                  </th>
                                  <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      Action
                                  </th>
                                  <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      Entity
                                  </th>
                                  <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      Time
                                  </th>
                              </tr>
                          </thead>
                          <tbody class="bg-white divide-y divide-gray-200">
                              <tr v-for="activity in stats.recentActivities" :key="activity.log_id" class="hover:bg-gray-50">
                                  <td class="px-3 py-2 whitespace-nowrap text-sm">
                                      {{ activity.username }}
                                  </td>
                                  <td class="px-3 py-2 whitespace-nowrap text-sm capitalize">
                                      {{ activity.action_type }}
                                  </td>
                                  <td class="px-3 py-2 whitespace-nowrap text-sm">
                                      {{ activity.entity_type }}
                                      {{ activity.entity_id ? `#${activity.entity_id}` : '' }}
                                  </td>
                                  <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {{ formatDate(activity.created_at) }}
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
                  <div class="mt-4 text-right">
                      <router-link to="/admin/activity-log" class="text-sm text-blue-600 hover:text-blue-800">
                          View all activity
                      </router-link>
                  </div>
              </div>

              <!-- Upcoming Meetings -->
              <div class="card">
                  <h2 class="text-lg font-semibold mb-4">Upcoming Meetings</h2>
                  <div class="overflow-x-auto">
                      <table class="min-w-full divide-y divide-gray-200">
                          <thead class="bg-gray-50">
                              <tr>
                                  <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      Date
                                  </th>
                                  <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      Contact
                                  </th>
                                  <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      Company
                                  </th>
                                  <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      Type
                                  </th>
                              </tr>
                          </thead>
                          <tbody class="bg-white divide-y divide-gray-200">
                              <tr v-for="meeting in stats.upcomingMeetings" :key="meeting.meeting_id" class="hover:bg-gray-50">
                                  <td class="px-3 py-2 whitespace-nowrap text-sm">
                                      {{ formatDate(meeting.meeting_date) }}
                                  </td>
                                  <td class="px-3 py-2 whitespace-nowrap text-sm">
                                      {{ meeting.contact_name }}
                                  </td>
                                  <td class="px-3 py-2 whitespace-nowrap text-sm">
                                      {{ meeting.company_name || 'N/A' }}
                                  </td>
                                  <td class="px-3 py-2 whitespace-nowrap text-sm capitalize">
                                      {{ meeting.meeting_type }}
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      </template>
  </div>

  </AdminLayout>

</template>

<script setup>
import { ref, onMounted } from 'vue';
import { format } from 'date-fns';
import { useAdminStore } from '../../stores/admin';
import { useToast } from 'vue-toastification';
import StatsCard from '../../components/StatsCard.vue';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import {
  UserGroupIcon,
  UserIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon
} from '@heroicons/vue/24/outline';
import AdminLayout from "../../layouts/AdminLayout.vue";

const adminStore = useAdminStore();
const toast = useToast();
const loading = ref(true);

const stats = ref(null);

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'MMM d, yyyy h:mm a');
};

onMounted(async () => {
  try {
      loading.value = true;
      stats.value = await adminStore.fetchAdminDashboard();
  } catch (error) {
      toast.error('Failed to load admin dashboard');
  } finally {
      loading.value = false;
  }
});
</script>
