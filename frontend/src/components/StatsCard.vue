<template>
    <div class="card">
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-gray-500 text-sm font-medium">{{ title }}</h3>
                <div class="mt-1 flex items-baseline">
                    <div class="text-2xl font-semibold text-gray-900">
                        {{ value }}
                    </div>
                    <div
                        v-if="change !== null"
                        :class="[
                            'ml-2 text-sm',
                            change >= 0 ? 'text-green-600' : 'text-red-600',
                        ]">
                        {{ change >= 0 ? "+" : "" }}{{ change }}%
                    </div>
                </div>
            </div>
            <div :class="['p-3 rounded-md', bgColorClass]">
                <component
                    :is="icon"
                    class="w-6 h-6 text-white"
                    aria-hidden="true" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { defineProps } from "vue";

defineProps({
    title: {
        type: String,
        required: true,
    },
    value: {
        type: [Number, String],
        required: true,
    },
    change: {
        type: Number,
        default: null,
    },
    icon: {
        type: Object,
        required: true,
    },
    bgColorClass: {
        type: String,
        default: "bg-blue-500",
    },
});
</script>
