<!-- src/components/system/interpreter/ResultPage.vue -->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  htmlResult: { type: String, required: true }, // pre-sanitized HTML
  rawMarkdown: { type: String, default: '' },
  provider: { type: String, default: '' }, // 'groq' | 'openai'
  model: { type: String, default: '' }, // 'qwen/qwen3-32b' | 'gpt-4o' ...
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  canSave: { type: Boolean, default: false },

  // feedback from parent after save
  saveSuccess: { type: String, default: '' },
  saveError: { type: String, default: '' },

  // patient details
  patientAge: { type: [String, Number], default: '' },
  patientSex: { type: String, default: '' }, // 'M' | 'F' | ''
})

const emit = defineEmits(['back', 'save'])

const providerLabel = computed(() => {
  if (props.provider === 'openai') return 'ChatGPT 4o (OpenAI)'
  if (props.provider === 'groq') return 'Qwen3-32B (Groq)'
  return props.provider
})

const sexLabel = computed(() => {
  if (!props.patientSex) return ''
  if (props.patientSex === 'M') return 'Male'
  if (props.patientSex === 'F') return 'Female'
  return props.patientSex
})

function onBack() {
  emit('back')
}

function onSave() {
  if (!props.canSave || props.saving) return
  emit('save')
}
</script>

<template>
  <div>
    <!-- Top bar -->
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="d-flex align-center ga-3">
        <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="onBack">
          Back
        </v-btn>
      </div>

      <v-chip
        variant="flat"
        color="#b70d37"
        class="responsive-chip text-truncate"
        :title="providerLabel + ' • ' + model"
      >
        <span class="chip-text">
          {{ providerLabel }} • {{ model }}
        </span>
      </v-chip>
    </div>

    <!-- Loading / Saving -->
    <v-alert
      v-if="loading || saving"
      type="info"
      variant="tonal"
      class="mb-3"
    >
      {{ loading ? 'Generating interpretation…' : 'Saving to history…' }}
    </v-alert>

    <!-- Result card -->
    <v-card rounded="xl" variant="flat">
      <v-card-text>
        <!-- Patient profile banner -->
        <div
          v-if="patientAge !== '' || sexLabel"
          class="patient-banner mb-4"
        >
          <div class="patient-left">
            <div class="patient-label mb-2">
              Patient Profile
            </div>
            <div class="patient-pills">
              <div v-if="patientAge !== ''" class="pill">
                <v-icon size="16" class="pill-icon">mdi-cake-variant</v-icon>
                <span class="pill-label me-2">Age:</span>
                <span class="pill-value">{{ patientAge }}</span>
              </div>

              <div v-if="sexLabel" class="pill">
                <v-icon size="16" class="pill-icon">mdi-gender-male-female</v-icon>
                <span class="pill-label me-2">Sex:</span>
                <span class="pill-value">{{ sexLabel }}</span>
              </div>
            </div>
          </div>

          <!-- subtle side icon -->
          <div class="patient-icon-wrap">
            <v-icon size="24">mdi-water-plus</v-icon>
          </div>
        </div>

        <!-- AI result -->
        <div v-html="htmlResult" class="ai-markdown mb-5"></div>

        <!-- Bottom action buttons -->
        <div class="d-flex justify-end flex-wrap ga-2 mt-6">
          <v-btn
            color="primary"
            :disabled="!canSave || saving"
            :loading="saving"
            prepend-icon="mdi-content-save"
            @click="onSave"
          >
            Save to History
          </v-btn>
        </div>

        <!-- Feedback messages (below button) -->
        <transition name="fade">
          <v-alert
            v-if="saveSuccess"
            type="success"
            variant="tonal"
            class="mt-3"
          >
            {{ saveSuccess }}
          </v-alert>
        </transition>

        <transition name="fade">
          <v-alert
            v-if="saveError"
            type="error"
            variant="tonal"
            class="mt-3"
          >
            {{ saveError }}
          </v-alert>
        </transition>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.ai-markdown {
  font-family: 'Poppins', sans-serif;
  line-height: 1.6;
  font-size: 0.95rem;
}
.ai-markdown h2 {
  margin: 0.35rem 0 0.45rem;
  font-weight: 700;
  font-size: 1.02rem;
}
.ai-markdown ul,
.ai-markdown ol {
  margin: 0.25rem 0 0.55rem;
  padding-left: 1.25rem;
}
.ai-markdown li {
  margin: 0.18rem 0;
}
.ai-markdown strong {
  font-weight: 600;
}

/* Patient banner */
.patient-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  background-color: var(--v-theme-surface);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  transition: background-color 0.3s ease;
  border: 2px solid #b70d37;
}

.patient-left {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.patient-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 200;
}

.patient-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  background-color: #c54a69;
  font-size: 0.78rem;
  color: var(--v-theme-on-surface);
}

.pill-icon {
  margin-right: 0.18rem;
}

.pill-label {
  font-weight: 500;
  margin-right: 0.15rem;
  opacity: 0.8;
}

.pill-value {
  font-weight: 600;
}

.patient-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(183, 13, 55, 0.1);
  color: #b70d37;
}

/* Provider chip */
.responsive-chip {
  max-width: 350px;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chip-text {
  display: inline-block;
  max-width: 100%;
}

@media (max-width: 600px) {
  .responsive-chip {
    max-width: 260px;
    font-size: 0.7rem;
  }
  .patient-banner {
    flex-direction: row;
    align-items: flex-start;
  }
  .patient-icon-wrap {
    align-self: center;
  }
}
</style>
