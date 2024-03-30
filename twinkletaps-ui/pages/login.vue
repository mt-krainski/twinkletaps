<template>
  <v-container fluid fill-height style="max-width: 300px">
    <v-row align="center" justify="center">
      <v-col class="text-center pt-10" cols="12">
        <div class="text-h2">Login</div>
      </v-col>
      <v-col class="text-center" cols="12">
        <label for="uname"><b>Username</b></label>
      </v-col>

      <v-col class="text-center" cols="12">
        <v-text-field
          v-model="user.username"
          type="text"
          class="input"
          placeholder="Enter Username"
          name="uname"
          required
        />
      </v-col>
      <v-col class="text-center" cols="12">
        <label for="psw"><b>Password</b></label>
      </v-col>
      <v-col class="text-center" cols="12">
        <v-text-field
          v-model="user.password"
          type="password"
          class="input"
          placeholder="Enter Password"
          name="psw"
          required
        />
      </v-col>
      <v-col class="text-center" cols="12">
        <v-btn @click.prevent="login" class="button">Login</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia'; // import storeToRefs helper hook from pinia
import { useAuthStore } from '~/store/auth'; // import the auth store we just created

const { authenticateUser } = useAuthStore(); // use authenticateUser action from  auth store

const { authenticated } = storeToRefs(useAuthStore()); // make authenticated state reactive with storeToRefs

const user = ref({
  username: 'kminchelle',
  password: '0lelplR',
});
const router = useRouter();

const login = async () => {
  console.log(user.value);
  await authenticateUser(user.value); // call authenticateUser and pass the user object
  // redirect to homepage if user is authenticated
  if (authenticated) {
    router.push('/');
  }
};
</script>
