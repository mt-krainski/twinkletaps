<template>
  <v-container
    fill-height
    style="max-width: 400px"
  >
    <v-row
      align="center"
      justify="center"
      class="pt-10"
    >
      <v-col
        class="text-center"
        cols="12"
      >
        <v-btn
          icon
          size="200px"
          :disabled="cooldown"
          :loading="cooldown"
          @mousedown="clickStart"
          @mouseup="clickEnd"
        >
          <v-icon size="100px">
            mdi-lightbulb-on-outline
          </v-icon>
          <template #loader>
            <v-progress-circular
              indeterminate
              :size="60"
            />
          </template>
        </v-btn>
      </v-col>
      <v-col
        class="text-center pt-10"
        cols="12"
      >
        <div style="font-family: monospace">
          {{ tapsDisplay }}
        </div>
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
const alreadyRecordedForInterval = ref(false);
let recordingInterval: ReturnType<typeof setInterval>;

const tapsDisplay = computed(() => {
  const mappedTaps = recordedTap.value.map(x => (x ? '‾' : '_')).join('');
  return mappedTaps.padEnd(tapDuration + 1, '-');
});

function clickStart() {
  clickActive.value = true;
  if (recording.value) {
    if (!getLastRecorded()) {
      recordTapState(true);
      alreadyRecordedForInterval.value = true;
    }
  }
  if (!recording.value) {
    clearRecording();
    recordTapState(true);
    recording.value = true;
    recordingInterval = setInterval(recordTap, 100);
  }
}

function clickEnd() {
  clickActive.value = false;
}

function getLastRecorded() {
  return recordedTap.value.at(-1);
}

function clearRecording() {
  recordedTap.value.splice(0, recordedTap.value.length);
}

function recordTap() {
  if (!alreadyRecordedForInterval.value) {
    recordTapState();
  } else {
    alreadyRecordedForInterval.value = false;
  }

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
