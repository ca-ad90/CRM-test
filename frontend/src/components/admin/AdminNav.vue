<!-- src/components/admin/AdminNav.vue -->
<template>
  <div class="bg-white shadow-md rounded-lg">
      <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold">Admin Navigation</h2>
      </div>
      <nav class="p-2">
          <router-link
              to="/admin"
              class="block px-4 py-2 rounded-md transition-colors"
              :class="$route.path === '/admin' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'">
              Dashboard
          </router-link>
          <router-link
              to="/admin/users"
              class="block px-4 py-2 rounded-md transition-colors"
              :class="$route.path === '/admin/users' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'">
              User Management
          </router-link>
          <router-link
              to="/admin/activity-log"
              class="block px-4 py-2 rounded-md transition-colors"
              :class="$route.path === '/admin/activity-log' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'">
              Activity Log
          </router-link>
          <router-link
              to="/admin/reports"
              class="block px-4 py-2 rounded-md transition-colors"
              :class="$route.path === '/admin/reports' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'">
              System Reports
          </router-link>

          <!-- System Data section -->
          <div class="mt-4 pt-3 border-t border-gray-200">
              <h3 class="px-4 text-xs uppercase text-gray-500 font-bold mb-2">System Data</h3>
              <router-link
                  to="/admin/companies"
                  class="block px-4 py-2 rounded-md transition-colors"
                  :class="$route.path === '/admin/companies' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'">
                  All Companies
              </router-link>
              <router-link
                  to="/admin/contacts"
                  class="block px-4 py-2 rounded-md transition-colors"
                  :class="$route.path === '/admin/contacts' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'">
                  All Contacts
              </router-link>
              <router-link
                  to="/admin/meetings"
                  class="block px-4 py-2 rounded-md transition-colors"
                  :class="$route.path === '/admin/meetings' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'">
                  All Meetings
              </router-link>
              <router-link
                  to="/admin/communications"
                  class="block px-4 py-2 rounded-md transition-colors"
                  :class="$route.path === '/admin/communications' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'">
                  All Communications
              </router-link>
          </div>
      </nav>
  </div>
</template>
