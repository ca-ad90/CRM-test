<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div class="text-center mb-8">
              <h1 class="text-2xl font-bold text-blue-600">CRM System</h1>
              <p class="text-gray-600 mt-2">Sign in to your account</p>
          </div>

          <div v-if="authStore.error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <span>{{ authStore.error }}</span>
          </div>

          <form @submit.prevent="login" class="space-y-6">
              <div>
                  <label for="username" class="label">Username</label>
                  <input
                      id="username"
                      v-model="form.username"
                      type="text"
                      class="input"
                      required
                      autocomplete="username"
                  />
              </div>

              <div>
                  <label for="password" class="label">Password</label>
                  <input
                      id="password"
                      v-model="form.password"
                      type="password"
                      class="input"
                      required
                      autocomplete="current-password"
                  />
              </div>

              <div>
                  <button
                      type="submit"
                      class="btn btn-primary w-full"
                      :disabled="authStore.loading"
                  >
                      <span v-if="authStore.loading">
                          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Signing in...
                      </span>
                      <span v-else>Sign in</span>
                  </button>
              </div>
          </form>

          <div class="mt-6 text-center">
              <p class="text-gray-600">
                  Don't have an account?
                  <router-link to="/register" class="text-blue-600 hover:underline">
                      Create an account
                  </router-link>
              </p>
          </div>
      </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useToast } from 'vue-toastification';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const form = ref({
  username: '',
  password: ''
});

const login = async () => {
  authStore.clearError();

  const success = await authStore.login({
      username: form.value.username,
      password: form.value.password
  });

  if (success) {
      toast.success('Logged in successfully');
      router.push('/');
  }
};
</script>
