<template>
    <div class="space-y-6">
        <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold">Search Results</h1>
        </div>

        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="max-w-2xl mx-auto">
                <label for="search-input" class="sr-only">Search</label>
                <div class="relative">
                    <div
                        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon class="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        id="search-input"
                        v-model="searchQuery"
                        type="text"
                        placeholder="Search for companies, contacts..."
                        @keyup.enter="performSearch"
                        class="input pl-10 py-3 w-full text-lg"
                        :disabled="loading" />
                    <div
                        v-if="loading"
                        class="absolute inset-y-0 right-4 flex items-center">
                        <div
                            class="h-5 w-5 border-t-2 border-blue-500 rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="searchPerformed && !loading">
            <div v-if="noResults" class="text-center py-8">
                <p class="text-gray-500">
                    No results found for "{{ searchQuery }}"
                </p>
            </div>
            <div v-else>
                <!-- Companies Results -->
                <div v-if="results.companies.length > 0" class="mb-8">
                    <h2 class="text-xl font-semibold mb-4">
                        Companies ({{ results.companies.length }})
                    </h2>
                    <div class="overflow-x-auto shadow-md rounded-lg">
                        <table
                            class="min-w-full divide-y divide-gray-200 bg-white">
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
                                    v-for="company in results.companies"
                                    :key="company.company_id"
                                    class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <router-link
                                            :to="`/companies/${company.company_id}`"
                                            class="text-blue-600 hover:underline font-medium">
                                            {{ company.company_name }}
                                        </router-link>
                                    </td>
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-gray-700">
                                        {{ company.industry || "N/A" }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <a
                                            v-if="company.website"
                                            :href="
                                                ensureHttpPrefix(
                                                    company.website,
                                                )
                                            "
                                            target="_blank"
                                            class="text-blue-600 hover:underline">
                                            {{ formatWebsite(company.website) }}
                                        </a>
                                        <span v-else class="text-gray-500"
                                            >N/A</span
                                        >
                                    </td>
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-center">
                                        <router-link
                                            :to="`/companies/${company.company_id}`"
                                            class="btn btn-primary btn-sm">
                                            View Details
                                        </router-link>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Contacts Results -->
                <div v-if="results.contacts.length > 0">
                    <h2 class="text-xl font-semibold mb-4">
                        Contacts ({{ results.contacts.length }})
                    </h2>
                    <div class="overflow-x-auto shadow-md rounded-lg">
                        <table
                            class="min-w-full divide-y divide-gray-200 bg-white">
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
                                        class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                <tr
                                    v-for="contact in results.contacts"
                                    :key="contact.contact_id"
                                    class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <router-link
                                            :to="`/contacts/${contact.contact_id}`"
                                            class="text-blue-600 hover:underline font-medium">
                                            {{ contact.first_name }}
                                            {{ contact.last_name }}
                                        </router-link>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <router-link
                                            v-if="contact.company_id"
                                            :to="`/companies/${contact.company_id}`"
                                            class="text-blue-600 hover:underline">
                                            {{ contact.company_name || "N/A" }}
                                        </router-link>
                                        <span v-else class="text-gray-500"
                                            >N/A</span
                                        >
                                    </td>
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-gray-700">
                                        {{ contact.position || "N/A" }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <a
                                            v-if="contact.email"
                                            :href="`mailto:${contact.email}`"
                                            class="text-blue-600 hover:underline">
                                            {{ contact.email }}
                                        </a>
                                        <span v-else class="text-gray-500"
                                            >N/A</span
                                        >
                                    </td>
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-center">
                                        <router-link
                                            :to="`/contacts/${contact.contact_id}`"
                                            class="btn btn-primary btn-sm">
                                            View Details
                                        </router-link>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
import { useSearchStore } from "../stores/search";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const searchStore = useSearchStore();

// State
const searchQuery = ref("");
const loading = ref(false);
const searchPerformed = ref(false);

// Computed
const results = computed(() => searchStore.results);
const noResults = computed(
    () =>
        searchPerformed.value &&
        results.value.companies.length === 0 &&
        results.value.contacts.length === 0,
);

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

const performSearch = async () => {
    if (!searchQuery.value.trim()) {
        return;
    }

    try {
        loading.value = true;
        await searchStore.search(searchQuery.value);
        searchPerformed.value = true;

        // Update the URL to include the search query
        if (route.query.q !== searchQuery.value) {
            router.replace({
                query: { q: searchQuery.value },
            });
        }
    } catch (error) {
        toast.error("Search failed: " + (error.message || "Unknown error"));
    } finally {
        loading.value = false;
    }
};

// Lifecycle hooks
onMounted(() => {
    // If there's a query in the URL, perform search
    const queryParam = route.query.q;
    if (queryParam) {
        searchQuery.value = queryParam;
        performSearch();
    }
});

// Watch for route changes
watch(
    () => route.query.q,
    (newQuery) => {
        if (newQuery && newQuery !== searchQuery.value) {
            searchQuery.value = newQuery;
            performSearch();
        }
    },
);
</script>
