<template>
    <form @submit.prevent="submitForm" class="space-y-4">
        <div>
            <label for="contact_id" class="label">Contact*</label>
            <select
                id="contact_id"
                v-model="form.contact_id"
                class="input"
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
            <label for="meeting_date" class="label">Meeting Date*</label>
            <input
                id="meeting_date"
                v-model="form.meeting_date"
                type="datetime-local"
                class="input"
                required />
        </div>

        <div>
            <label for="location" class="label">Location</label>
            <input
                id="location"
                v-model="form.location"
                type="text"
                class="input" />
        </div>

        <div>
            <label for="meeting_type" class="label">Meeting Type*</label>
            <select
                id="meeting_type"
                v-model="form.meeting_type"
                class="input"
                required>
                <option value="" disabled>Select meeting type</option>
                <option value="in-person">In-Person</option>
                <option value="virtual">Virtual</option>
                <option value="phone">Phone</option>
            </select>
        </div>

        <div>
            <label for="meeting_status" class="label">Status*</label>
            <select
                id="meeting_status"
                v-model="form.meeting_status"
                class="input"
                required>
                <option value="" disabled>Select status</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
            </select>
        </div>

        <div>
            <label for="meeting_notes" class="label">Notes</label>
            <textarea
                id="meeting_notes"
                v-model="form.meeting_notes"
                class="input h-24"></textarea>
        </div>

        <div class="flex items-center">
            <input
                id="follow_up_needed"
                v-model="form.follow_up_needed"
                type="checkbox"
                class="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label for="follow_up_needed" class="ml-2 text-gray-700">
                Follow-up needed
            </label>
        </div>

        <div class="flex justify-end space-x-2">
            <button type="button" @click="cancel" class="btn btn-secondary">
                Cancel
            </button>
            <button type="submit" class="btn btn-primary">
                {{ isEditing ? "Update" : "Schedule" }} Meeting
            </button>
        </div>
    </form>
</template>

<script setup>
import { ref, onMounted, computed, defineProps, defineEmits } from "vue";
import { useContactStore } from "../stores/contacts";
import { format } from "date-fns";

const props = defineProps({
    meeting: {
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
    meeting_date: "",
    location: "",
    meeting_type: "",
    meeting_status: "scheduled",
    meeting_notes: "",
    follow_up_needed: false,
});

const contacts = computed(() => contactStore.contacts);

onMounted(async () => {
    if (contactStore.contacts.length === 0) {
        await contactStore.fetchContacts();
    }

    if (props.meeting) {
        // Format the date for the datetime-local input
        const meetingDate = props.meeting.meeting_date
            ? new Date(props.meeting.meeting_date)
            : new Date();

        const formattedDate = format(meetingDate, "yyyy-MM-dd'T'HH:mm");

        form.value = {
            contact_id: props.meeting.contact_id || "",
            meeting_date: formattedDate,
            location: props.meeting.location || "",
            meeting_type: props.meeting.meeting_type || "",
            meeting_status: props.meeting.meeting_status || "scheduled",
            meeting_notes: props.meeting.meeting_notes || "",
            follow_up_needed: props.meeting.follow_up_needed ? true : false,
        };
    } else if (props.preselectedContactId) {
        form.value.contact_id = props.preselectedContactId;
        form.value.meeting_date = format(new Date(), "yyyy-MM-dd'T'HH:mm");
    }
});

const submitForm = () => {
    emit("submit", { ...form.value });
};

const cancel = () => {
    emit("cancel");
};
</script>
