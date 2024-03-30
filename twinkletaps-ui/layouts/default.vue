<template>
  <v-layout class="align-center justify-center">
    <v-app-bar>
      <template v-slot:prepend>
        <v-btn to="/" nuxt icon="mdi-home"></v-btn>
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
    <v-footer name="footer" app>
      <v-btn class="mx-auto" variant="text" @click="print('footer')">
        Get data
      </v-btn>
    </v-footer>
  </v-layout>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { useAuthStore } from '~/store/auth';

const router = useRouter();

const { logUserOut } = useAuthStore();
const { authenticated } = storeToRefs(useAuthStore());

const logout = () => {
  logUserOut();
  router.push('/login');
};
</script>
