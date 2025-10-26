<!-- src/components/system/interpreter/DataInputs.vue -->
<script setup>
import { reactive, watch } from 'vue'

/**
 * Props & Emits
 * - v-model compatible: parent can bind <DataInputs v-model="form"/>
 * - 'analyze' emit: fires when user clicks Analyze with current values & selected provider
 */
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      age: null,
      sex: 'Female',          // 'Female' | 'Male'
      rbc_count: null,        // x10^12/L
      hemoglobin: null,       // g/L
      hematocrit: null,       // L/L
      mcv: null,              // fL
      mch: null,              // pg
      mchc: null,             // g/L
      wbc_count: null,        // x10^9/L
      neutrophils: null,      // %
      lymphocytes: null,      // %
      monocytes: null,        // %
      eosinophils: null,      // %
      basophils: null,        // %
      platelet_count: null,   // x10^9/L
      ai_provider: 'groq',    // 'groq' | 'openai'
      ai_model: 'qwen/qwen3-32b',
    }),
  },
})

const emit = defineEmits(['update:modelValue', 'analyze'])

/* Local, editable state mirrored to v-model */
const form = reactive({ ...props.modelValue })

watch(
  () => form,
  () => emit('update:modelValue', { ...form }),
  { deep: true }
)

/* Switch AI provider (model string stored for later use) */
function setProvider(v) {
  form.ai_provider = v
  form.ai_model = v === 'groq' ? 'qwen/qwen3-32b' : 'gpt-4o'
}

/* Submit current values to parent (wire actual AI call later) */
function onAnalyze() {
  emit('analyze', { ...form })
}

/* Simple numeric rule (allow decimals); Vuetify 3 rule returns true|string */
const numRule = v =>
  v === null || v === '' || !isNaN(Number(v)) ? true : 'Enter a number'

/* Pentra reference ranges & units (as shown on your machine) */
const R = {
  wbc: { range: '5.0–10.0', unit: '×10⁹/L' },
  rbc: { range: '3.4–5.6', unit: '×10¹²/L' },
  hgb: { range: '125–155', unit: 'g/L' },
  hct: { range: '0.36–0.48', unit: 'L/L' },
  plt: { range: '150–400', unit: '×10⁹/L' },

  // Common adult references (typical Pentra setups)
  mcv: { range: '80–100', unit: 'fL' },
  mch: { range: '27–33', unit: 'pg' },
  mchc: { range: '310–360', unit: 'g/L' },

  diff: {
    neut: { range: '40–75', unit: '%' },
    lymph: { range: '20–45', unit: '%' },
    mono:  { range: '2–10',  unit: '%' },
    eos:   { range: '1–6',   unit: '%' },
    baso:  { range: '0–2',   unit: '%' },
  },
}
</script>

<template>
  <v-card>
    <template #title>
      <span class="text-subtitle-1 font-weight-bold">Patient & CBC Inputs</span>
    </template>

    <v-card-text>
      <v-form>
        <!-- Demographics -->
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="form.age"
              label="Age"
              type="number"
              :rules="[numRule]"
              min="0"
              suffix="years"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="8">
            <v-btn-toggle
              class="mt-1"
              variant="outlined"
              divided
              mandatory
              :model-value="form.sex"
              @update:model-value="val => (form.sex = val)"
            >
              <v-btn value="Female" prepend-icon="mdi-gender-female">Female</v-btn>
              <v-btn value="Male" prepend-icon="mdi-gender-male">Male</v-btn>
            </v-btn-toggle>
            <div class="text-caption text-medium-emphasis mt-2">
              Sex is used only to tailor reference flags (no storage beyond this session).
            </div>
          </v-col>
        </v-row>

        <!-- CBC Core -->
        <v-row class="mt-1">
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="form.wbc_count"
              :rules="[numRule]"
              label="WBC"
              type="number"
              step="any"
              :suffix="R.wbc.unit"
              hint="Normal: 5.0–10.0 ×10⁹/L"
              persistent-hint
              prepend-inner-icon="mdi-flask-outline"
              density="comfortable"
            />
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="form.rbc_count"
              :rules="[numRule]"
              label="RBC"
              type="number"
              step="any"
              :suffix="R.rbc.unit"
              hint="Normal: 3.4–5.6 ×10¹²/L"
              persistent-hint
              prepend-inner-icon="mdi-water-percent"
              density="comfortable"
            />
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="form.hemoglobin"
              :rules="[numRule]"
              label="Hemoglobin"
              type="number"
              step="any"
              :suffix="R.hgb.unit"
              hint="Normal: 125–155 g/L"
              persistent-hint
              prepend-inner-icon="mdi-needle"
              density="comfortable"
            />
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="form.hematocrit"
              :rules="[numRule]"
              label="Hematocrit"
              type="number"
              step="any"
              :suffix="R.hct.unit"
              hint="Normal: 0.36–0.48 L/L"
              persistent-hint
              prepend-inner-icon="mdi-chart-bar"
              density="comfortable"
            />
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="form.mcv"
              :rules="[numRule]"
              label="MCV"
              type="number"
              step="any"
              :suffix="R.mcv.unit"
              hint="Normal: 80–100 fL"
              persistent-hint
              prepend-inner-icon="mdi-ruler-square"
              density="comfortable"
            />
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="form.mch"
              :rules="[numRule]"
              label="MCH"
              type="number"
              step="any"
              :suffix="R.mch.unit"
              hint="Normal: 27–33 pg"
              persistent-hint
              prepend-inner-icon="mdi-ruler"
              density="comfortable"
            />
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="form.mchc"
              :rules="[numRule]"
              label="MCHC"
              type="number"
              step="any"
              :suffix="R.mchc.unit"
              hint="Normal: 310–360 g/L"
              persistent-hint
              prepend-inner-icon="mdi-dots-grid"
              density="comfortable"
            />
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="form.platelet_count"
              :rules="[numRule]"
              label="Platelets"
              type="number"
              step="any"
              :suffix="R.plt.unit"
              hint="Normal: 150–400 ×10⁹/L"
              persistent-hint
              prepend-inner-icon="mdi-counter"
              density="comfortable"
            />
          </v-col>
        </v-row>

        <!-- Differential (%) -->
        <v-divider class="my-4" />
        <div class="text-subtitle-2 mb-2">WBC Differential (%)</div>

        <v-row>
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="form.neutrophils"
              :rules="[numRule]"
              label="Neutrophils"
              type="number"
              step="any"
              suffix="%"
              hint="Normal: 40–75 %"
              persistent-hint
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="form.lymphocytes"
              :rules="[numRule]"
              label="Lymphocytes"
              type="number"
              step="any"
              suffix="%"
              hint="Normal: 20–45 %"
              persistent-hint
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="form.monocytes"
              :rules="[numRule]"
              label="Monocytes"
              type="number"
              step="any"
              suffix="%"
              hint="Normal: 2–10 %"
              persistent-hint
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="form.eosinophils"
              :rules="[numRule]"
              label="Eosinophils"
              type="number"
              step="any"
              suffix="%"
              hint="Normal: 1–6 %"
              persistent-hint
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="form.basophils"
              :rules="[numRule]"
              label="Basophils"
              type="number"
              step="any"
              suffix="%"
              hint="Normal: 0–2 %"
              persistent-hint
              density="comfortable"
            />
          </v-col>
        </v-row>

        <!-- AI Provider selector + action -->
        <v-divider class="my-4" />
        <div class="text-subtitle-2 mb-2">AI Provider</div>
        <v-btn-toggle
          variant="flat"
          mandatory
          divided
          :model-value="form.ai_provider"
          @update:model-value="setProvider"
          class="mb-4"
        >
          <v-btn value="groq" prepend-icon="mdi-robot-outline" title="Groq: Qwen3-32B">
            Qwen3-32B (Groq)
          </v-btn>
          <v-btn value="openai" prepend-icon="mdi-brain" title="OpenAI: GPT-4o">
            GPT-4o (OpenAI)
          </v-btn>
        </v-btn-toggle>

        <v-btn color="primary" prepend-icon="mdi-play" @click="onAnalyze">
          Analyze with AI
        </v-btn>
        <div class="text-caption text-medium-emphasis mt-2">
          Action is wired for later — this emits <code>analyze</code> with all current values and the selected model.
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<style scoped>
/* Keep it airy and readable */
</style>
