<template>
    <AdminLayout title="All Companies">
        <template #actions>
            <button @click="exportData" class="btn btn-secondary mr-2">
                <ArrowDownTrayIcon class="h-5 w-5 mr-1 inline" />
                Export
            </button>
        </template>
        <div v-if="loading" class="py-8">
            <LoadingSpinner />
        </div>
        <div v-else>
            <div class="overflow-x-auto shadow-md rounded-lg">
                <DataTable
                    :data="companies"
                    :headings="{
                        company_name: 'Company Name',
                        contacts: 'Contacts',
                        website: 'Website',
                    }"
                    :idKey="'company_id'">
                    <template #accordion="{ item }">
                    </template>
                </DataTable>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <DeleteConfirmation
            v-if="showDeleteModal"
            :message="`Are you sure you want to delete the company ${selectedCompany?.company_name}? This will also delete all associated contacts and data.`"
            @confirm="deleteCompany"
            @cancel="showDeleteModal = false" />
    </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { format } from "date-fns";
import { ArrowDownTrayIcon } from "@heroicons/vue/24/outline";
import AdminLayout from "../../layouts/AdminLayout.vue";
import DataTable from "../../components/DataTable.vue";
import AdminResourceTable from "../../components/admin/AdminResourceTable.vue";
import Companies from "../Companies.vue";
import LoadingSpinner from "../../components/LoadingSpinner.vue";
import DeleteConfirmation from "../../components/DeleteConfirmation.vue";
import axios from "axios";

const router = useRouter();
const toast = useToast();

const loading = ref(true);
const companies = ref([]);
const showDeleteModal = ref(false);
const selectedCompany = ref(null);

const columns = {
    company_name: {
        label: "Company Name",
        formatter: (value, item) =>
            `<a href="/companies/${item.company_id}" class="text-blue-600 hover:underline font-medium">${value}</a>`,
    },
    contacts_count: {
        label: "Contacts",
        className: "text-center font-semibold",
    },
    website: {
        label: "Website",
        formatter: (value) =>
            value
                ? `<a href="${ensureHttpPrefix(
                      value,
                  )}" target="_blank" class="text-blue-600 hover:underline">${formatWebsite(
                      value,
                  )}</a>`
                : "N/A",
    },
    email: {
        label: "Email",
        formatter: (value) =>
            value
                ? `<a href="mailto:${value}" class="text-blue-600 hover:underline">${value}</a>`
                : "N/A",
    },
    phone: {
        label: "Phone",
    },
};

const ensureHttpPrefix = (url) => {
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        return `https://${url}`;
    }
    return url;
};

const formatWebsite = (url) => {
    if (!url) return "";
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
};

const viewCompany = (company) => {
    router.push(`/companies/${company.company_id}`);
};

const editCompany = (company) => {
    router.push(`/companies/${company.company_id}`);
};

const confirmDeleteCompany = (company) => {
    selectedCompany.value = company;
    showDeleteModal.value = true;
};

const deleteCompany = async () => {
    try {
        loading.value = true;
        await axios.delete(
            `/api/admin/companies/${selectedCompany.value.company_id}`,
        );
        toast.success(
            `Company "${selectedCompany.value.company_name}" deleted successfully`,
        );
        showDeleteModal.value = false;

        // Refresh companies list
        await fetchCompanies();
    } catch (error) {
        toast.error("Failed to delete company");
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const exportData = () => {
    // Create CSV data
    const headers = Object.values(columns)
        .map((col) => col.label)
        .join(",");
    const rows = companies.value.map((company) => {
        return [
            `"${company.company_name}"`,
            company.contacts_count,
            `"${company.website || ""}"`,
            `"${company.email || ""}"`,
            `"${company.phone || ""}"`,
        ].join(",");
    });

    const csvContent = `${headers}\n${rows.join("\n")}`;

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
        "download",
        `companies_export_${format(new Date(), "yyyy-MM-dd")}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Companies data exported successfully");
};
const fetchCompanies = async () => {
    loading.value = true;
    try {
        const response = await axios.get("/api/admin/companies");
        companies.value = response.data;
        console.log(companies.value);
    } catch (error) {
        toast.error("Failed to fetch companies");
        console.error(error);
    } finally {
        loading.value = false;
    }
};

onMounted(async () => {
    await fetchCompanies();
});
</script>
