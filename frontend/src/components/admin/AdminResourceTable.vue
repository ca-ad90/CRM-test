<template>
  <div class="space-y-4">
      <h2 class="text-lg font-semibold">{{ title }}</h2>

      <div class="overflow-x-auto shadow-md rounded-lg">
          <table class="min-w-full divide-y divide-gray-200 bg-white">
              <thead class="bg-gray-50">
                  <tr>
                      <th v-for="(column, key) in columns" :key="key"
                          scope="col"
                          class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {{ column.label }}
                      </th>
                      <!-- src/components/admin/AdminResourceTable.vue (continued) -->
                      <th scope="col"
                            class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="item in data" :key="getItemId(item)" class="hover:bg-gray-50">
                        <td v-for="(column, key) in columns" :key="key"
                            class="px-4 py-3 whitespace-nowrap">
                            <div v-if="column.formatter" v-html="column.formatter(item[key], item)"></div>
                            <div v-else class="text-sm" :class="column.className || 'text-gray-900'">
                                {{ item[key] || 'N/A' }}
                            </div>
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap text-center">
                            <div class="flex justify-center space-x-2">
                                <button @click="$emit('view', item)"
                                        class="text-blue-600 hover:text-blue-900"
                                        title="View Details">
                                    <EyeIcon class="h-5 w-5" />
                                </button>
                                <button @click="$emit('edit', item)"
                                        class="text-indigo-600 hover:text-indigo-900"
                                        title="Edit">
                                    <PencilSquareIcon class="h-5 w-5" />
                                </button>
                                <button @click="$emit('delete', item)"
                                        class="text-red-600 hover:text-red-900"
                                        title="Delete">
                                    <TrashIcon class="h-5 w-5" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination controls if provided -->
        <div v-if="pagination" class="flex justify-between items-center bg-white p-4 rounded-lg shadow">
            <div class="text-sm text-gray-700">
                Showing
                <span class="font-medium">{{ pagination.offset + 1 }}</span>
                to
                <span class="font-medium">{{ pagination.offset + data.length }}</span>
                of
                <span class="font-medium">{{ pagination.total }}</span>
                results
            </div>
            <div class="flex space-x-2">
                <button
                    @click="$emit('page', pagination.offset - pagination.limit)"
                    class="btn btn-secondary"
                    :disabled="pagination.offset === 0"
                    :class="{ 'opacity-50 cursor-not-allowed': pagination.offset === 0 }">
                    Previous
                </button>
                <button
                    @click="$emit('page', pagination.offset + pagination.limit)"
                    class="btn btn-secondary"
                    :disabled="!pagination.hasMore"
                    :class="{ 'opacity-50 cursor-not-allowed': !pagination.hasMore }">
                    Next
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import { EyeIcon, PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
    title: {
        type: String,
        required: true
    },
    data: {
        type: Array,
        required: true
    },
    columns: {
        type: Object,
        required: true
    },
    idField: {
        type: String,
        default: 'id'
    },
    pagination: {
        type: Object,
        default: null
    }
});

defineEmits(['view', 'edit', 'delete', 'page']);

const getItemId = (item) => {
    return item[props.idField];
};
</script>
