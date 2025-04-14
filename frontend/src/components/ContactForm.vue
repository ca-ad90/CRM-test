<template>
    <form @submit.prevent="submitForm" class="space-y-4">
        <div  v-if="!props.currentCompany">
            <label for="company_id" class="label">Company*</label>
            <select v-if="!props.currentCompany"
                id="company_id"
                v-model="form.company_id"
                class="input"
                required>
                <option value="" disabled>Select a company</option>
                <option
                    v-for="company in companies"
                    :key="company.company_id"
                    :value="company.company_id">
                    {{ company.company_name }}
                </option>
            </select>

        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="first_name" class="label">First Name*</label>
                <input
                    id="first_name"
                    v-model="form.first_name"
                    type="text"
                    class="input"
                    required />
            </div>

            <div>
                <label for="last_name" class="label">Last Name*</label>
                <input
                    id="last_name"
                    v-model="form.last_name"
                    type="text"
                    class="input"
                    required />
            </div>
        </div>

        <div>
            <label for="position" class="label">Position</label>
            <input
                id="position"
                v-model="form.position"
                type="text"
                class="input" />
        </div>

        <div>
            <label for="email" class="label">Email</label>
            <input id="email" v-model="form.email" type="email" class="input" />
        </div>

        <div>
            <label for="phone" class="label">Phone</label>
            <input id="phone" v-model="form.phone" type="tel" class="input" />
        </div>

        <div>
            <label for="linkedin_url" class="label">LinkedIn URL</label>
            <input
                id="linkedin_url"
                v-model="form.linkedin_url"
                type="url"
                class="input" />
        </div>

        <div class="flex justify-end space-x-2">
            <button type="button" @click="cancel" class="btn btn-secondary">
                Cancel
            </button>
            <button type="submit" class="btn btn-primary">
                {{ isEditing ? "Update" : "Create" }} Contact
            </button>
        </div>
    </form>
</template>

<script setup>
import { ref, onMounted, computed, defineProps, defineEmits } from "vue";
import { useCompanyStore } from "../stores/companies";

const props = defineProps({
    contact: {
        type: Object,
        default: () => ({}),
    },
    isEditing: {
        type: Boolean,
        default: false,
    },
    currentCompany: {
        type: Object,
        default: null,
    },
    preselectedCompanyId: {
        type: [Number, String],
        default: null,
    },
});

const emit = defineEmits(["submit", "cancel"]);
const companyStore = useCompanyStore();

const form = ref({
    company_id: "",
    first_name: "",
    last_name: "",
    position: "",
    email: "",
    phone: "",
    linkedin_url: "",
});

const companies = computed(() => companyStore.companies);

onMounted(async () => {
    if (companyStore.companies.length === 0) {
        await companyStore.fetchCompanies();
    }

    if (props.contact) {
        form.value = {
            company_id: props.contact.company_id || "",
            first_name: props.contact.first_name || "",
            last_name: props.contact.last_name || "",
            position: props.contact.position || "",
            email: props.contact.email || "",
            phone: props.contact.phone || "",
            linkedin_url: props.contact.linkedin_url || "",
        };
    } else if (props.preselectedCompanyId) {
        form.value.company_id = props.preselectedCompanyId;
    }
    else if (props.currentCompany) {
        form.value.company_id = props.currentCompany.company_id;
    }
});

const submitForm = () => {
    emit("submit", { ...form.value });
};

const cancel = () => {
    emit("cancel");
};
</script>
