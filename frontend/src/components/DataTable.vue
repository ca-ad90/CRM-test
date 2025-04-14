<template>
    <table class="min-w-full divide-y divide-gray-200 bg-white">
        <thead class="bg-gray-50">
            <tr>
                <th v-for="(heading, key) in tableHeadings" :key="heading"
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    @click="sortByColumn(key)">
                    <div class="flex items-center">
                        <slot :name="`heading-${key}`" v-bind="{ heading, key }">
                                                {{ heading }}
                        <span v-if="sortKey === key" class="ml-1">
                            {{ sortOrder === 'asc' ? '▲' : '▼' }}
                        </span>
                        </slot>

                    </div>
                </th>
            </tr>
        </thead>
        <tbody
            v-for="(item, index) in tableData"
            :key="`${item[idKey]}-${index}`"
            class="group hover:bg-gray-50">
            <slot name="row" v-bind="sortedData[index]">
                <tr class="row" @click="toggleGroup(item[idKey])">

                    <template v-for="(value, key) in item" :key="value+key">
                    <template v-if="key !== idKey">
                        <template v-if="$slots[key]">
                            <td class="px-6 py-4 whitespace-nowrap">
                            <input v-if="currentCompany&& currentCompany[idKey] === item[idKey] && editCompanyRow" :id="key" v-model="sortedData[index][key]" type="text" class="input">
                                <slot v-else :name="`${key}`" v-bind="{item:sortedData[index],index:index}"> {{ value }}slot </slot>

                            </td>
                        </template>
                        <template v-else>

                            <td class="px-6 py-4 whitespace-nowrap">
                                <input v-if="currentCompany&& currentCompany[idKey] === item[idKey] && editCompanyRow" :id="key" v-model="sortedData[index][key]" type="text" class="input">
                           <v-else> {{ value }}
                           </v-else>
                            </td>
                        </template>
                    </template>
                </template>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                        <div class="flex justify-center space-x-2">
                            <button
                                @click="editCompany(sortedData[index])"
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
            </slot>
            <tr v-if="$slots.accordion"
                :class="`row content ${
                    rowRefs[item[idKey]] ? 'open' : 'closed'
                }`">
                <td colspan="1000">
                    <div class="content-wrapper">
                        <div class="main-content">
                            <slot name="accordion" v-bind={item:data[index]}>
                            </slot>

                     <!--       <table>
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
                                            Email
                                        </th>
                                        <th
                                            scope="col"
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Phone
                                        </th>
                                        <th
                                            scope="col"
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody
                                    v-for="(contact, index) in contactInfo[
                                        item[idKey]
                                    ]">
                                    <tr class="row">
                                        <td class="px-6 py-2 whitespace-nowrap">
                                            <router-link
                                                :to="`/contacts/${contact.contact_id}`"
                                                class="text-blue-600 hover:underline"
                                                >{{
                                                    `${contact.first_name} ${
                                                        contact.last_name !=
                                                        "NULL"
                                                            ? contact.last_name
                                                            : ""
                                                    }`
                                                }}</router-link
                                            >
                                        </td>
                                        <td class="px-6 py-2 whitespace-nowrap">
                                            {{ contact.email }}
                                        </td>
                                        <td class="px-6 py-2 whitespace-nowrap">
                                            {{ contact.phone }}
                                        </td>
                                        <td
                                            class="px-6 py-2 whitespace-nowrap text-center">
                                            <div
                                                class="flex justify-center space-x-2">
                                                <button
                                                    @click="
                                                        editContact(contact)
                                                    "
                                                    class="text-indigo-600 hover:text-indigo-900"
                                                    title="Edit Contact">
                                                    <PencilSquareIcon
                                                        class="h-5 w-5" />
                                                </button>
                                                <button
                                                    @click="
                                                        confirmDeleteContact(
                                                            contact,
                                                        )
                                                    "
                                                    class="text-red-600 hover:text-red-900"
                                                    title="Delete Contact">
                                                    <TrashIcon
                                                        class="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>-->
                        </div>
                    </div>
                </td>
            </tr>
        </tbody>
    </table>
</template>

<script setup>
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
} from "@heroicons/vue/24/outline";
import { ref, computed, watch, onMounted } from "vue";
import { useCompanyStore } from "../stores/companies";
import { useContactStore } from "../stores/contacts";


const { data, headings, idKey} = defineProps({
    headings: {
        type: Object,
        required: true,
    },
    data: {
        type: Array,
        required: true,
    },
    idKey:{
        type: String,
        required: true,
    }
});
const emit = defineEmits(["toggleAccordion", "submit", "cancel"]);

// state
const currentCompany = ref({});
const rowRefs = ref([{}]);
const editCompanyRow = ref(false);
const dataModel  = ref({});

// Sorting state
const sortKey = ref('');
const sortOrder = ref('asc');

// Sort function
const sortByColumn = (key) => {
    if (sortKey.value === key) {
        // If already sorting by this key, toggle order
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
        // New sort key, default to ascending
        sortKey.value = key;
        sortOrder.value = 'asc';
    }
};

onMounted(() => {
    if(!data) return
    dataModel.value = JSON.parse(JSON.stringify(data)).reduce((acc, item) => {
        console.log(idKey,item)
        acc[item[idKey]] = item;
        return acc;
    }, {});
    console.log(dataModel.value);
})

// Sorted data based on current sort key and order
const sortedData = computed(() => {
    if (!sortKey.value) return data;

    return [...data].sort((a, b) => {
        const valueA = a[sortKey.value];
        const valueB = b[sortKey.value];

        // Handle different data types
        if (typeof valueA === 'string' && typeof valueB === 'string') {
            const comparison = valueA.localeCompare(valueB);
            return sortOrder.value === 'asc' ? comparison : -comparison;
        } else {
            // For numbers and other types
            if (valueA < valueB) return sortOrder.value === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortOrder.value === 'asc' ? 1 : -1;
            return 0;
        }
    });
});
const tableData = computed(() => {
    if(!sortedData.value) return []
    if(!headings) return sortedData.value
    else{
          return sortedData.value.map(company => {
    let newObj = Object.keys(headings).reduce((filteredObj, key) => {
      if (key in company) {
        filteredObj[key] = company[key];
      } else {
          filteredObj[key] =""
      }
      filteredObj[idKey] = company[idKey];
      return filteredObj;
    }, {});
    return newObj
  });
    }
});
const tableHeadings = computed(() => {
    if(headings) return headings
    else{
        return Object.keys(data[0])
    }
});


const ensureHttpPrefix = (url) => {
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        return "https://" + url;
    }
    return url;
};

const toggleGroup = async (id) => {
    if(editCompanyRow.value) return
    emit("toggleAccordion", id);
    rowRefs.value[id] = !rowRefs.value[id];
};

const formatWebsite = (url) => {
    if (!url) return "";
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
};

const editCompany = (company) => {
    editCompanyRow.value = !editCompanyRow.value;
    currentCompany.value = { ...company };
};

const confirmDelete = (company) => {
    currentCompany.value = company;
    showDeleteModal.value = true;
};

</script>

<style scoped>
.group:has(.open) {
    background-color: rgb(249 250 251);
    /*box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.05);*/
}
.content-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    min-height: 0px;
    overflow: hidden;
    transition: 0.5s;
}
.open .content-wrapper {
    grid-template-rows: 1fr;
}
.main-content {
    max-height: 250px;
    min-height: 0px;
    background-color: rgb(253 253 253);
    position: relative;

    > table {
        width: 100%;
        font-size: 0.75em;
    }
}
.open .main-content {
    padding: 1px 0em;
    &::after {
        content: "";
        display: block;
        height: 100%;
        width: 100%;
        position: absolute;
        top: 0;
        left: 0;
        box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.15);
        user-select: none;
        pointer-events: none;
    }
}
</style>
