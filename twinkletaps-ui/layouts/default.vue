<template>
  <v-layout class="rounded rounded-md">
    <v-app-bar>
      <template v-slot:prepend>
        <v-btn to="/" nuxt icon="mdi-home" depressed></v-btn>
      </template>
      <v-app-bar-title>Twinkle Taps</v-app-bar-title>
      <v-btn to="/" nuxt class="mx-2">Home</v-btn>
      <v-btn to="/about" nuxt class="mx-2">About</v-btn>
      <v-btn v-if="authenticated" icon>
        <v-icon>mdi-cog</v-icon>
        <v-menu activator="parent">
          <v-btn @click="logout" class="mx-2">Logout</v-btn>
        </v-menu>
      </v-btn>
    </v-app-bar>
    <v-main
      class="d-flex align-center justify-center"
      style="min-height: 300px"
    >
      <slot />
    </v-main>
  </v-layout>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia'; // import storeToRefs helper hook from pinia
import { useAuthStore } from '~/store/auth'; // import the auth store we just created

const router = useRouter();

const { logUserOut } = useAuthStore(); // use authenticateUser action from  auth store
const { authenticated } = storeToRefs(useAuthStore()); // make authenticated state reactive with storeToRefs

const items = [
  { title: 'Click Me' },
  { title: 'Click Me' },
  { title: 'Click Me' },
  { title: 'Click Me 2' },
];

const logout = () => {
  logUserOut();
  router.push('/login');
};
</script>
