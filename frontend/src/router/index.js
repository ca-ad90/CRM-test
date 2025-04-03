import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "../views/Dashboard.vue";

const routes = [
    {
        path: "/",
        name: "Dashboard",
        component: Dashboard,
    },
    {
        path: "/companies",
        name: "Companies",
        component: () => import("../views/Companies.vue"),
    },
    {
        path: "/companies/:id",
        name: "CompanyDetails",
        component: () => import("../views/CompanyDetails.vue"),
        props: true,
    },
    {
        path: "/contacts",
        name: "Contacts",
        component: () => import("../views/Contacts.vue"),
    },
    {
        path: "/contacts/:id",
        name: "ContactDetails",
        component: () => import("../views/ContactDetails.vue"),
        props: true,
    },
    {
        path: "/meetings",
        name: "Meetings",
        component: () => import("../views/Meetings.vue"),
    },
    {
        path: "/meetings/:id",
        name: "MeetingDetails",
        component: () => import("../views/MeetingDetails.vue"),
        props: true,
    },
    {
        path: "/search",
        name: "Search",
        component: () => import("../views/Search.vue"),
    },
    {
        path: "/:pathMatch(.*)*",
        name: "NotFound",
        component: () => import("../views/NotFound.vue"),
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
