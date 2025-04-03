<template>
    <div class="space-y-6">
        <div v-if="loading" class="py-8">
            <LoadingSpinner />
        </div>
        <template v-else-if="!company">
            <div class="text-center py-8">
                <p class="text-gray-500 mb-4">Company not found</p>
                <router-link to="/companies" class="btn btn-primary">
                    Back to Companies
                </router-link>
            </div>
        </template>
        <template v-else>
            <!-- Company Header -->
            <div
                class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <div class="flex items-center">
                        <router-link
                            to="/companies"
                            class="text-blue-600 hover:text-blue-800 mr-2">
                            <ArrowLeftIcon class="h-5 w-5 inline" />
                        </router-link>
                        <h1 class="text-2xl font-bold">
                            {{ company.company_name }}
                        </h1>
                    </div>
                    <p v-if="company.industry" class="text-gray-600 mt-1">
                        {{ company.industry }}
                    </p>
                </div>
                <div class="mt-4 sm:mt-0 flex space-x-2">
                    <button
                        @click="showEditCompanyModal = true"
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

            <!-- Company Details -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Company Info Card -->
                <div class="card md:col-span-1">
                    <h2 class="text-lg font-medium mb-4">
                        Company Information
                    </h2>
                    <div class="space-y-3">
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                Industry
                            </h3>
                            <p>{{ company.industry || "Not specified" }}</p>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                Website
                            </h3>
                            <p v-if="company.website">
                                <a
                                    :href="ensureHttpPrefix(company.website)"
                                    target="_blank"
                                    class="text-blue-600 hover:underline">
                                    {{ formatWebsite(company.website) }}
                                </a>
                            </p>
                            <p v-else class="text-gray-500">Not specified</p>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                Phone
                            </h3>
                            <p class="whitespace-pre-line">
                                {{ company.phone || "Not specified" }}
                            </p>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                email
                            </h3>
                            <p class="whitespace-pre-line">
                                {{ company.email || "Not specified" }}
                            </p>
                        </div> <div>
                            <h3 class="text-sm font-medium text-gray-500">
                                Address
                            </h3>
                            <p class="whitespace-pre-line">
                                {{ company.address || "Not specified" }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Contacts List -->
                <div class="card md:col-span-2">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-medium">Contacts</h2>
                        <button
                            @click="showAddContactModal = true"
                            class="btn btn-primary btn-sm">
                            <PlusIcon class="h-4 w-4 mr-1 inline" />
                            Add Contact
                        </button>
                    </div>

                    <div v-if="contactsLoading" class="py-4">
                        <LoadingSpinner />
                    </div>
                    <div
                        v-else-if="contacts.length === 0"
                        class="text-center py-6 text-gray-500">
                        No contacts found for this company
                    </div>
                    <div v-else class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th
                                        class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Name
                                    </th>
                                    <th
                                        class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Position
                                    </th>
                                    <th
                                        class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Contact
                                    </th>
                                    <th
                                        class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                <tr
                                    v-for="contact in contacts"
                                    :key="contact.contact_id"
                                    class="hover:bg-gray-50">
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <router-link
                                            :to="`/contacts/${contact.contact_id}`"
                                            class="text-blue-600 hover:underline font-medium">
                                            {{ contact.first_name }}
                                            {{ contact.last_name }}
                                        </router-link>
                                    </td>
                                    <td
                                        class="px-4 py-3 whitespace-nowrap text-gray-700">
                                        {{ contact.position || "N/A" }}
                                    </td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <div v-if="contact.email">
                                            <a
                                                :href="`mailto:${contact.email}`"
                                                class="text-blue-600 hover:underline">
                                                {{ contact.email }}
                                            </a>
                                        </div>
                                        <div
                                            v-if="contact.phone"
                                            class="text-gray-700">
                                            {{ contact.phone }}
                                        </div>
                                    </td>
                                    <td
                                        class="px-4 py-3 whitespace-nowrap text-center">
                                        <div
                                            class="flex justify-center space-x-2">
                                            <router-link
                                                :to="`/contacts/${contact.contact_id}`"
                                                class="text-blue-600 hover:text-blue-900"
                                                title="View Contact">
                                                <EyeIcon class="h-5 w-5" />
                                            </router-link>
                                            <button
                                                @click="
                                                    logCommunication(contact)
                                                "
                                                class="text-green-600 hover:text-green-900"
                                                title="Log Communication">
                                                <ChatBubbleLeftRightIcon
                                                    class="h-5 w-5" />
                                            </button>
                                            <button
                                                @click="
                                                    scheduleMeeting(contact)
                                                "
                                                class="text-purple-600 hover:text-purple-900"
                                                title="Schedule Meeting">
                                                <CalendarIcon class="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Recent Activities -->
            <div class="card">
                <h2 class="text-lg font-medium mb-4">Recent Activities</h2>
                <!-- This would be populated with company activities from the database -->
                <div class="text-center py-6 text-gray-500">
                    No recent activities
                </div>
            </div>
        </template>

        <!-- Edit Company Modal -->
        <div
            v-if="showEditCompanyModal"
            class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h2 class="text-xl font-bold mb-4">Edit Company</h2>
                <CompanyForm
                    :company="company"
                    :is-editing="true"
                    @submit="handleUpdateCompany"
                    @cancel="showEditCompanyModal = false" />
            </div>
        </div>

        <!-- Add Contact Modal -->
        <div
            v-if="showAddContactModal"
            class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h2 class="text-xl font-bold mb-4">Add Contact</h2>
                <ContactForm
                    :preselected-company-id="company?.company_id"
                    @submit="handleCreateContact"
                    @cancel="showAddContactModal = false" />
            </div>
        </div>

        <!-- Schedule Meeting Modal -->
        <div
            v-if="showMeetingModal"
            class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h2 class="text-xl font-bold mb-4">Schedule Meeting</h2>
                <MeetingForm
                    :preselected-contact-id="currentContact?.contact_id"
                    @submit="handleCreateMeeting"
                    @cancel="showMeetingModal = false" />
            </div>
        </div>

        <!-- Log Communication Modal -->
        <div
            v-if="showCommunicationModal"
            class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h2 class="text-xl font-bold mb-4">Log Communication</h2>
                <CommunicationForm
                    :preselected-contact-id="currentContact?.contact_id"
                    @submit="handleCreateCommunication"
                    @cancel="showCommunicationModal = false" />
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <DeleteConfirmation
            v-if="showDeleteModal"
            :message="`Are you sure you want to delete ${company?.company_name}? This will also delete all associated contacts and their data.`"
            @confirm="deleteCompany"
            @cancel="showDeleteModal = false" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import {
    ArrowLeftIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon,
    EyeIcon,
    ChatBubbleLeftRightIcon,
    CalendarIcon,
} from "@heroicons/vue/24/outline";
import { useCompanyStore } from "../stores/companies";
import { useContactStore } from "../stores/contacts";
import { useMeetingStore } from "../stores/meetings";
import { useCommunicationStore } from "../stores/communications";
import CompanyForm from "../components/CompanyForm.vue";
import ContactForm from "../components/ContactForm.vue";
import MeetingForm from "../components/MeetingForm.vue";
import CommunicationForm from "../components/CommunicationForm.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import DeleteConfirmation from "../components/DeleteConfirmation.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const companyStore = useCompanyStore();
const contactStore = useContactStore();
const meetingStore = useMeetingStore();
const communicationStore = useCommunicationStore();

// State
const loading = ref(true);
const contactsLoading = ref(true);
const showEditCompanyModal = ref(false);
const showAddContactModal = ref(false);
const showDeleteModal = ref(false);
const showMeetingModal = ref(false);
const showCommunicationModal = ref(false);
const currentContact = ref(null);

// Computed
const company = computed(() => companyStore.company);
const contacts = computed(() => contactStore.companyContacts);

// Methods
const ensureHttpPrefix = (url) => {
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        return "https://" + url;
    }
    return url;
};

const formatWebsite = (url) => {
    if (!url) return "";
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
};

const fetchCompanyData = async () => {
    const companyId = parseInt(route.params.id);

    try {
        loading.value = true;
        await companyStore.fetchCompany(companyId);

        if (!companyStore.company) {
            toast.error("Company not found");
            return;
        }
    } catch (error) {
        toast.error(
            "Failed to fetch company: " + (error.message || "Unknown error"),
        );
    } finally {
        loading.value = false;
    }

    try {
        contactsLoading.value = true;
        await contactStore.fetchContactsByCompany(companyId);
    } catch (error) {
        toast.error(
            "Failed to fetch contacts: " + (error.message || "Unknown error"),
        );
    } finally {
        contactsLoading.value = false;
    }
};

const handleUpdateCompany = async (formData) => {
    try {
        await companyStore.updateCompany(company.value.company_id, formData);
        showEditCompanyModal.value = false;
        toast.success("Company updated successfully");
    } catch (error) {
        toast.error(
            "Failed to update company: " + (error.message || "Unknown error"),
        );
    }
};

const handleCreateContact = async (formData) => {
    try {
        await contactStore.createContact(formData);
        showAddContactModal.value = false;
        toast.success("Contact created successfully");
        await contactStore.fetchContactsByCompany(company.value.company_id);
    } catch (error) {
        toast.error(
            "Failed to create contact: " + (error.message || "Unknown error"),
        );
    }
};

const scheduleMeeting = (contact) => {
    currentContact.value = contact;
    showMeetingModal.value = true;
};

const logCommunication = (contact) => {
    currentContact.value = contact;
    showCommunicationModal.value = true;
};

const handleCreateMeeting = async (formData) => {
    try {
        await meetingStore.createMeeting(formData);
        showMeetingModal.value = false;
        toast.success("Meeting scheduled successfully");
    } catch (error) {
        toast.error(
            "Failed to schedule meeting: " + (error.message || "Unknown error"),
        );
    }
};

const handleCreateCommunication = async (formData) => {
    try {
        await communicationStore.createCommunication(formData);
        showCommunicationModal.value = false;
        toast.success("Communication logged successfully");
    } catch (error) {
        toast.error(
            "Failed to log communication: " +
                (error.message || "Unknown error"),
        );
    }
};

const deleteCompany = async () => {
    try {
        await companyStore.deleteCompany(company.value.company_id);
        showDeleteModal.value = false;
        toast.success("Company deleted successfully");
        router.push("/companies");
    } catch (error) {
        toast.error(
            "Failed to delete company: " + (error.message || "Unknown error"),
        );
    }
};

// Lifecycle hooks
onMounted(fetchCompanyData);

// Watch for route changes to reload data when navigating between companies
watch(() => route.params.id, fetchCompanyData);
</script>
