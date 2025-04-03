<template>
    <form @submit.prevent="submitForm" class="space-y-4">
        <div>
            <label for="contact_id" class="label">Contact*</label>
            <select
                id="contact_id"
                v-model="form.contact_id"
                class="input"
                :disabled="!!preselectedContactId"
                required>
                <option value="" disabled>Select a contact</option>
                <option
                    v-for="contact in contacts"
                    :key="contact.contact_id"
                    :value="contact.contact_id">
                    {{ contact.first_name }} {{ contact.last_name }}
                    {{
                        contact.company_name ? `(${contact.company_name})` : ""
                    }}
                </option>
            </select>
        </div>

        <div>
            <label for="date_contacted" class="label">Date*</label>
            <input
                id="date_contacted"
                v-model="form.date_contacted"
                type="datetime-local"
                class="input"
                required />
        </div>

        <div>
            <label for="contact_method" class="label">Contact Method*</label>
            <select
                id="contact_method"
                v-model="form.contact_method"
                class="input"
                required>
                <option value="" disabled>Select contact method</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="linkedin">LinkedIn</option>
                <option value="in-person">In-Person</option>
                <option value="other">Other</option>
            </select>
        </div>

        <div>
            <label for="message_content" class="label">Message</label>
            <textarea
                id="message_content"
                v-model="form.message_content"
                class="input h-24"></textarea>
        </div>

        <div class="flex items-center">
            <input
                id="received_response"
                v-model="form.received_response"
                type="checkbox"
                class="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label for="received_response" class="ml-2 text-gray-700">
                Received response
            </label>
        </div>

        <div v-if="form.received_response">
            <div>
                <label for="response_date" class="label">Response Date</label>
                <input
                    id="response_date"
                    v-model="form.response_date"
                    type="datetime-local"
                    class="input" />
            </div>

            <div>
                <label for="response_content" class="label"
                    >Response Content</label
                >
                <textarea
                    id="response_content"
                    v-model="form.response_content"
                    class="input h-24"></textarea>
            </div>
        </div>

        <div class="flex justify-end space-x-2">
            <button type="button" @click="cancel" class="btn btn-secondary">
                Cancel
            </button>
            <button type="submit" class="btn btn-primary">
                {{ isEditing ? "Update" : "Log" }} Communication
            </button>
        </div>
    </form>
</template>

<script setup>
import { ref, onMounted, computed, defineProps, defineEmits, watch } from "vue";
import { useContactStore } from "../stores/contacts";
import { format } from "date-fns";

const props = defineProps({
    communication: {
        type: Object,
        default: () => ({}),
    },
    isEditing: {
        type: Boolean,
        default: false,
    },
    preselectedContactId: {
        type: [Number, String],
        default: null,
    },
});

const emit = defineEmits(["submit", "cancel"]);
const contactStore = useContactStore();

const form = ref({
    contact_id: "",
    date_contacted: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    contact_method: "",
    message_content: "",
    received_response: false,
    response_date: "",
    response_content: "",
});

const contacts = computed(() => contactStore.contacts);

onMounted(async () => {
    if (contactStore.contacts.length === 0) {
        await contactStore.fetchContacts();
    }

    if (props.communication) {
        // Format the dates for the datetime-local input
        const contactedDate = props.communication.date_contacted
            ? new Date(props.communication.date_contacted)
            : new Date();

        const responseDate = props.communication.response_date
            ? new Date(props.communication.response_date)
            : new Date();

        form.value = {
            contact_id: props.communication.contact_id || "",
            date_contacted: format(contactedDate, "yyyy-MM-dd'T'HH:mm"),
            contact_method: props.communication.contact_method || "",
            message_content: props.communication.message_content || "",
            received_response: props.communication.received_response
                ? true
                : false,
            response_date: props.communication.response_date
                ? format(responseDate, "yyyy-MM-dd'T'HH:mm")
                : "",
            response_content: props.communication.response_content || "",
        };
    } else if (props.preselectedContactId) {
        form.value.contact_id = props.preselectedContactId;
    }
});

// Reset response fields when received_response is toggled off
watch(
    () => form.value.received_response,
    (newVal) => {
        if (!newVal) {
            form.value.response_date = "";
            form.value.response_content = "";
        } else if (form.value.response_date === "") {
            form.value.response_date = format(new Date(), "yyyy-MM-dd'T'HH:mm");
        }
    },
);

const submitForm = () => {
    emit("submit", { ...form.value });
};

const cancel = () => {
    emit("cancel");
};
</script>
