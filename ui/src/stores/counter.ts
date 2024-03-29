import { defineStore } from 'pinia';

export const useTestStore = defineStore('test', () => {
  const test = 1;
  return test;
});
