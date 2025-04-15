import { createApp } from "vue";
import { createPinia } from "pinia";
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";
import App from "./App.vue";
import router from "./router";
import axios from "axios";
import { useAuthStore } from "./stores/auth";
import "./index.css";

// Set default base URL for API calls
axios.defaults.baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Initialize the app
const app = createApp(App);
app.config.globalProperties.$log = console.log;

// Setup Pinia state management
const pinia = createPinia();
app.use(pinia);

// Initialize auth store
const authStore = useAuthStore(pinia);
authStore.initAuth();

// Setup axios interceptors for handling auth errors
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response ? error.response.status : null;

        // Handle authentication errors
        if (status === 401) {
            // Unauthorized - Redirect to login page
            router.push('/login');
            authStore.logout();
        }

        return Promise.reject(error);
    }
);

// Setup router and Toast notification
app.use(router);
app.use(Toast, {
    transition: "Vue-Toastification__bounce",
    maxToasts: 3,
    newestOnTop: true,
});

// Mount the app
app.mount("#app");
