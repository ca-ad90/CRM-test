<template>
    <form @submit.prevent="submitForm" class="space-y-4">
        <div>
            <label for="company_name" class="label">Company Name*</label>
            <input
                id="company_name"
                v-model="form.company_name"
                type="text"
                class="input"
                required />
        </div>

        <div>
            <label for="industry" class="label">Industry</label>
            <input
                id="industry"
                v-model="form.industry"
                type="text"
                class="input" />
        </div>

        <div>
            <label for="website" class="label">Website</label>
            <input
                id="website"
                v-model="form.website"
                type="url"
                class="input" />
        </div>

        <div>
            <label for="phone" class="label">Phone</label>
            <input
                id="phone"
                v-model="form.phone"
                 class="input"></input>
        </div>
        <div>
            <label for="email" class="label">email</label>
            <input
                id="email"
                v-model="form.email"
                 class="input"></input>
        </div>


        <div>
            <label for="address" class="label">Address</label>
            <textarea
                id="address"
                v-model="form.address"
                class="input h-24"></textarea>
        </div>

        <div class="flex justify-end space-x-2">
            <button type="button" @click="cancel" class="btn btn-secondary">
                Cancel
            </button>
            <button type="submit" class="btn btn-primary">
                {{ isEditing ? "Update" : "Create" }} Company
            </button>
        </div>
    </form>
</template>

<script setup>
import { ref, onMounted, defineProps, defineEmits } from "vue";

const props = defineProps({
    company: {
        type: Object,
        default: () => ({}),
    },
    isEditing: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(["submit", "cancel"]);

const form = ref({
    company_name: "",
    industry: "",
    website: "",
    address: "",
    phone: "",
    email: "",
});

onMounted(() => {
    if (props.company) {
        form.value = {
            company_name: props.company.company_name || "",
            industry: props.company.industry || "",
            website: props.company.website || "",
            address: props.company.address || "",
            phone: props.company.phone || "",
            email: props.company.email || "",
        };
    }
});

const submitForm = () => {
    emit("submit", { ...form.value });
};

const cancel = () => {
    emit("cancel");
};
</script>
