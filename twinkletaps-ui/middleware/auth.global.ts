import { useAuthStore } from '~/store/auth';

export default defineNuxtRouteMiddleware(async to => {
  const runtimeConfig = useRuntimeConfig();
  const { status } = await useFetch(`${runtimeConfig.public.apiBase}/whoami`);
  const { authenticated } = storeToRefs(useAuthStore()); // make authenticated state reactive
  if (status.value === 'success') {
    // check if value exists
    authenticated.value = true; // update the state to authenticated
  }

  // if token exists and url is /login redirect to homepage
  if (status.value === 'success' && to?.name === 'login') {
    return navigateTo('/');
  }

  // if token doesn't exist redirect to log in
  if (status.value === 'error' && to?.name !== 'login') {
    abortNavigation();
    return navigateTo('/login');
  }
});
