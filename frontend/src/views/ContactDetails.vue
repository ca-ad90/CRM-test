<template>
    <div class="space-y-6">
        <div v-if="loading" class="py-8">
            <LoadingSpinner />
        </div>
        <template v-else-if="!contact">
            <div class="text-center py-8">
                <p class="text-gray-500 mb-4">Contact not found</p>
                <router-link to="/contacts" class="btn btn-primary">
                    Back to Contacts
                </router-link>
            </div>
        </template>
        <template v-else>
            <!-- Contact Header -->
            <div
                class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <div class="flex items-center">
                        <router-link
                            to="/contacts"
                            class="text-blue-600 hover:text-blue-800 mr-2">
                            <ArrowLeftIcon class="h-5 w-5 inline" />
                        </router-link>
                        <h1 class="text-2xl font-bold">
                            {{ contact.first_name }} {{ contact.last_name }}
                        </h1>
                    </div>
                    <p v-if="contact.position" class="text-gray-600 mt-1">
                        {{ contact.position }}
                    </p>
                </div>
                <div class="mt-4 sm:mt-0 flex space-x-2">
                    <button
                        @click="showEditContactModal = true"
                        class="btn btn-secondary">
                        <PencilIcon class="h-5 w-5 mr-1 inline" />
                        Edit
                    </button>
                    <button
                        @click="showDeleteModal = true"
                        class="btn btn-danger">
                        <TrashIcon class="h-5 w-5 mr-1 inline" />
                        Delete
                    </button>
                </div>
            </div>

            <!-- Contact Details -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Contact Info Card -->
                <div class="card md:col-span-1">
                    <h2 class="text-lg font-medium mb-4">
                        Contact Information
                    </h2>
                    <div class="space-y-3">
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                Company
                            </h3>
                            <p v-if="contact.company_id">
                                <router-link
                                    :to="`/companies/${contact.company_id}`"
                                    class="text-blue-600 hover:underline">
                                    {{ contact.company_name }}
                                </router-link>
                            </p>
                            <p v-else class="text-gray-500">
                                Not associated with any company
                            </p>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                Position
                            </h3>
                            <p>{{ contact.position || "Not specified" }}</p>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                Email
                            </h3>
                            <p v-if="contact.email">
                                <a
                                    :href="`mailto:${contact.email}`"
                                    class="text-blue-600 hover:underline">
                                    {{ contact.email }}
                                </a>
                            </p>
                            <p v-else class="text-gray-500">Not specified</p>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                Phone
                            </h3>
                            <p v-if="contact.phone">
                                <a
                                    :href="`tel:${contact.phone}`"
                                    class="text-blue-600 hover:underline">
                                    {{ contact.phone }}
                                </a>
                            </p>
                            <p v-else class="text-gray-500">Not specified</p>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                LinkedIn
                            </h3>
                            <p v-if="contact.linkedin_url">
                                <a
                                    :href="
                                        ensureHttpPrefix(contact.linkedin_url)
                                    "
                                    target="_blank"
                                    class="text-blue-600 hover:underline">
                                    {{ formatUrl(contact.linkedin_url) }}
                                </a>
                            </p>
                            <p v-else class="text-gray-500">Not specified</p>
                        </div>
                    </div>
                    <div class="mt-6 flex flex-col space-y-2">
                        <button
                            @click="scheduleMeeting"
                            class="btn btn-primary">
                            <CalendarIcon class="h-5 w-5 mr-1 inline" />
                            Schedule Meeting
                        </button>
                        <button
                            @click="logCommunication"
                            class="btn btn-secondary">
                            <ChatBubbleLeftRightIcon
                                class="h-5 w-5 mr-1 inline" />
                            Log Communication
                        </button>
                    </div>
                </div>

                <!-- Communications -->
                <div class="card md:col-span-2">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-medium">Communications</h2>
                        <button
                            @click="logCommunication"
                            class="btn btn-primary btn-sm">
                            <PlusIcon class="h-4 w-4 mr-1 inline" />
                            Log New
                        </button>
                    </div>

                    <div v-if="communicationsLoading" class="py-4">
                        <LoadingSpinner />
                    </div>
                    <div
                        v-else-if="communications.length === 0"
                        class="text-center py-6 text-gray-500">
                        No communications logged with this contact
                    </div>
                    <ul v-else class="space-y-4">
                        <li
                            v-for="comm in communications"
                            :key="comm.communication_id"
                            class="border-b border-gray-200 pb-4 last:border-b-0">
                            <div class="flex items-start">
                                <div class="flex-shrink-0">
                                    <div
                                        class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                        <component
                                            :is="
                                                getCommunicationIcon(
                                                    comm.contact_method,
                                                )
                                            "
                                            class="h-5 w-5 text-blue-600" />
                                    </div>
                                </div>
                                <div class="ml-3 flex-1">
                                    <div class="flex justify-between">
                                        <p class="text-sm font-medium">
                                            {{
                                                capitalizeFirst(
                                                    comm.contact_method,
                                                )
                                            }}
                                            <span class="text-gray-500"
                                                >on</span
                                            >
                                            {{
                                                formatDate(comm.date_contacted)
                                            }}
                                        </p>
                                        <div class="flex space-x-2">
                                            <button
                                                @click="editCommunication(comm)"
                                                class="text-indigo-600 hover:text-indigo-900"
                                                title="Edit">
                                                <PencilSquareIcon
                                                    class="h-4 w-4" />
                                            </button>
                                            <button
                                                @click="
                                                    deleteCommunicationConfirm(
                                                        comm,
                                                    )
                                                "
                                                class="text-red-600 hover:text-red-900"
                                                title="Delete">
                                                <TrashIcon class="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p
                                        class="mt-1 text-sm text-gray-800 whitespace-pre-line">
                                        {{ comm.message_content }}
                                    </p>

                                    <div
                                        v-if="comm.received_response"
                                        class="mt-3 bg-gray-50 p-3 rounded-md">
                                        <p class="text-xs text-gray-500">
                                            Response received
                                            {{
                                                comm.response_date
                                                    ? `on ${formatDate(
                                                          comm.response_date,
                                                      )}`
                                                    : ""
                                            }}
                                        </p>
                                        <p
                                            class="mt-1 text-sm text-gray-800 whitespace-pre-line">
                                            {{ comm.response_content }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Meetings Section -->
            <div class="card">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-medium">Meetings</h2>
                    <button
                        @click="scheduleMeeting"
                        class="btn btn-primary btn-sm">
                        <PlusIcon class="h-4 w-4 mr-1 inline" />
                        Schedule New
                    </button>
                </div>

                <div v-if="meetingsLoading" class="py-4">
                    <LoadingSpinner />
                </div>
                <div
                    v-else-if="meetings.length === 0"
                    class="text-center py-6 text-gray-500">
                    No meetings scheduled with this contact
                </div>
                <div v-else class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th
                                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Date & Time
                                </th>
                                <th
                                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Type
                                </th>
                                <th
                                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Location
                                </th>
                                <th
                                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Status
                                </th>
                                <th
                                    class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <tr
                                v-for="meeting in meetings"
                                :key="meeting.meeting_id"
                                class="hover:bg-gray-50">
                                <td class="px-4 py-3 whitespace-nowrap">
                                    {{ formatDateTime(meeting.meeting_date) }}
                                </td>
                                <td
                                    class="px-4 py-3 whitespace-nowrap text-gray-700">
                                    {{ capitalizeFirst(meeting.meeting_type) }}
                                </td>
                                <td
                                    class="px-4 py-3 whitespace-nowrap text-gray-700">
                                    {{ meeting.location || "N/A" }}
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap">
                                    <span
                                        :class="[
                                            'px-2 py-1 text-xs font-medium rounded-full capitalize',
                                            meeting.meeting_status ===
                                            'completed'
                                                ? 'bg-green-100 text-green-800'
                                                : meeting.meeting_status ===
                                                  'cancelled'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-blue-100 text-blue-800',
                                        ]">
                                        {{ meeting.meeting_status }}
                                    </span>
                                </td>
                                <td
                                    class="px-4 py-3 whitespace-nowrap text-center">
                                    <div class="flex justify-center space-x-2">
                                        <button
                                            @click="editMeeting(meeting)"
                                            class="text-indigo-600 hover:text-indigo-900"
                                            title="Edit Meeting">
                                            <PencilSquareIcon class="h-5 w-5" />
                                        </button>
                                        <button
                                            @click="
                                                deleteMeetingConfirm(meeting)
                                            "
                                            class="text-red-600 hover:text-red-900"
                                            title="Delete Meeting">
                                            <TrashIcon class="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </template>

        <!-- Edit Contact Modal -->
        <div
            v-if="showEditContactModal"
            class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h2 class="text-xl font-bold mb-4">Edit Contact</h2>
                <ContactForm
                    :contact="contact"
                    :is-editing="true"
                    @submit="handleUpdateContact"
                    @cancel="showEditContactModal = false" />
            </div>
        </div>

        <!-- Schedule Meeting Modal -->
        <div
            v-if="showMeetingModal"
            class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h2 class="text-xl font-bold mb-4">
                    {{ currentMeeting ? "Edit Meeting" : "Schedule Meeting" }}
                </h2>
                <MeetingForm
                    :meeting="currentMeeting"
                    :is-editing="!!currentMeeting"
                    :preselected-contact-id="contact?.contact_id"
                    @submit="handleMeetingSubmit"
                    @cancel="closeMeetingModal" />
            </div>
        </div>

        <!-- Log Communication Modal -->
        <div
            v-if="showCommunicationModal"
            class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h2 class="text-xl font-bold mb-4">
                    {{
                        currentCommunication
                            ? "Edit Communication"
                            : "Log Communication"
                    }}
                </h2>
                <CommunicationForm
                    :communication="currentCommunication"
                    :is-editing="!!currentCommunication"
                    :preselected-contact-id="contact?.contact_id"
                    @submit="handleCommunicationSubmit"
                    @cancel="closeCommunicationModal" />
            </div>
        </div>

        <!-- Delete Contact Confirmation Modal -->
        <DeleteConfirmation
            v-if="showDeleteModal"
            :message="`Are you sure you want to delete ${contact?.first_name} ${contact?.last_name}? This will also delete all associated meetings and communications.`"
            @confirm="deleteContact"
            @cancel="showDeleteModal = false" />

        <!-- Delete Meeting Confirmation Modal -->
        <DeleteConfirmation
            v-if="showDeleteMeetingModal"
            :message="`Are you sure you want to delete this meeting?`"
            @confirm="deleteMeeting"
            @cancel="showDeleteMeetingModal = false" />

        <!-- Delete Communication Confirmation Modal -->
        <DeleteConfirmation
            v-if="showDeleteCommunicationModal"
            :message="`Are you sure you want to delete this communication record?`"
            @confirm="deleteCommunication"
            @cancel="showDeleteCommunicationModal = false" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { format } from "date-fns";
import {
    ArrowLeftIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon,
    CalendarIcon,
    ChatBubbleLeftRightIcon,
    PhoneIcon,
    EnvelopeIcon,
    UserIcon,
    PencilSquareIcon,
} from "@heroicons/vue/24/outline";
import { useContactStore } from "../stores/contacts";
import { useMeetingStore } from "../stores/meetings";
import { useCommunicationStore } from "../stores/communications";
import ContactForm from "../components/ContactForm.vue";
import MeetingForm from "../components/MeetingForm.vue";
import CommunicationForm from "../components/CommunicationForm.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import DeleteConfirmation from "../components/DeleteConfirmation.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const contactStore = useContactStore();
const meetingStore = useMeetingStore();
const communicationStore = useCommunicationStore();

// State
const loading = ref(true);
const communicationsLoading = ref(true);
const meetingsLoading = ref(true);
const showEditContactModal = ref(false);
const showDeleteModal = ref(false);
const showMeetingModal = ref(false);
const showCommunicationModal = ref(false);
const showDeleteMeetingModal = ref(false);
const showDeleteCommunicationModal = ref(false);
const currentMeeting = ref(null);
const currentCommunication = ref(null);

// Computed
const contact = computed(() => contactStore.contact);
const communications = computed(() => communicationStore.contactCommunications);
const meetings = computed(() => meetingStore.contactMeetings);

// Methods
const ensureHttpPrefix = (url) => {
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        return "https://" + url;
    }
    return url;
};

const formatUrl = (url) => {
    if (!url) return "";
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
};

const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy");
};

const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
};

const capitalizeFirst = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const getCommunicationIcon = (method) => {
    switch (method?.toLowerCase()) {
        case "email":
            return EnvelopeIcon;
        case "phone":
            return PhoneIcon;
        case "linkedin":
            return UserIcon;
        default:
            return ChatBubbleLeftRightIcon;
    }
};

const fetchContactData = async () => {
    const contactId = parseInt(route.params.id);

    try {
        loading.value = true;
        await contactStore.fetchContact(contactId);

        if (!contactStore.contact) {
            toast.error("Contact not found");
            return;
        }
    } catch (error) {
        toast.error(
            "Failed to fetch contact: " + (error.message || "Unknown error"),
        );
    } finally {
        loading.value = false;
    }

    try {
        communicationsLoading.value = true;
        await communicationStore.fetchCommunicationsByContact(contactId);
    } catch (error) {
        toast.error(
            "Failed to fetch communications: " +
                (error.message || "Unknown error"),
        );
    } finally {
        communicationsLoading.value = false;
    }

    try {
        meetingsLoading.value = true;
        await meetingStore.fetchMeetingsByContact(contactId);
    } catch (error) {
        toast.error(
            "Failed to fetch meetings: " + (error.message || "Unknown error"),
        );
    } finally {
        meetingsLoading.value = false;
    }
};

const handleUpdateContact = async (formData) => {
    try {
        await contactStore.updateContact(contact.value.contact_id, formData);
        showEditContactModal.value = false;
        toast.success("Contact updated successfully");
    } catch (error) {
        toast.error(
            "Failed to update contact: " + (error.message || "Unknown error"),
        );
    }
};

const deleteContact = async () => {
    try {
        await contactStore.deleteContact(contact.value.contact_id);
        showDeleteModal.value = false;
        toast.success("Contact deleted successfully");
        router.push("/contacts");
    } catch (error) {
        toast.error(
            "Failed to delete contact: " + (error.message || "Unknown error"),
        );
    }
};

// Meeting functions
const scheduleMeeting = () => {
    currentMeeting.value = null;
    showMeetingModal.value = true;
};

const editMeeting = (meeting) => {
    currentMeeting.value = { ...meeting };
    showMeetingModal.value = true;
};

const deleteMeetingConfirm = (meeting) => {
    currentMeeting.value = meeting;
    showDeleteMeetingModal.value = true;
};

const closeMeetingModal = () => {
    showMeetingModal.value = false;
    currentMeeting.value = null;
};

const handleMeetingSubmit = async (formData) => {
    try {
        if (currentMeeting.value) {
            await meetingStore.updateMeeting(
                currentMeeting.value.meeting_id,
                formData,
            );
            toast.success("Meeting updated successfully");
        } else {
            await meetingStore.createMeeting(formData);
            toast.success("Meeting scheduled successfully");
        }
        closeMeetingModal();
        await meetingStore.fetchMeetingsByContact(contact.value.contact_id);
    } catch (error) {
        toast.error(
            "Failed to save meeting: " + (error.message || "Unknown error"),
        );
    }
};

const deleteMeeting = async () => {
    try {
        await meetingStore.deleteMeeting(currentMeeting.value.meeting_id);
        showDeleteMeetingModal.value = false;
        toast.success("Meeting deleted successfully");
        await meetingStore.fetchMeetingsByContact(contact.value.contact_id);
    } catch (error) {
        toast.error(
            "Failed to delete meeting: " + (error.message || "Unknown error"),
        );
    }
};

// Communication functions
const logCommunication = () => {
    currentCommunication.value = null;
    showCommunicationModal.value = true;
};

const editCommunication = (communication) => {
    currentCommunication.value = { ...communication };
    showCommunicationModal.value = true;
};

const deleteCommunicationConfirm = (communication) => {
    currentCommunication.value = communication;
    showDeleteCommunicationModal.value = true;
};

const closeCommunicationModal = () => {
    showCommunicationModal.value = false;
    currentCommunication.value = null;
};

const handleCommunicationSubmit = async (formData) => {
    try {
        if (currentCommunication.value) {
            await communicationStore.updateCommunication(
                currentCommunication.value.communication_id,
                formData,
            );
            toast.success("Communication updated successfully");
        } else {
            await communicationStore.createCommunication(formData);
            toast.success("Communication logged successfully");
        }
        closeCommunicationModal();
        await communicationStore.fetchCommunicationsByContact(
            contact.value.contact_id,
        );
    } catch (error) {
        toast.error(
            "Failed to save communication: " +
                (error.message || "Unknown error"),
        );
    }
};

const deleteCommunication = async () => {
    try {
        await communicationStore.deleteCommunication(
            currentCommunication.value.communication_id,
        );
        showDeleteCommunicationModal.value = false;
        toast.success("Communication deleted successfully");
        await communicationStore.fetchCommunicationsByContact(
            contact.value.contact_id,
        );
    } catch (error) {
        toast.error(
            "Failed to delete communication: " +
                (error.message || "Unknown error"),
        );
    }
};

// Lifecycle hooks
onMounted(fetchContactData);

// Watch for route changes to reload data when navigating between contacts
watch(() => route.params.id, fetchContactData);
</script>
