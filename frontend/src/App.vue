<template>
    <div class="min-h-screen flex flex-col">
        <header class="bg-white shadow">
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
                    <div class="flex items-center">
                        <SearchBar />
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
import SearchBar from "./components/SearchBar.vue";
</script>

<style scoped>
.nav-link {
    @apply px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors;
}

.router-link-active {
    @apply font-medium text-blue-600;
}
</style>
