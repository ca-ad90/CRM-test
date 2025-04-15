import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import Dashboard from "../views/Dashboard.vue";
import Login from "../views/Login.vue";
import Register from "../views/Register.vue";

const routes = [
    {
        path: "/login",
        name: "Login",
        component: Login,
        meta: { requiresGuest: true }
    },
    {
        path: "/register",
        name: "Register",
        component: Register,
        meta: { requiresGuest: true }
    },
    {
        path: "/",
        name: "Dashboard",
        component: Dashboard,
        meta: { requiresAuth: true }
    },
    {
        path: "/companies",
        name: "Companies",
        component: () => import("../views/Companies.vue"),
        meta: { requiresAuth: true }
    },
    {
        path: "/companies/:id",
        name: "CompanyDetails",
        component: () => import("../views/CompanyDetails.vue"),
        props: true,
        meta: { requiresAuth: true }
    },
    {
        path: "/contacts",
        name: "Contacts",
        component: () => import("../views/Contacts.vue"),
        meta: { requiresAuth: true }
    },
    {
        path: "/contacts/:id",
        name: "ContactDetails",
        component: () => import("../views/ContactDetails.vue"),
        props: true,
        meta: { requiresAuth: true }
    },
    {
        path: "/meetings",
        name: "Meetings",
        component: () => import("../views/Meetings.vue"),
        meta: { requiresAuth: true }
    },
    {
        path: "/meetings/:id",
        name: "MeetingDetails",
        component: () => import("../views/MeetingDetails.vue"),
        props: true,
        meta: { requiresAuth: true }
    },
    {
        path: "/search",
        name: "Search",
        component: () => import("../views/Search.vue"),
        meta: { requiresAuth: true }
    },
    {
        path: "/:pathMatch(.*)*",
        name: "NotFound",
        component: () => import("../views/NotFound.vue")
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

// Navigation guards
router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();

    // Check if route requires authentication
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        next({ name: 'Login' });
    }
    // Check if route requires guest access only
    else if (to.meta.requiresGuest && authStore.isAuthenticated) {
        next({ name: 'Dashboard' });
    }
    else {
        next();
    }
});

export default router;
