<!-- src/views/admin/AdminUsers.vue -->
<template>
    <AdminLayout title="User Management">
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">User Management</h1>
                    <button
                        @click="showAddUserModal = true"
                        class="btn btn-primary">
                        <PlusIcon class="h-5 w-5 mr-1 inline" />
                        Add User
                    </button>
                </div>

                <div v-if="loading" class="py-8">
                    <LoadingSpinner />
                </div>
                <div v-else class="overflow-x-auto shadow-md rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200 bg-white">
                        <thead class="bg-gray-50">
                            <tr>
                                <th
                                    scope="col"
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Username
                                </th>
                                <th
                                    scope="col"
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th
                                    scope="col"
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th
                                    scope="col"
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Login
                                </th>
                                <th
                                    scope="col"
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                                <th
                                    scope="col"
                                    class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr
                                v-for="user in users"
                                :key="user.user_id"
                                class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center">
                                        <div
                                            class="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                            <UserIcon
                                                class="h-6 w-6 text-gray-500" />
                                        </div>
                                        <div class="ml-4">
                                            <div
                                                class="text-sm font-medium text-gray-900">
                                                {{ user.username }}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        {{ user.email }}
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span
                                        :class="
                                            user.role_name === 'admin'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-blue-100 text-blue-800'
                                        "
                                        class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full">
                                        {{ user.role_name }}
                                    </span>
                                </td>
                                <td
                                    class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {{
                                        user.last_login
                                            ? formatDate(user.last_login)
                                            : "Never"
                                    }}
                                </td>
                                <td
                                    class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {{ formatDate(user.created_at) }}
                                </td>
                                <td
                                    class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                    <button
                                        @click="editUser(user)"
                                        class="text-indigo-600 hover:text-indigo-900 mr-3">
                                        <PencilSquareIcon class="h-5 w-5" />
                                    </button>
                                    <button
                                        @click="confirmDeleteUser(user)"
                                        class="text-red-600 hover:text-red-900"
                                        :disabled="
                                            user.user_id === currentUserId
                                        "
                                        :class="{
                                            'opacity-50 cursor-not-allowed':
                                                user.user_id === currentUserId,
                                        }">
                                        <TrashIcon class="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Add User Modal -->
                <div
                    v-if="showAddUserModal"
                    class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                    <div
                        class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                        <h2 class="text-xl font-bold mb-4">Add New User</h2>
                        <form
                            @submit.prevent="handleCreateUser"
                            class="space-y-4">
                            <div>
                                <label for="username" class="label"
                                    >Username*</label
                                >
                                <input
                                    id="username"
                                    v-model="userForm.username"
                                    type="text"
                                    class="input"
                                    required />
                            </div>
                            <div>
                                <label for="email" class="label">Email*</label>
                                <input
                                    id="email"
                                    v-model="userForm.email"
                                    type="email"
                                    class="input"
                                    required />
                            </div>
                            <div>
                                <label for="password" class="label"
                                    >Password*</label
                                >
                                <input
                                    id="password"
                                    v-model="userForm.password"
                                    type="password"
                                    class="input"
                                    required />
                            </div>
                            <div>
                                <label for="role_id" class="label">Role*</label>
                                <select
                                    id="role_id"
                                    v-model="userForm.role_id"
                                    class="input"
                                    required>
                                    <option
                                        v-for="role in roles"
                                        :key="role.role_id"
                                        :value="role.role_id">
                                        {{ role.role_name }}
                                    </option>
                                </select>
                            </div>
                            <div class="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    @click="closeUserModal"
                                    class="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Edit User Modal -->
                <div
                    v-if="showEditUserModal"
                    class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                    <div
                        class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                        <h2 class="text-xl font-bold mb-4">Edit User</h2>
                        <form
                            @submit.prevent="handleUpdateUser"
                            class="space-y-4">
                            <div>
                                <label for="edit-username" class="label"
                                    >Username</label
                                >
                                <input
                                    id="edit-username"
                                    v-model="userForm.username"
                                    type="text"
                                    class="input" />
                            </div>
                            <div>
                                <label for="edit-email" class="label"
                                    >Email</label
                                >
                                <input
                                    id="edit-email"
                                    v-model="userForm.email"
                                    type="email"
                                    class="input" />
                            </div>
                            <div>
                                <label for="edit-password" class="label"
                                    >New Password (leave blank to keep
                                    current)</label
                                >
                                <input
                                    id="edit-password"
                                    v-model="userForm.password"
                                    type="password"
                                    class="input" />
                            </div>
                            <div>
                                <label for="edit-role_id" class="label"
                                    >Role</label
                                >
                                <select
                                    id="edit-role_id"
                                    v-model="userForm.role_id"
                                    class="input">
                                    <option
                                        v-for="role in roles"
                                        :key="role.role_id"
                                        :value="role.role_id">
                                        {{ role.role_name }}
                                    </option>
                                </select>
                            </div>
                            <div class="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    @click="closeUserModal"
                                    class="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    Update User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Delete Confirmation Modal -->
                <DeleteConfirmation
                    v-if="showDeleteModal"
                    :message="`Are you sure you want to delete the user ${selectedUser?.username}? This action cannot be undone.`"
                    @confirm="deleteUser"
                    @cancel="showDeleteModal = false" />
            </div>
    </AdminLayout>
</template>

<script setup>
import AdminLayout from "../../layouts/AdminLayout.vue";
import { ref, computed, onMounted } from "vue";
import { useAdminStore } from "../../stores/admin";
import { useAuthStore } from "../../stores/auth";
import { useToast } from "vue-toastification";
import { format } from "date-fns";
import {
    PlusIcon,
    UserIcon,
    PencilSquareIcon,
    TrashIcon,
} from "@heroicons/vue/24/outline";
import LoadingSpinner from "../../components/LoadingSpinner.vue";
import DeleteConfirmation from "../../components/DeleteConfirmation.vue";

const adminStore = useAdminStore();
const authStore = useAuthStore();
const toast = useToast();

const loading = ref(true);
const showAddUserModal = ref(false);
const showEditUserModal = ref(false);
const showDeleteModal = ref(false);
const selectedUser = ref(null);
const userForm = ref({
    username: "",
    email: "",
    password: "",
    role_id: 2, // Default to regular user
});

const users = computed(() => adminStore.users);
const roles = computed(() => adminStore.roles);
const currentUserId = computed(() => authStore.user?.user_id);

const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
};

const closeUserModal = () => {
    showAddUserModal.value = false;
    showEditUserModal.value = false;
    resetForm();
};

const resetForm = () => {
    userForm.value = {
        username: "",
        email: "",
        password: "",
        role_id: 2,
    };
    selectedUser.value = null;
};

const editUser = (user) => {
    selectedUser.value = user;
    userForm.value = {
        username: user.username,
        email: user.email,
        password: "",
        role_id: user.role_id,
    };
    showEditUserModal.value = true;
};

const confirmDeleteUser = (user) => {
    if (user.user_id === currentUserId.value) {
        toast.warning("You cannot delete your own account");
        return;
    }
    selectedUser.value = user;
    showDeleteModal.value = true;
};

const handleCreateUser = async () => {
    try {
        await adminStore.createUser(userForm.value);
        toast.success("User created successfully");
        closeUserModal();
    } catch (error) {
        toast.error(`Failed to create user: ${adminStore.error}`);
    }
};

const handleUpdateUser = async () => {
    try {
        const updateData = {};

        // Only include fields that have values
        if (userForm.value.username)
            updateData.username = userForm.value.username;
        if (userForm.value.email) updateData.email = userForm.value.email;
        if (userForm.value.password)
            updateData.password = userForm.value.password;
        if (userForm.value.role_id) updateData.role_id = userForm.value.role_id;

        await adminStore.updateUser(selectedUser.value.user_id, updateData);
        toast.success("User updated successfully");
        closeUserModal();
    } catch (error) {
        toast.error(`Failed to update user: ${adminStore.error}`);
    }
};

const deleteUser = async () => {
    try {
        await adminStore.deleteUser(selectedUser.value.user_id);
        toast.success("User deleted successfully");
        showDeleteModal.value = false;
    } catch (error) {
        toast.error(`Failed to delete user: ${adminStore.error}`);
    }
};

onMounted(async () => {
    try {
        loading.value = true;
        await Promise.all([adminStore.fetchUsers(), adminStore.fetchRoles()]);
    } catch (error) {
        toast.error("Failed to load user data");
    } finally {
        loading.value = false;
    }
});
</script>
