<!-- src/layouts/AdminLayout.vue -->
<template>
    <div class="space-y-6">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-2xl font-bold">{{ title }}</h1>
            <slot name="actions"></slot>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div class="lg:col-span-1">
                <AdminNav />
                <slot name="sidebar"></slot>
            </div>
            <div class="lg:col-span-3 content-wrapper">
                <slot></slot>
            </div>
        </div>
    </div>
</template>

<script setup>
import { defineProps } from "vue";
import AdminNav from "../components/admin/AdminNav.vue";

defineProps({
    title: {
        type: String,
        required: true,
    },
});
</script>

<style scoped>
.content-wrapper > template {
    display: flex;
}
</style>
