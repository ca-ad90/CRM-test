// Updated main.js file with auth initialization

import { createApp } from "vue";
import { createPinia } from "pinia";
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";
import App from "./App.vue";
import router from "./router";
import "./index.css";
import { useAuthStore } from "./stores/auth";
import axios from "axios";

// Create app instance
const app = createApp(App);
app.config.globalProperties.$log = console.log;

// Setup Pinia store
const pinia = createPinia();
app.use(pinia);

// Initialize auth store and check for existing token
const authStore = useAuthStore(pinia);
if (authStore.token) {
  // Set axios default headers
  axios.defaults.headers.common['Authorization'] = `Bearer ${authStore.token}`;

  // Try to fetch current user
  authStore.fetchCurrentUser().catch(() => {
    // If fetching user fails, redirect to login
    router.push('/login');
  });
}

// Setup navigation guard for protected routes
router.beforeEach((to, from, next) => {
  // Check if the route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // If not authenticated, redirect to login
    next('/login');
  } else {
    // Otherwise continue to the route
    next();
  }
});

app.use(router);
app.use(Toast, {
  transition: "Vue-Toastification__bounce",
  maxToasts: 3,
  newestOnTop: true,
});

app.mount("#app");
