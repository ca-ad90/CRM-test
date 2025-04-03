<template>
    <div class="relative">
        <input
            type="text"
            v-model="searchQuery"
            @keyup.enter="performSearch"
            placeholder="Search..."
            class="input w-64 pl-10 py-2" />
        <div class="absolute left-3 top-3 text-gray-400">
            <MagnifyingGlassIcon class="w-5 h-5" />
        </div>
    </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";

const router = useRouter();
const searchQuery = ref("");

const performSearch = () => {
    if (searchQuery.value.trim()) {
        router.push({
            path: "/search",
            query: { q: searchQuery.value },
        });

        const submitForm = () => {
            emit("submit", { ...form.value });
        };

        const cancel = () => {
            emit("cancel");
        };
        searchQuery.value = "";
    }
};
</script>
