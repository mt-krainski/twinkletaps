<template>
  <v-container fill-height style="max-width: 400px">
    <v-row align="center" justify="center" class="pt-10">
      <v-col class="text-center" cols="12">
        <v-btn
          @mousedown="clickStart"
          @mouseup="clickEnd"
          icon
          size="200px"
          :disabled="cooldown"
          :loading="cooldown"
        >
          <v-icon size="100px">mdi-lightbulb-on-outline</v-icon>
          <template v-slot:loader>
            <v-progress-circular indeterminate :size="60"></v-progress-circular>
          </template>
        </v-btn>
      </v-col>
      <v-col class="text-left pt-10" cols="12">
        <div style="font-family: monospace">{{ tapsDisplay }}</div>
      </v-col>
    </v-row>
  </v-container>
</template>
<script lang="ts" setup>
const tapDuration = 30;

const clickActive = ref(false);
const recording = ref(false);
const cooldown = ref(false);
const recordedTap: Ref<boolean[]> = ref([]);
let recordingInterval: ReturnType<typeof setInterval>;

const tapsDisplay = computed(() => {
  return recordedTap.value.map(x => (x ? '*' : '_')).join('');
});

function clickStart() {
  clickActive.value = true;
  if (!recording.value) {
    recordedTap.value.splice(0, recordedTap.value.length);
    recordTapState(true);
    recording.value = true;
    recordingInterval = setInterval(recordTap, 100);
  }
}

function clickEnd() {
  clickActive.value = false;
}

function recordTap() {
  recordTapState();
  if (tapLongEnough()) finishRecording();
}

function recordTapState(forceValue?: boolean) {
  if (forceValue !== undefined) recordedTap.value.push(forceValue);
  else recordedTap.value.push(clickActive.value);
}

function tapLongEnough() {
  return recordedTap.value.length > tapDuration;
}

function finishRecording() {
  clearInterval(recordingInterval);
  recording.value = false;
  cooldown.value = true;
  setTimeout(() => (cooldown.value = false), 3000);
}
</script>
