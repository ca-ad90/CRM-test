<template>
    <div class="space-y-6">
        <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold">Companies</h1>
            <button @click="showAddCompanyModal = true" class="btn btn-primary">
                <PlusIcon class="h-5 w-5 mr-1 inline" />
                Add Company
            </button>
        </div>

        <!-- Add filter controls -->
        <div class="bg-white rounded-lg shadow-md p-4 mb-6">
            <div class="flex flex-wrap items-center gap-4">
                <div>
                    <label for="contact-filter" class="label">Contact Status</label>
                    <select
                        id="contact-filter"
                        v-model="filters.contactStatus"
                        @change="applyFilters"
                        class="p-2 border border-gray-300 rounded-md">
                        <option value="">All Companies</option>
                        <option value="contacted">Contacted</option>
                        <option value="not-contacted">Not Contacted</option>
                        <option value="no-contacts">No Contacts</option>
                    </select>
                </div>
                <div>
                    <label for="companies-filter" class="label">Filter Companies</label>
                    <input  class="input" type="text" id="companies-filter" v-model="searchQuery">
                    </input>
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
        <div v-else-if="companies.length === 0" class="text-center py-8">
            <div class="text-gray-500">No companies found</div>
            <button
                @click="showAddCompanyModal = true"
                class="btn btn-primary mt-4">
                Add Your First Company
            </button>
        </div>
        <div v-else class="overflow-x-auto shadow-md rounded-lg">
            <DataTable :data="companies" :headings="{company_name: 'Company Name', contacts: 'Contacts', website: 'Website'}" :idKey="'company_id'" @toggleAccordion="toggleAccordion">
            <template #company_name="{item}">
                <router-link
                            :to="`/companies/${item.company_id}`"
                            class="text-blue-600 hover:underline font-medium">
                            {{ item.company_name }}
                </router-link>
            </template>
            <template #website="{item}">
                <a :href="item.website" target="_blank" class="text-blue-600 hover:underline">
                    {{ formatWebsite(item.website) }}
                </a>
            </template>
            <template   #accordion="{item}">
                <DataTable :data="contactInfo[item.company_id]" :headings="{name: 'Name', email: 'Email', phone: 'Phone', add:'New Contact'}" :idKey="'contact_id'">
                                <template #heading-add="{heading}">
                                    <button @click="openContactModal(item)" class="btn btn-primary">Add Contact</button>
                                </template>
                                <template #name="{item}">
                                <router-link :to="`/contacts/${item.contact_id}`" class="text-blue-600 hover:underline">
                                 {{ `${item.first_name} ${item.last_name}`}}
                                </router-link>

                                </template>
                </DataTable>
            </template>
            </DataTable>
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

        <div
            v-if="showAddContactModal"
            class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h2 class="text-xl font-bold mb-4">
                    {{
                             "Add New Contact"
                    }}
                </h2>
                <ContactForm
                    :contact="currentContact"
                    :currentCompany="currentCompany"
                    :is-editing="false"
                    @submit="handleContactSubmit"
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
import ContactForm from "../components/ContactForm.vue";
import DataTable from "../components/DataTable.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import DeleteConfirmation from "../components/DeleteConfirmation.vue";
import axios from "axios";
import { useContactStore } from "../stores/contacts";
const contactStore = useContactStore();
const companyStore = useCompanyStore();
const toast = useToast();

// State
const showAddCompanyModal = ref(false);
const showAddContactModal = ref(false);
const currentContact = ref(false);
const showEditCompanyModal = ref(false);
const showDeleteModal = ref(false);
const currentCompany = ref(null);
const loading = ref(true);
const filteredCompanies = ref([]);
const filters = ref({
    contactStatus: "",
});
const searchQuery = ref("");
const contactInfo = ref([{}]);
// Computed
const companies = computed(() => {
    if (filteredCompanies.value.length > 0) {
        return filteredCompanies.value;
    }
    if(searchQuery.value) {
        return companyStore.companies.filter((company) => {
            let strings = searchQuery.value.toLowerCase().split(' ')
            return strings.every((s) => {
                return company.company_name.toLowerCase().includes(s)
            })
    })
    }

    return companyStore.companies;
});
// Methods
const ensureHttpPrefix = (url) => {
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        return "https://" + url;
    }
    return url;
};
const toggleAccordion = async (id) => {
        await contactStore.fetchContactsByCompany(id);
        contactInfo.value[id] = contactStore.companyContacts; //contactStore.companyContacts
        console.log(contactInfo.value[id]);
}
const openContactModal = (company) => {
    console.log(company)
    currentCompany.value = company;
    showAddContactModal.value = true;
};
const getContactInfo = async (companyId) => {
     }
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
    showAddContactModal.value = false;
    currentContact.value = null;
};
const handleContactSubmit = async (formData) => {
    try {
        console.log(formData)
            await contactStore.createContact(formData);
            toast.success("Contact created successfully");
        closeModals();
            await contactStore.fetchContacts(); // Refresh all contact
    } catch (error) {
        toast.error("An error occurred: " + (error.message || "Unknown error"));
    }
    toggleAccordion(formData.company_id)
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
        if (filters.contactStatus) {
            applyFilters(); // Refresh filtered list if filters are active
        } else {
            await companyStore.fetchCompanies(); // Refresh all companies
        }
    } catch (error) {
        toast.error("An error occurred: " + (error.message || "Unknown error"));
    }
};

const deleteCompany = async () => {
    try {
        await companyStore.deleteCompany(currentCompany.value.company_id);
        toast.success("Company deleted successfully");
        closeModals();
        if (filters.contactStatus) {
            applyFilters(); // Refresh filtered list if filters are active
        }
    } catch (error) {
        toast.error(
            "Failed to delete company: " + (error.message || "Unknown error"),
        );
    }
};

// New functions for filtering
const applyFilters = async () => {
    console.log("applyFilters", filters.value);
    loading.value = true;
    try {
        console.log("1Applying filters:", filters.value.contactStatus)
        if (filters.value.contactStatus) {
            console.log("2Applying filters:", filters.value.contactStatus);
            const response = await axios.get(
                `/api/companies/filter/${filters.value.contactStatus}`,
            );
            console.log("response",response)
            filteredCompanies.value = response.data;
        } else {
            filteredCompanies.value = [];
            await companyStore.fetchCompanies();
        }
    } catch (error) {
        console.error("Error applying filters:", error);
        toast.error(
            "Failed to apply filters: " + (error.message || "Unknown error"),
        );
        filteredCompanies.value = [];
    } finally {
        loading.value = false;
    }
};

const resetFilters = async () => {
    filters.value = {
        contactStatus: "",
    };
    filteredCompanies.value = [];
    await fetchCompanies();
};

const fetchCompanies = async () => {
    loading.value = true;
    try {
        await companyStore.fetchCompanies();
    } catch (error) {
        toast.error(
            "Failed to fetch companies: " + (error.message || "Unknown error"),
        );
    } finally {
        loading.value = false;
    }
};

// Lifecycle hooks
onMounted(async () => {
    await fetchCompanies();
});
</script>
