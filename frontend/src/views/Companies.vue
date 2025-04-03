<template>
    <div class="space-y-6">
        <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold">Companies</h1>
            <button @click="showAddCompanyModal = true" class="btn btn-primary">
                <PlusIcon class="h-5 w-5 mr-1 inline" />
                Add Company
            </button>
        </div>

        <div v-if="loading" class="py-8">
            <LoadingSpinner />
        </div>
        <div v-else-if="companies.length === 0" class="text-center py-8">
            <div class="text-gray-500">No companies found</div>
            <button
                @click="showAddCompanyModal = true"
                class="btn btn-primary mt-4">
                Add Your First Company
            </button>
        </div>
        <div v-else class="overflow-x-auto shadow-md rounded-lg">
            <table class="min-w-full divide-y divide-gray-200 bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Company Name
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Industry
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contacts
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Website
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
                        v-for="company in companies"
                        :key="company.company_id"
                        class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <router-link
                                :to="`/companies/${company.company_id}`"
                                class="text-blue-600 hover:underline font-medium">
                                {{ company.company_name }}
                            </router-link>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-gray-700">
                            {{ company.industry || "N/A" }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <router-link
                                :to="`/companies/${company.company_id}`"
                                class="text-blue-600 hover:underline">
                                View Contacts
                            </router-link>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <a
                                v-if="company.website"
                                :href="ensureHttpPrefix(company.website)"
                                target="_blank"
                                class="text-blue-600 hover:underline">
                                {{ formatWebsite(company.website) }}
                            </a>
                            <span v-else class="text-gray-500">N/A</span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-center">
                            <div class="flex justify-center space-x-2">
                                <button
                                    @click="editCompany(company)"
                                    class="text-indigo-600 hover:text-indigo-900"
                                    title="Edit Company">
                                    <PencilSquareIcon class="h-5 w-5" />
                                </button>
                                <button
                                    @click="confirmDelete(company)"
                                    class="text-red-600 hover:text-red-900"
                                    title="Delete Company">
                                    <TrashIcon class="h-5 w-5" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Add/Edit Company Modal -->
        <div
            v-if="showAddCompanyModal || showEditCompanyModal"
            class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h2 class="text-xl font-bold mb-4">
                    {{
                        showEditCompanyModal
                            ? "Edit Company"
                            : "Add New Company"
                    }}
                </h2>
                <CompanyForm
                    :company="currentCompany"
                    :is-editing="showEditCompanyModal"
                    @submit="handleCompanySubmit"
                    @cancel="closeModals" />
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <DeleteConfirmation
            v-if="showDeleteModal"
            :message="`Are you sure you want to delete ${currentCompany?.company_name}? This will also delete all associated contacts and their data.`"
            @confirm="deleteCompany"
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
} from "@heroicons/vue/24/outline";
import { useCompanyStore } from "../stores/companies";
import CompanyForm from "../components/CompanyForm.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import DeleteConfirmation from "../components/DeleteConfirmation.vue";

const companyStore = useCompanyStore();
const toast = useToast();

// State
const showAddCompanyModal = ref(false);
const showEditCompanyModal = ref(false);
const showDeleteModal = ref(false);
const currentCompany = ref(null);
const loading = ref(true);

// Computed
const companies = computed(() => companyStore.companies);

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

const editCompany = (company) => {
    currentCompany.value = { ...company };
    showEditCompanyModal.value = true;
};

const confirmDelete = (company) => {
    currentCompany.value = company;
    showDeleteModal.value = true;
};

const closeModals = () => {
    showAddCompanyModal.value = false;
    showEditCompanyModal.value = false;
    showDeleteModal.value = false;
    currentCompany.value = null;
};

const handleCompanySubmit = async (formData) => {
    try {
        if (showEditCompanyModal.value) {
            await companyStore.updateCompany(
                currentCompany.value.company_id,
                formData,
            );
            toast.success("Company updated successfully");
        } else {
            await companyStore.createCompany(formData);
            toast.success("Company created successfully");
        }
        closeModals();
    } catch (error) {
        toast.error("An error occurred: " + (error.message || "Unknown error"));
    }
};

const deleteCompany = async () => {
    try {
        await companyStore.deleteCompany(currentCompany.value.company_id);
        toast.success("Company deleted successfully");
        closeModals();
    } catch (error) {
        toast.error(
            "Failed to delete company: " + (error.message || "Unknown error"),
        );
    }
};

// Lifecycle hooks
onMounted(async () => {
    try {
        await companyStore.fetchCompanies();
    } catch (error) {
        toast.error(
            "Failed to fetch companies: " + (error.message || "Unknown error"),
        );
    } finally {
        loading.value = false;
    }
});
</script>
