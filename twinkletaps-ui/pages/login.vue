<template>
  <v-container fluid fill-height style="max-width: 300px">
    <v-row align="center" justify="center">
      <v-col class="text-center pt-10" cols="12">
        <div class="text-h2">Login</div>
      </v-col>
      <v-col class="text-center" cols="12">
        <label for="username"><b>Username</b></label>
      </v-col>

      <v-col class="text-center" cols="12">
        <v-text-field
          v-model="user.username"
          type="text"
          class="input"
          placeholder="Enter Username"
          name="username"
          required
        />
      </v-col>
      <v-col class="text-center" cols="12">
        <label for="password"><b>Password</b></label>
      </v-col>
      <v-col class="text-center" cols="12">
        <v-text-field
          v-model="user.password"
          type="password"
          class="input"
          placeholder="Enter Password"
          name="password"
          required
        />
      </v-col>
      <v-col class="text-center" cols="12">
        <v-btn class="button" @click.prevent="login">Login</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { useAuthStore } from '~/store/auth';

const { authenticateUser } = useAuthStore();
const { authenticated } = storeToRefs(useAuthStore());

const runtimeConfig = useRuntimeConfig();

const user = ref({
  username: '',
  password: '',
});
const router = useRouter();

if (runtimeConfig.public.env === 'dev') {
  user.value.username = 'test-user';
  user.value.password = 'local-dev';
}

const login = async () => {
  console.log(user.value);
  await authenticateUser(user.value);
  if (authenticated) {
    router.push('/');
  }
};
</script>
