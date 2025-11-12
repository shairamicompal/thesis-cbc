<!-- src/components/system/interpreter/ResultPage.vue -->
<script setup>
import { computed } from 'vue'
import { useAuthUserStore } from '@/stores/authUser'

const props = defineProps({
  htmlResult: { type: String, default: '' },
  rawMarkdown: { type: String, default: '' },
  provider: { type: String, default: '' },
  model: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  canSave: { type: Boolean, default: false },

  patientAge: { type: [String, Number], default: '' },
  patientSex: { type: String, default: '' },

  labName: { type: String, default: '' },
  labCity: { type: String, default: '' },
  labCountry: { type: String, default: '' },
  testDate: { type: String, default: '' },

  saveSuccess: { type: String, default: '' },
  saveError: { type: String, default: '' },

  summaryItems: { type: Array, default: () => [] },
  chipColorFn: { type: Function, default: () => '' },
  fmtValFn: {
    type: Function,
    default: (item) =>
      item && item.value !== undefined ? item.value : '—',
  },
})

const emit = defineEmits(['back', 'save'])
const authUser = useAuthUserStore()

/* --------- Computed: patient info --------- */
const patientName = computed(() => {
  const meta = authUser?.userData || {}
  const first =
    meta.firstname ||
    meta.first_name ||
    meta.firstName ||
    meta.given_name ||
    ''
  const last =
    meta.lastname ||
    meta.last_name ||
    meta.lastName ||
    meta.family_name ||
    ''
  const full = `${first} ${last}`.trim()
  return full || meta.full_name || meta.name || ''
})

/* --------- AI provider label --------- */
const providerLabel = computed(() => {
  if (props.provider === 'openai') return 'ChatGPT 4o (OpenAI)'
  if (props.provider === 'groq') return 'Qwen3-32B (Groq)'
  return props.provider || 'AI Interpreter'
})

/* --------- Meta info --------- */
const labLocation = computed(() => {
  const parts = [props.labCity, props.labCountry].filter(Boolean)
  return parts.join(', ')
})

const displayTestDate = computed(() => {
  if (!props.testDate) return ''
  return props.testDate.includes('T')
    ? props.testDate.split('T')[0]
    : props.testDate
})

const hasCBCSummary = computed(() => (props.summaryItems || []).length > 0)

/* --------- Helper: ref formatting for differentials --------- */
const isDiffKey = (k) =>
  ['neut', 'lymph', 'mono', 'eos', 'baso'].includes(k)

const formatRef = (item) => {
  // For differentials, show as %
  if (isDiffKey(item.key)) {
    const low = item.low ?? ''
    const high = item.high ?? ''
    if (!isFinite(low) || !isFinite(high)) return ''
    return `${(low * 100).toFixed(0)}–${(high * 100).toFixed(0)} %`
  }

  // For regular items, show standard
  const low = item.low ?? ''
  const high = item.high ?? ''
  const unit = item.unit || ''
  if (low === '' && high === '') return unit ? unit : ''
  return `${low}–${high} ${unit}`.trim()
}
</script>

<template>
  <div class="result-wrapper">
    <!-- Top bar -->
    <v-card-title class="d-flex justify-space-between align-center gap-3">
      <div class="d-flex align-center gap-2">
        <v-btn
          variant="outlined"
          size="small"
          class="back-btn"
          @click="emit('back')"
        >
          <v-icon start>mdi-arrow-left</v-icon>
          Back
        </v-btn>
      </div>

      <div class="d-flex align-center gap-2">
        <v-chip
          size="small"
          color="#0D47A1"
          variant="elevated"
          class="text-white"
        >
          {{ providerLabel }}
        </v-chip>
      </div>
    </v-card-title>

    <v-card-text>
      <!-- Patient & Lab Summary -->
      <v-sheet class="meta-sheet" rounded="xl" variant="outlined">
        <v-row dense>
          <v-col cols="12" md="4">
            <div class="meta-label">Patient Name</div>
            <div class="meta-value">
              {{ patientName || 'Not set in profile' }}
            </div>
          </v-col>

          <v-col cols="6" md="2">
            <div class="meta-label">Age</div>
            <div class="meta-value">{{ patientAge || '—' }}</div>
          </v-col>

          <v-col cols="6" md="2">
            <div class="meta-label">Sex</div>
            <div class="meta-value">{{ patientSex || '—' }}</div>
          </v-col>

          <v-col cols="12" md="4">
            <div class="meta-label">Laboratory Name</div>
            <div class="meta-value">{{ labName || '—' }}</div>
          </v-col>

          <v-col cols="12" md="4">
            <div class="meta-label">Laboratory Location</div>
            <div class="meta-value">{{ labLocation || '—' }}</div>
          </v-col>

          <v-col cols="6" md="2">
            <div class="meta-label">Test Date</div>
            <div class="meta-value">{{ displayTestDate || '—' }}</div>
          </v-col>

          <v-col cols="6" md="2">
            <div class="meta-label">Country</div>
            <div class="meta-value">{{ labCountry || '—' }}</div>
          </v-col>
        </v-row>
      </v-sheet>

      <!-- CBC Summary -->
      <v-sheet
        v-if="hasCBCSummary"
        class="cbc-summary-sheet mt-4"
        rounded="xl"
        variant="outlined"
      >
        <div
          class="cbc-summary-header d-flex align-center gap-2 mb-2"
        >
          <v-icon size="18" class="me-2"
            >mdi-clipboard-pulse-outline</v-icon
          >
          <h3>Status Overview</h3>
        </div>

        <v-row dense>
          <v-col
            v-for="item in summaryItems"
            :key="item.key"
            cols="12"
            sm="6"
            md="4"
            lg="3"
            class="mb-1"
          >
            <div class="cbc-item">
              <div class="cbc-label">{{ item.label }}</div>
              <div class="cbc-value-line">
                <span class="cbc-value">
                  {{ fmtValFn(item) }}
                </span>
                <v-chip
                  v-if="item.status && item.status !== '—'"
                  :color="chipColorFn(item.status)"
                  size="x-small"
                  variant="elevated"
                  class="status-chip text-uppercase font-weight-bold"
                >
                  {{ item.status }}
                </v-chip>
              </div>
              <div class="cbc-ref">
                Ref: {{ formatRef(item) }}
              </div>
            </div>
          </v-col>
        </v-row>
      </v-sheet>

      <!-- Loading -->
      <v-progress-linear
        v-if="loading || saving"
        indeterminate
        class="mt-4"
      />

      <!-- AI Interpretation -->
      <div class="mt-6 ai-section">
        <div class="ai-header d-flex align-center gap-2 mb-2">
          <v-icon color="#b70d37" class="me-2"
            >mdi-robot-outline</v-icon
          >
          <span class="ai-title">AI-Assisted Explanation</span>
        </div>

        <v-alert
          type="warning"
          variant="tonal"
          density="comfortable"
          class="mb-4"
        >
          This explanation is for educational support only and must
          not replace assessment by a licensed physician. If you feel
          unwell or your results are significantly abnormal, please
          consult your doctor.
        </v-alert>

        <div
          v-if="htmlResult"
          class="ai-markdown"
          v-html="htmlResult"
        />

        <div v-else class="text-grey-darken-1 text-body-2">
          No interpretation available. Please go back and run the
          analysis again.
        </div>
      </div>

      <!-- Save buttons + messages -->
      <div
        class="mt-6 d-flex flex-wrap gap-3 justify-space-between align-center"
      >
        <div>
          <v-btn
            v-if="canSave"
            color="#0D47A1"
            class="save-btn text-white"
            :loading="saving"
            :disabled="saving"
            @click="emit('save')"
          >
            <v-icon start>mdi-content-save-outline</v-icon>
            Save to History
          </v-btn>
        </div>

        <div class="flex-grow-1 d-flex justify-end">
          <v-alert
            v-if="saveSuccess"
            type="success"
            variant="tonal"
            density="compact"
            class="status-alert mt-4"
          >
            {{ saveSuccess }}
          </v-alert>
          <v-alert
            v-else-if="saveError"
            type="error"
            variant="tonal"
            density="compact"
            class="status-alert"
          >
            {{ saveError }}
          </v-alert>
        </div>
      </div>
    </v-card-text>
  </div>
</template>

<style scoped>
.result-wrapper {
  width: 100%;
}

/* Buttons */
.back-btn,
.save-btn {
  text-transform: none;
  border-radius: 999px;
}

/* Meta section */
.meta-sheet {
  padding: 10px 20px;
  border: 2px solid #0d47a1;
}

.meta-label {
  font-size: 0.7rem;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.meta-value {
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: 2px;
}

/* CBC Summary */
.cbc-summary-sheet {
  padding: 10px 14px;
}

.cbc-summary-header {
  font-size: 0.8rem;
}

.cbc-item {
  padding: 4px 0;
}

.cbc-label {
  font-size: 0.75rem;
}

.cbc-value-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cbc-value {
  font-size: 0.9rem;
  font-weight: 600;
}

.cbc-ref {
  font-size: 0.68rem;
}

.status-chip {
  font-size: 0.6rem;
}

/* AI Section */
.ai-section {
  margin-top: 18px;
}

.ai-header .ai-title {
  font-weight: 600;
  font-size: 0.98rem;
}

.ai-markdown {
  font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont,
    sans-serif;
  line-height: 1.6;
  font-size: 0.92rem;
}

.ai-markdown h3,
.ai-markdown h2 {
  margin-top: 0.6rem;
  margin-bottom: 0.25rem;
  font-size: 1rem;
  font-weight: 700;
  color: #0d47a1;
}

.ai-markdown ul,
.ai-markdown ol {
  margin: 0.25rem 0 0.45rem;
  padding-left: 1.25rem;
}

.ai-markdown li {
  margin: 0.12rem 0;
}

.ai-markdown strong {
  font-weight: 600;
}

.status-alert {
  min-width: 180px;
}
</style>
