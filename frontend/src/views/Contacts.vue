<template>
    <div class="space-y-6">
        <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold">Contacts</h1>
            <button @click="showAddContactModal = true" class="btn btn-primary">
                <PlusIcon class="h-5 w-5 mr-1 inline" />
                Add Contact
            </button>
        </div>

        <div v-if="loading" class="py-8">
            <LoadingSpinner />
        </div>
        <div v-else-if="contacts.length === 0" class="text-center py-8">
            <div class="text-gray-500">No contacts found</div>
            <button
                @click="showAddContactModal = true"
                class="btn btn-primary mt-4">
                Add Your First Contact
            </button>
        </div>
        <div v-else class="overflow-x-auto shadow-md rounded-lg">
            <table class="min-w-full divide-y divide-gray-200 bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Company
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Position
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phone
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
                        v-for="contact in contacts"
                        :key="contact.contact_id"
                        class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <router-link
                                :to="`/contacts/${contact.contact_id}`"
                                class="text-blue-600 hover:underline font-medium">
                                {{ contact.first_name }} {{ contact.last_name }}
                            </router-link>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <router-link
                                v-if="contact.company_id"
                                :to="`/companies/${contact.company_id}`"
                                class="text-blue-600 hover:underline">
                                {{ contact.company_name || "N/A" }}
                            </router-link>
                            <span v-else class="text-gray-500">N/A</span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-gray-700">
                            {{ contact.position || "N/A" }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <a
                                v-if="contact.email"
                                :href="`mailto:${contact.email}`"
                                class="text-blue-600 hover:underline">
                                {{ contact.email }}
                            </a>
                            <span v-else class="text-gray-500">N/A</span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-gray-700">
                            {{ contact.phone || "N/A" }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-center">
                            <div class="flex justify-center space-x-2">
                                <router-link
                                    :to="`/contacts/${contact.contact_id}`"
                                    title="View Details"
                                    class="text-blue-600 hover:text-blue-900">
                                    <EyeIcon class="h-5 w-5" />
                                </router-link>
                                <button
                                    @click="editContact(contact)"
                                    title="Edit Contact"
                                    class="text-indigo-600 hover:text-indigo-900">
                                    <PencilSquareIcon class="h-5 w-5" />
                                </button>
                                <button
                                    @click="confirmDelete(contact)"
                                    title="Delete Contact"
                                    class="text-red-600 hover:text-red-900">
                                    <TrashIcon class="h-5 w-5" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Add/Edit Contact Modal -->
        <div
            v-if="showAddContactModal || showEditContactModal"
            class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h2 class="text-xl font-bold mb-4">
                    {{
                        showEditContactModal
                            ? "Edit Contact"
                            : "Add New Contact"
                    }}
                </h2>
                <ContactForm
                    :contact="currentContact"
                    :is-editing="showEditContactModal"
                    @submit="handleContactSubmit"
                    @cancel="closeModals" />
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <DeleteConfirmation
            v-if="showDeleteModal"
            :message="`Are you sure you want to delete the contact for ${currentContact?.first_name} ${currentContact?.last_name}? This will also delete all associated meetings and communications.`"
            @confirm="deleteContact"
            @cancel="showDeleteModal = false" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    EyeIcon,
} from "@heroicons/vue/24/outline";
import { useContactStore } from "../stores/contacts";
import ContactForm from "../components/ContactForm.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import DeleteConfirmation from "../components/DeleteConfirmation.vue";

const contactStore = useContactStore();
const toast = useToast();

// State
const showAddContactModal = ref(false);
const showEditContactModal = ref(false);
const showDeleteModal = ref(false);
const currentContact = ref(null);
const loading = ref(true);

// Computed
const contacts = computed(() => contactStore.contacts);

// Methods
const editContact = (contact) => {
    currentContact.value = { ...contact };
    showEditContactModal.value = true;
};

const confirmDelete = (contact) => {
    currentContact.value = contact;
    showDeleteModal.value = true;
};

const closeModals = () => {
    showAddContactModal.value = false;
    showEditContactModal.value = false;
    showDeleteModal.value = false;
    currentContact.value = null;
};

const handleContactSubmit = async (formData) => {
    try {
        if (showEditContactModal.value) {
            await contactStore.updateContact(
                currentContact.value.contact_id,
                formData,
            );
            toast.success("Contact updated successfully");
        } else {
            await contactStore.createContact(formData);
            toast.success("Contact created successfully");
        }
        closeModals();
    } catch (error) {
        toast.error("An error occurred: " + (error.message || "Unknown error"));
    }
};

const deleteContact = async () => {
    try {
        await contactStore.deleteContact(currentContact.value.contact_id);
        toast.success("Contact deleted successfully");
        closeModals();
    } catch (error) {
        toast.error(
            "Failed to delete contact: " + (error.message || "Unknown error"),
        );
    }
};

// Lifecycle hooks
onMounted(async () => {
    try {
        await contactStore.fetchContacts();
    } catch (error) {
        toast.error(
            "Failed to fetch contacts: " + (error.message || "Unknown error"),
        );
    } finally {
        loading.value = false;
    }
});
</script>
