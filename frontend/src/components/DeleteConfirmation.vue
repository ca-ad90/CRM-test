<template>
    <div
        class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
        <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 class="text-xl font-bold mb-4">Confirm Deletion</h2>
            <p class="mb-6">{{ message }}</p>
            <div class="flex justify-end space-x-2">
                <button @click="cancel" class="btn btn-secondary">
                    Cancel
                </button>
                <button @click="confirm" class="btn btn-danger">Delete</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";

const props = defineProps({
    message: {
        type: String,
        default:
            "Are you sure you want to delete this item? This action cannot be undone.",
    },
});

const emit = defineEmits(["confirm", "cancel"]);

const confirm = () => {
    emit("confirm");
};

const cancel = () => {
    emit("cancel");
};
</script>
