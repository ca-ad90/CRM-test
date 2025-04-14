<!-- frontend/src/components/ShareResourceModal.vue -->
<template>
  <div class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
      <div class="flex justify-between items-start mb-4">
        <h2 class="text-xl font-bold">Share {{ resourceType }}</h2>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div v-if="loadingUsers || loadingSharedUsers" class="py-4 flex justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>

      <div v-else>
        <div v-if="sharedUsers.length > 0" class="mb-4">
          <h3 class="text-sm font-medium text-gray-700 mb-2">Currently shared with:</h3>
          <ul class="space-y-2">
            <li v-for="user in sharedUsers" :key="user.user_id" class="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>{{ user.username }}</span>
              <span v-if="user.is_owner" class="text-xs text-gray-500">(Owner)</span>
              <button
                v-else
                @click="unshareResource(user.user_id)"
                class="text-red-600 hover:text-red-800"
                title="Remove access"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-2">Share with another user:</h3>

          <div class="space-y-4">
            <div class="relative">
              <select
                v-model="selectedUserId"
                class="input w-full"
                :disabled="availableUsers.length === 0"
              >
                <option value="" disabled selected>Select a user</option>
                <option
                  v-for="user in availableUsers"
                  :key="user.user_id"
                  :value="user.user_id"
                >
                  {{ user.username }}
                </option>
              </select>
            </div>

            <div class="flex justify-end">
              <button
                @click="shareResource"
                class="btn btn-primary"
                :disabled="!selectedUserId || sharingInProgress"
              >
                <span v-if="sharingInProgress" class="mr-2">
                  <svg class="animate-spin h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '../stores/auth';

const props = defineProps({
  resourceType: {
    type: String,
    required: true,
    validator: (value) => ['company', 'contact', 'meeting'].includes(value)
  },
  resourceId: {
    type: [Number, String],
    required: true
  }
});

const emit = defineEmits(['close', 'shared', 'unshared']);
const toast = useToast();
const authStore = useAuthStore();

const loadingUsers = ref(true);
const loadingSharedUsers = ref(true);
const allUsers = ref([]);
const sharedUsers = ref([]);
const selectedUserId = ref('');
const sharingInProgress = ref(false);

// Available users (not yet shared with)
const availableUsers = computed(() => {
  const sharedUserIds = sharedUsers.value.map(user => user.user_id);
  return allUsers.value.filter(user =>
    !sharedUserIds.includes(user.user_id) &&
    user.user_id !== authStore.currentUser?.user_id
  );
});

// Fetch all users
const fetchUsers = async () => {
  loadingUsers.value = true;
  try {
    allUsers.value = await authStore.getUsers();
  } catch (error) {
    console.error('Error fetching users:', error);
    toast.error('Failed to load users');
  } finally {
    loadingUsers.value = false;
  }
};

// Fetch users with access to this resource
const fetchSharedUsers = async () => {
  loadingSharedUsers.value = true;
  try {
    if (props.resourceType === 'company') {
      sharedUsers.value = await authStore.getCompanyUsers(props.resourceId);
    } else if (props.resourceType === 'contact') {
      sharedUsers.value = await authStore.getContactUsers(props.resourceId);
    } else if (props.resourceType === 'meeting') {
      sharedUsers.value = await authStore.getMeetingUsers(props.resourceId);
    }
  } catch (error) {
    console.error(`Error fetching shared users for ${props.resourceType}:`, error);
    toast.error('Failed to load sharing information');
  } finally {
    loadingSharedUsers.value = false;
  }
};

// Share the resource with selected user
const shareResource = async () => {
  if (!selectedUserId.value) return;

  sharingInProgress.value = true;
  try {
    if (props.resourceType === 'company') {
      await authStore.shareCompany(props.resourceId, selectedUserId.value);
    } else if (props.resourceType === 'contact') {
      await authStore.shareContact(props.resourceId, selectedUserId.value);
    } else if (props.resourceType === 'meeting') {
      await authStore.shareMeeting(props.resourceId, selectedUserId.value);
    }

    toast.success(`${props.resourceType} shared successfully`);
    selectedUserId.value = '';
    await fetchSharedUsers(); // Refresh the list
    emit('shared');
  } catch (error) {
    console.error(`Error sharing ${props.resourceType}:`, error);
    toast.error(`Failed to share ${props.resourceType}`);
  } finally {
    sharingInProgress.value = false;
  }
};

// Unshare the resource from a user
const unshareResource = async (userId) => {
  try {
    if (props.resourceType === 'company') {
      await authStore.unshareCompany(props.resourceId, userId);
    } else if (props.resourceType === 'contact') {
      await authStore.unshareContact(props.resourceId, userId);
    } else if (props.resourceType === 'meeting') {
      await authStore.unshareMeeting(props.resourceId, userId);
    }

    toast.success(`Access removed successfully`);
    await fetchSharedUsers(); // Refresh the list
    emit('unshared');
  } catch (error) {
    console.error(`Error removing access for ${props.resourceType}:`, error);
    toast.error(`Failed to remove access`);
  }
};

onMounted(() => {
  fetchUsers();
  fetchSharedUsers();
});
</script>
