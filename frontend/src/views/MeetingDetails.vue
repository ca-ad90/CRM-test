<!-- File: src/views/MeetingDetails.vue -->
<template>
  <div class="space-y-6">
    <div v-if="loading" class="py-8">
      <LoadingSpinner />
    </div>
    <template v-else-if="!meeting">
      <div class="text-center py-8">
        <p class="text-gray-500 mb-4">Meeting not found</p>
        <router-link to="/meetings" class="btn btn-primary">
          Back to Meetings
        </router-link>
      </div>
    </template>
    <template v-else>
      <!-- Meeting Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <div class="flex items-center">
            <router-link to="/meetings" class="text-blue-600 hover:text-blue-800 mr-2">
              <ArrowLeftIcon class="h-5 w-5 inline" />
            </router-link>
            <h1 class="text-2xl font-bold">
              {{ meeting.meeting_type.charAt(0).toUpperCase() + meeting.meeting_type.slice(1) }} Meeting
            </h1>
          </div>
          <p class="text-gray-600 mt-1">
            With <router-link :to="`/contacts/${meeting.contact_id}`" class="text-blue-600 hover:underline">
              {{ meeting.first_name }} {{ meeting.last_name }}
            </router-link>
            <span v-if="meeting.company_name">
              at <router-link :to="`/companies/${meeting.company_id}`" class="text-blue-600 hover:underline">
                {{ meeting.company_name }}
              </router-link>
            </span>
          </p>
        </div>
        <div class="mt-4 sm:mt-0 flex space-x-2">
          <button @click="showEditMeetingModal = true" class="btn btn-secondary">
            <PencilIcon class="h-5 w-5 mr-1 inline" />
            Edit
          </button>
          <button @click="showDeleteModal = true" class="btn btn-danger">
            <TrashIcon class="h-5 w-5 mr-1 inline" />
            Delete
          </button>
        </div>
      </div>

      <!-- Meeting Details Card -->
      <div class="card">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <h3 class="text-sm font-medium text-gray-500">Date & Time</h3>
              <p class="text-gray-900 font-medium">{{ formatDateTime(meeting.meeting_date) }}</p>
            </div>

            <div>
              <h3 class="text-sm font-medium text-gray-500">Location</h3>
              <p class="text-gray-900">{{ meeting.location || 'Not specified' }}</p>
            </div>

            <div>
              <h3 class="text-sm font-medium text-gray-500">Status</h3>
              <p>
                <span :class="[
                  'px-2 py-1 text-xs font-medium rounded-full capitalize',
                  meeting.meeting_status === 'completed' ? 'bg-green-100 text-green-800' :
                  meeting.meeting_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                ]">
                  {{ meeting.meeting_status }}
                </span>
              </p>
            </div>

            <div v-if="meeting.follow_up_needed">
              <h3 class="text-sm font-medium text-gray-500">Follow-up</h3>
              <p class="text-yellow-600 font-medium">
                <CheckCircleIcon class="h-5 w-5 inline mr-1" />
                Follow-up needed
              </p>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-medium text-gray-500">Contact Information</h3>
            <div class="mt-2 space-y-2">
              <div v-if="contactDetails">
                <p class="text-gray-900 font-medium">
                  <router-link :to="`/contacts/${meeting.contact_id}`" class="text-blue-600 hover:underline">
                    {{ contactDetails.first_name }} {{ contactDetails.last_name }}
                  </router-link>
                </p>
                <p v-if="contactDetails.position" class="text-gray-700">{{ contactDetails.position }}</p>
                <p v-if="contactDetails.email" class="text-gray-700">
                  <a :href="`mailto:${contactDetails.email}`" class="text-blue-600 hover:underline">
                    {{ contactDetails.email }}
                  </a>
                </p>
                <p v-if="contactDetails.phone" class="text-gray-700">
                  <a :href="`tel:${contactDetails.phone}`" class="text-blue-600 hover:underline">
                    {{ contactDetails.phone }}
                  </a>
                </p>
              </div>
              <div v-else>
                <p class="text-gray-600">Loading contact details...</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6">
          <h3 class="text-sm font-medium text-gray-500">Meeting Notes</h3>
          <div class="mt-2 p-4 bg-gray-50 rounded-md min-h-[100px]">
            <p v-if="meeting.meeting_notes" class="whitespace-pre-line">{{ meeting.meeting_notes }}</p>
            <p v-else class="text-gray-500 italic">No notes for this meeting</p>
          </div>
        </div>

        <div class="mt-6" v-if="meeting.meeting_status === 'completed'">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-medium text-gray-500">Follow-up Actions</h3>
            <button @click="showAddFollowUpModal = true" class="btn btn-primary btn-sm">
              <PlusIcon class="h-4 w-4 mr-1 inline" />
              Add Follow-up
            </button>
          </div>

          <div class="mt-2">
            <!-- This would display follow-up actions if we had them in our data model -->
            <p class="text-gray-500 italic">No follow-up actions recorded</p>
          </div>
        </div>

        <div class="mt-6 border-t pt-6" v-if="meeting.contact_id">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-medium text-gray-500">Communication History with this Contact</h3>
            <router-link :to="`/contacts/${meeting.contact_id}`" class="text-blue-600 hover:underline text-sm">
              View All Communications
            </router-link>
          </div>

          <div class="mt-4">
            <div v-if="communicationsLoading" class="py-4">
              <LoadingSpinner />
            </div>
            <div v-else-if="communications.length === 0" class="text-center py-4">
              <p class="text-gray-500">No communications recorded with this contact</p>
              <button @click="logCommunication" class="btn btn-primary mt-2">
                Log a Communication
              </button>
            </div>
            <div v-else>
              <div class="space-y-4">
                <div v-for="comm in recentCommunications" :key="comm.communication_id" class="bg-gray-50 p-4 rounded-md">
                  <div class="flex items-start">
                    <div class="flex-shrink-0">
                      <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <component
                          :is="getCommunicationIcon(comm.contact_method)"
                          class="h-5 w-5 text-blue-600"
                        />
                      </div>
                    </div>
                    <div class="ml-3 flex-1">
                      <div class="flex justify-between">
                        <p class="text-sm font-medium">
                          {{ capitalizeFirst(comm.contact_method) }}
                          <span class="text-gray-500">on</span>
                          {{ formatDate(comm.date_contacted) }}
                        </p>
                      </div>
                      <p class="mt-1 text-sm text-gray-800">{{ truncateText(comm.message_content, 100) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Edit Meeting Modal -->
    <div v-if="showEditMeetingModal" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h2 class="text-xl font-bold mb-4">Edit Meeting</h2>
        <MeetingForm
          :meeting="meeting"
          :is-editing="true"
          @submit="handleUpdateMeeting"
          @cancel="showEditMeetingModal = false"
        />
      </div>
    </div>

    <!-- Log Communication Modal -->
    <div v-if="showCommunicationModal" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h2 class="text-xl font-bold mb-4">Log Communication</h2>
        <CommunicationForm
          :preselected-contact-id="meeting?.contact_id"
          @submit="handleCreateCommunication"
          @cancel="showCommunicationModal = false"
        />
      </div>
    </div>

    <!-- Add Follow-up Modal -->
    <div v-if="showAddFollowUpModal" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h2 class="text-xl font-bold mb-4">Add Follow-up Action</h2>
        <p class="text-gray-600 mb-6">This feature would allow adding specific follow-up tasks or actions based on this meeting.</p>
        <div class="flex justify-end">
          <button @click="showAddFollowUpModal = false" class="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmation
      v-if="showDeleteModal"
      :message="`Are you sure you want to delete this meeting?`"
      @confirm="deleteMeeting"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon
} from '@heroicons/vue/24/outline';
import { useMeetingStore } from '../stores/meetings';
import { useContactStore } from '../stores/contacts';
import { useCommunicationStore } from '../stores/communications';
import MeetingForm from '../components/MeetingForm.vue';
import CommunicationForm from '../components/CommunicationForm.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import DeleteConfirmation from '../components/DeleteConfirmation.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const meetingStore = useMeetingStore();
const contactStore = useContactStore();
const communicationStore = useCommunicationStore();

// State
const loading = ref(true);
const communicationsLoading = ref(true);
const showEditMeetingModal = ref(false);
const showDeleteModal = ref(false);
const showCommunicationModal = ref(false);
const showAddFollowUpModal = ref(false);
const contactDetails = ref(null);

// Computed
const meeting = computed(() => meetingStore.meeting);
const communications = computed(() => communicationStore.contactCommunications);
const recentCommunications = computed(() => communications.value.slice(0, 3));

// Methods
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'EEEE, MMMM d, yyyy h:mm a');
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'MMM d, yyyy');
};

const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const truncateText = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

const getCommunicationIcon = (method) => {
  switch (method?.toLowerCase()) {
    case 'email':
      return EnvelopeIcon;
    case 'phone':
      return PhoneIcon;
    case 'linkedin':
      return UserIcon;
    default:
      return ChatBubbleLeftRightIcon;
  }
};

const fetchMeetingData = async () => {
  const meetingId = parseInt(route.params.id);

  try {
    loading.value = true;
    await meetingStore.fetchMeeting(meetingId);

    if (!meetingStore.meeting) {
      toast.error('Meeting not found');
      return;
    }
  } catch (error) {
    toast.error('Failed to fetch meeting: ' + (error.message || 'Unknown error'));
  } finally {
    loading.value = false;
  }

  if (meeting.value && meeting.value.contact_id) {
    try {
      contactDetails.value = null;
      const contactResponse = await contactStore.fetchContact(meeting.value.contact_id);
      contactDetails.value = contactResponse;

      // Fetch communications for this contact
      communicationsLoading.value = true;
      await communicationStore.fetchCommunicationsByContact(meeting.value.contact_id);
    } catch (error) {
      toast.error('Failed to fetch contact details: ' + (error.message || 'Unknown error'));
    } finally {
      communicationsLoading.value = false;
    }
  }
};

const handleUpdateMeeting = async (formData) => {
  try {
    await meetingStore.updateMeeting(meeting.value.meeting_id, formData);
    showEditMeetingModal.value = false;
    toast.success('Meeting updated successfully');
    await fetchMeetingData(); // Refresh meeting data
  } catch (error) {
    toast.error('Failed to update meeting: ' + (error.message || 'Unknown error'));
  }
};

const deleteMeeting = async () => {
  try {
    await meetingStore.deleteMeeting(meeting.value.meeting_id);
    showDeleteModal.value = false;
    toast.success('Meeting deleted successfully');
    router.push('/meetings');
  } catch (error) {
    toast.error('Failed to delete meeting: ' + (error.message || 'Unknown error'));
  }
};

const logCommunication = () => {
  showCommunicationModal.value = true;
};

const handleCreateCommunication = async (formData) => {
  try {
    await communicationStore.createCommunication(formData);
    showCommunicationModal.value = false;
    toast.success('Communication logged successfully');

    // Refresh communications data
    if (meeting.value && meeting.value.contact_id) {
      await communicationStore.fetchCommunicationsByContact(meeting.value.contact_id);
    }
  } catch (error) {
    toast.error('Failed to log communication: ' + (error.message || 'Unknown error'));
  }
};

// Lifecycle hooks
onMounted(fetchMeetingData);

// Watch for route changes to reload data when navigating between meetings
watch(() => route.params.id, fetchMeetingData);
</script>
