<template>
    <div class="min-h-screen flex flex-col">
        <header v-if="authStore.isAuthenticated" class="bg-white shadow">
            <div class="container mx-auto px-4">
                <div class="flex justify-between items-center py-4">
                    <router-link to="/" class="text-2xl font-bold text-blue-600"
                        >CRM System</router-link
                    >
                    <nav class="flex space-x-4">
                        <router-link to="/" class="nav-link"
                            >Dashboard</router-link
                        >
                        <router-link to="/companies" class="nav-link"
                            >Companies</router-link
                        >
                        <router-link to="/contacts" class="nav-link"
                            >Contacts</router-link
                        >
                        <router-link to="/meetings" class="nav-link"
                            >Meetings</router-link
                        >
                    </nav>
                    <div class="flex items-center space-x-4">
                        <SearchBar />
                        <div class="relative">
                            <button
                                @click="toggleUserMenu"
                                class="flex items-center space-x-2 text-gray-700 hover:text-blue-600"
                            >
                                <UserCircleIcon class="h-6 w-6" />
                                <span>{{ authStore.user?.username || 'User' }}</span>
                                <ChevronDownIcon class="h-4 w-4" />
                            </button>

                            <div
                                v-if="showUserMenu"
                                class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10"
                            >
                                <button
                                    @click="logout"
                                    class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <main class="flex-grow">
            <div class="container mx-auto px-4 py-6">
                <router-view />
            </div>
        </main>

        <footer class="bg-gray-800 text-white py-4">
            <div class="container mx-auto px-4">
                <p class="text-center">
                    &copy; {{ new Date().getFullYear() }} CRM System
                </p>
            </div>
        </footer>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useToast } from 'vue-toastification';
import SearchBar from "./components/SearchBar.vue";
import { UserCircleIcon, ChevronDownIcon } from "@heroicons/vue/24/solid";

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();
const showUserMenu = ref(false);

const toggleUserMenu = () => {
    showUserMenu.value = !showUserMenu.value;
};

const logout = async () => {
    await authStore.logout();
    toast.info('You have been logged out');
    router.push('/login');
    showUserMenu.value = false;
};

// Close the user menu when clicking outside
window.addEventListener('click', (event) => {
    if (showUserMenu.value) {
        showUserMenu.value = false;
    }
});
</script>

<style scoped>
.nav-link {
    @apply px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors;
}

.router-link-active {
    @apply font-medium text-blue-600;
}
</style>
