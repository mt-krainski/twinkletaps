<template>
  <h1>Index page</h1>
  <v-btn>Hello Sass Changes</v-btn>
  <v-card class="mx-auto" prepend-icon="mdi-home" width="400">
    <template v-slot:title>Another Title</template>

    <v-card-text>This is content</v-card-text>
  </v-card>
</template>

<style lang="scss">
@use './settings';
</style>

<script setup lang="ts">
definePageMeta({
  title: 'Test',
});
</script>
