<template>
    <div class="min-h-screen flex flex-col">
        <header v-if="isAuthenticated" class="bg-white shadow">
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
                                class="flex items-center space-x-1 text-gray-700 hover:text-blue-600 focus:outline-none"
                            >
                                <span>{{ currentUser?.username }}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                                </svg>
                            </button>
                            <div
                                v-if="userMenuOpen"
                                class="absolute right-0 mt-2 w-48 py-2 bg-white rounded-md shadow-xl z-10"
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
import { ref, onMounted, computed, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "./stores/auth";
import SearchBar from "./components/SearchBar.vue";

const router = useRouter();
const authStore = useAuthStore();
const userMenuOpen = ref(false);

const isAuthenticated = computed(() => authStore.isAuthenticated);
const currentUser = computed(() => authStore.currentUser);

const toggleUserMenu = () => {
    userMenuOpen.value = !userMenuOpen.value;
};

const logout = () => {
    authStore.logout();
    router.push('/login');
};

// Close menu when clicking outside
const handleClickOutside = (event) => {
    if (userMenuOpen.value && !event.target.closest('.relative')) {
        userMenuOpen.value = false;
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
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
