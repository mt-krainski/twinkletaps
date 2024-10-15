<template>
  <v-layout class="align-center justify-center">
    <v-app-bar>
      <v-app-bar-title>
        <v-btn
          variant="text"
          size="large"
          @click="navigateTo('/')"
        >
          Twinkle Taps
        </v-btn>
      </v-app-bar-title>
      <v-btn
        v-if="authenticated"
        icon
        name="userMenu"
      >
        <v-icon>mdi-cog</v-icon>
        <v-menu activator="parent">
          <v-btn
            class="mx-2"
            @click="logout"
          >
            Logout
          </v-btn>
        </v-menu>
      </v-btn>
    </v-app-bar>
    <v-main
      class="d-flex align-center justify-center"
      style="min-height: 300px"
    >
      <slot />
    </v-main>
    <v-footer
      name="footer"
      app
    >
      <v-btn
        class="mx-auto"
        variant="text"
        @click="navigateTo('/about')"
      >
        About
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

const logout = async () => {
  await logUserOut();
  router.push('/login');
};
</script>
