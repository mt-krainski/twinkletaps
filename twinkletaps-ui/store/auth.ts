import { defineStore } from 'pinia';

interface UserPayloadInterface {
  username: string;
  password: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    authenticated: false,
    loading: false,
  }),
  actions: {
    async authenticateUser({ username, password }: UserPayloadInterface) {
      // useFetch from nuxt 3
      const runtimeConfig = useRuntimeConfig();
      const { data, pending }: any = await useFetch(
        `${runtimeConfig.public.apiBase}/auth`,
        {
          method: 'post',
          body: {
            username,
            password,
          },
        }
      );
      this.loading = pending;

      if (data.value) this.authenticated = true;
    },
    async logUserOut() {
      const runtimeConfig = useRuntimeConfig();
      const { data, pending }: any = await useFetch(
        `${runtimeConfig.public.apiBase}/logout`,
        {
          method: 'post',
        }
      );
      this.authenticated = false;
    },
  },
});
