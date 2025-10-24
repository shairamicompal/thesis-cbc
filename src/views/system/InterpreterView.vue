<!-- src/views/InterpreterView.vue -->
<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavi from '@/components/layout/navigation/SideNavi.vue'
import BottomNavi from '@/components/layout/navigation/BottomNavi.vue'
import { ref, computed, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { getCBCInterpretation as getAI } from '@/utils/API'
import { renderMarkdownSafe } from '@/utils/markdown'

const { mobile } = useDisplay()
const isDrawerVisible = ref(true)

/* ------------ AI Models ------------ */
const GROQ_MODEL = 'qwen/qwen3-32b'
const OPENAI_MODEL = 'gpt-4o'

/* ------------ Form State ------------ */
const formRef = ref()
const loading = ref(false)
const errorMsg = ref('')
const aiResult = ref('')
const htmlResult = computed(() => renderMarkdownSafe(aiResult.value))

const form = ref({
  age: '',
  sex: 'F',
  wbc: '',
  rbc: '',
  hb: '',
  hct: '',
  mcv: '',
  mch: '',
  mchc: '',
  plt: '',
  neutrophils: '',
  lymphocytes: '',
  monocytes: '',
  eosinophils: '',
  basophils: '',
})

/* ------------ Validation ------------ */
const numberRule = (v) =>
  v === '' || v === null || v === undefined || !isNaN(Number(v)) || 'Numbers only'
const requiredNumberRule = (v) =>
  (v !== '' && v !== null && v !== undefined && !isNaN(Number(v))) || 'Required number'

/* ------------ Reference Ranges (Pentra) ------------ */
const ranges = {
  wbc:  { low: 5.0,  high: 10.0,  unit: '×10⁹/L',  label: 'WBC' },
  rbcM: { low: 4.5,  high: 5.2,   unit: '×10¹²/L', label: 'RBC' },
  rbcF: { low: 3.4,  high: 5.6,   unit: '×10¹²/L', label: 'RBC' },
  hbM:  { low: 135,  high: 175,   unit: 'g/L',     label: 'Hemoglobin' },
  hbF:  { low: 125,  high: 155,   unit: 'g/L',     label: 'Hemoglobin' },
  hctM: { low: 0.40, high: 0.52,  unit: 'L/L',     label: 'Hematocrit' },
  hctF: { low: 0.36, high: 0.48,  unit: 'L/L',     label: 'Hematocrit' },
  mcv:  { low: 82,   high: 92,    unit: 'fL',      label: 'MCV' },
  mch:  { low: 27,   high: 32,    unit: 'pg',      label: 'MCH' },
  mchc: { low: 320,  high: 380,   unit: 'g/L',     label: 'MCHC' },
  plt:  { low: 150,  high: 400,   unit: '×10⁹/L',  label: 'Platelets' },
  neut: { low: 0.50, high: 0.70,  unit: '',        label: 'Neutrophils' },
  lymph:{ low: 0.20, high: 0.40,  unit: '',        label: 'Lymphocytes' },
  mono: { low: 0.02, high: 0.06,  unit: '',        label: 'Monocytes' },
  eos:  { low: 0.02, high: 0.05,  unit: '',        label: 'Eosinophils' },
  baso: { low: 0.00, high: 0.01,  unit: '',        label: 'Basophils' },
}

/* ------------ Computed hints ------------ */
const sex = computed(() => (form.value.sex === 'M' ? 'M' : 'F'))
const rbcHint = computed(() =>
  sex.value === 'M' ? 'Normal: 4.5–5.2 ×10¹²/L' : 'Normal: 3.4–5.6 ×10¹²/L'
)
const hbHint = computed(() =>
  sex.value === 'M' ? 'Normal: 135–175 g/L' : 'Normal: 125–155 g/L'
)
const hctHint = computed(() =>
  sex.value === 'M' ? 'Normal: 0.40–0.52 L/L' : 'Normal: 0.36–0.48 L/L'
)

/* ------------ Helpers ------------ */
const parse = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v))
const getStatus = (val, low, high) => {
  if (!isFinite(val)) return '—'
  if (val < low) return 'Low'
  if (val > high) return 'High'
  return 'Normal'
}

/* ------------ Summary table ------------ */
const summaryItems = computed(() => {
  const s = sex.value
  return [
    { key: 'wbc', ...ranges.wbc, value: parse(form.value.wbc), status: getStatus(parse(form.value.wbc), ranges.wbc.low, ranges.wbc.high) },
    { key: 'rbc', ...(s === 'M' ? ranges.rbcM : ranges.rbcF), value: parse(form.value.rbc),
      status: getStatus(parse(form.value.rbc), s === 'M' ? ranges.rbcM.low : ranges.rbcF.low, s === 'M' ? ranges.rbcM.high : ranges.rbcF.high)
    },
    { key: 'hb', ...(s === 'M' ? ranges.hbM : ranges.hbF), value: parse(form.value.hb),
      status: getStatus(parse(form.value.hb), s === 'M' ? ranges.hbM.low : ranges.hbF.low, s === 'M' ? ranges.hbM.high : ranges.hbF.high)
    },
    { key: 'hct', ...(s === 'M' ? ranges.hctM : ranges.hctF), value: parse(form.value.hct),
      status: getStatus(parse(form.value.hct), s === 'M' ? ranges.hctM.low : ranges.hctF.low, s === 'M' ? ranges.hctM.high : ranges.hctF.high)
    },
    { key: 'mcv', ...ranges.mcv, value: parse(form.value.mcv), status: getStatus(parse(form.value.mcv), ranges.mcv.low, ranges.mcv.high) },
    { key: 'mch', ...ranges.mch, value: parse(form.value.mch), status: getStatus(parse(form.value.mch), ranges.mch.low, ranges.mch.high) },
    { key: 'mchc', ...ranges.mchc, value: parse(form.value.mchc), status: getStatus(parse(form.value.mchc), ranges.mchc.low, ranges.mchc.high) },
    { key: 'plt', ...ranges.plt, value: parse(form.value.plt), status: getStatus(parse(form.value.plt), ranges.plt.low, ranges.plt.high) },
    { key: 'neut', ...ranges.neut, value: parse(form.value.neutrophils), status: getStatus(parse(form.value.neutrophils), ranges.neut.low, ranges.neut.high) },
    { key: 'lymph', ...ranges.lymph, value: parse(form.value.lymphocytes), status: getStatus(parse(form.value.lymphocytes), ranges.lymph.low, ranges.lymph.high) },
    { key: 'mono', ...ranges.mono, value: parse(form.value.monocytes), status: getStatus(parse(form.value.monocytes), ranges.mono.low, ranges.mono.high) },
    { key: 'eos', ...ranges.eos, value: parse(form.value.eosinophils), status: getStatus(parse(form.value.eosinophils), ranges.eos.low, ranges.eos.high) },
    { key: 'baso', ...ranges.baso, value: parse(form.value.basophils), status: getStatus(parse(form.value.basophils), ranges.baso.low, ranges.baso.high) },
  ]
})

/* ------------ Display helpers ------------ */
const chipColor = (status) =>
  status === 'Low' ? 'error'
  : status === 'High' ? 'warning'
  : status === 'Normal' ? 'success'
  : undefined

const isDiffKey = (k) => ['neut', 'lymph', 'mono', 'eos', 'baso'].includes(k)
const fmtVal = (item) => {
  if (!isFinite(item.value)) return '—'
  if (isDiffKey(item.key)) return `${(item.value * 100).toFixed(0)} %`
  return `${item.value} ${item.unit || ''}`.trim()
}

/* ------------ Provider selector ------------ */
const provider = ref(localStorage.getItem('cbc_ai_provider') || 'groq')
const providerItems = [
  { title: 'Qwen3-32B (Groq)', value: 'groq' },
  { title: 'ChatGPT 4o (OpenAI)', value: 'openai' },
]
watch(provider, (v) => localStorage.setItem('cbc_ai_provider', v))

/* ------------ Think stripper ------------ */
function stripThink(text = '') {
  if (!text) return ''
  if (text.includes('</think>')) text = text.split('</think>').pop()
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '')
  text = text.replace(/^\s*(?:reasoning|thoughts?)\s*:\s*.*?\n{2,}/i, '')
  return text.trim()
}

/* ------------ Prompt builder ------------ */
function buildPrompt() {
  const s = sex.value
  const core = [
    `Age: ${form.value.age}`,
    `Sex: ${s}`,
    `WBC: ${form.value.wbc} ×10⁹/L (ref 5.0–10.0)`,
    `RBC: ${form.value.rbc} ×10¹²/L (ref ${s === 'M' ? '4.5–5.2' : '3.4–5.6'})`,
    `Hemoglobin: ${form.value.hb} g/L (ref ${s === 'M' ? '135–175' : '125–155'})`,
    `Hematocrit: ${form.value.hct} L/L (ref ${s === 'M' ? '0.40–0.52' : '0.36–0.48'})`,
    `Platelets: ${form.value.plt} ×10⁹/L (ref 150–400)`,
    `MCV: ${form.value.mcv} fL (ref 82–92)`,
    `MCH: ${form.value.mch} pg (ref 27–32)`,
    `MCHC: ${form.value.mchc} g/L (ref 320–380)`,
    `Neutrophils: ${form.value.neutrophils} (ref 0.50–0.70)`,
    `Lymphocytes: ${form.value.lymphocytes} (ref 0.20–0.40)`,
    `Monocytes: ${form.value.monocytes} (ref 0.02–0.06)`,
    `Eosinophils: ${form.value.eosinophils} (ref 0.02–0.05)`,
    `Basophils: ${form.value.basophils} (ref 0.00–0.01)`,
  ].join('\n')

  return `
You are a hematology explainer. Use ONLY the reference ranges supplied.
Avoid diagnosis. Return Markdown with these sections:

## 1) 🔎 Detailed Interpretation Breakdown
## 2) ✅ Summarized Final Interpretation
## 3) 📌 Suggested Next Steps

CBC (use these ranges only):
${core}
`.trim()
}

/* ------------ AI callers ------------ */
async function callGroq(prompt) {
  const text = await getAI({ provider: 'groq', model: GROQ_MODEL, prompt })
  return stripThink(text)
}
async function callOpenAI(prompt) {
  const text = await getAI({ provider: 'openai', model: OPENAI_MODEL, prompt })
  return text
}

/* ------------ Submit ------------ */
async function onSubmit() {
  errorMsg.value = ''
  aiResult.value = ''

  if (formRef.value?.validate) {
    const { valid } = await formRef.value.validate()
    if (!valid) {
      errorMsg.value = 'Please fix the highlighted fields.'
      return
    }
  }

  const required = ['age', 'wbc', 'rbc', 'hb', 'hct', 'mcv', 'mch', 'mchc', 'plt']
  const missing = required.filter((k) =>
    form.value[k] === '' || form.value[k] === null || form.value[k] === undefined
  )
  if (missing.length) {
    errorMsg.value = `Missing required fields: ${missing.join(', ')}`
    return
  }

  loading.value = true
  try {
    const prompt = buildPrompt()
    const raw = provider.value === 'openai' ? await callOpenAI(prompt) : await callGroq(prompt)
    aiResult.value = stripThink(raw)
  } catch (e) {
    console.error(e)
    errorMsg.value = String(e?.message || e || 'Something went wrong while calling AI.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppLayout :is-with-app-bar-nav-icon="!mobile" @is-drawer-visible="isDrawerVisible = !isDrawerVisible">
    <template #navigation>
      <SideNavi v-if="!mobile" :is-drawer-visible="isDrawerVisible" />
    </template>

    <template #content>
      <v-container class="py-6" style="max-width: 1000px">
        <v-card rounded="xl">
          <v-card-item class="pb-0">
            <v-card-title :class="mobile ? 'text-subtitle-1' : 'text-h6'">CBC Interpreter</v-card-title>
            <v-card-subtitle class="text-body-2" :class="{ 'text-center': mobile }">
              Enter your CBC values — review the status overview, then analyze with AI.
            </v-card-subtitle>
          </v-card-item>

          <v-card-text>
            <v-form ref="formRef">
              <v-alert v-if="errorMsg" type="error" class="mb-4" variant="tonal">
                {{ errorMsg }}
              </v-alert>

              <!-- Patient -->
              <div class="mb-2 text-subtitle-2">Patient</div>
              <v-row>
                <v-col :cols="mobile ? 12 : 4">
                  <v-text-field
                    label="Age"
                    v-model="form.age"
                    :rules="[requiredNumberRule]"
                    type="number"
                    step="1"
                    suffix="years"
                    variant="outlined"
                    density="comfortable"
                    rounded
                  />
                </v-col>
                <v-col :cols="mobile ? 12 : 8" class="d-flex align-center">
                  <v-radio-group v-model="form.sex" inline class="mt-0">
                    <v-label class="mr-3">Sex</v-label>
                    <v-radio label="Female" value="F" />
                    <v-radio label="Male" value="M" />
                  </v-radio-group>
                </v-col>
              </v-row>

              <!-- CBC Core -->
              <div class="mt-4 mb-2 text-subtitle-2">CBC Core</div>
              <v-row>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="WBC"
                    v-model="form.wbc"
                    :rules="[requiredNumberRule]"
                    type="number"
                    step="0.01"
                    inputmode="decimal"
                    suffix="×10⁹/L"
                    hint="Normal: 5.0–10.0"
                    persistent-hint
                  />
                </v-col>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="RBC"
                    v-model="form.rbc"
                    :rules="[requiredNumberRule]"
                    type="number"
                    step="0.01"
                    inputmode="decimal"
                    suffix="×10¹²/L"
                    :hint="rbcHint"
                    persistent-hint
                  />
                </v-col>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="Hemoglobin"
                    v-model="form.hb"
                    :rules="[requiredNumberRule]"
                    type="number"
                    step="1"
                    inputmode="decimal"
                    suffix="g/L"
                    :hint="hbHint"
                    persistent-hint
                  />
                </v-col>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="Hematocrit"
                    v-model="form.hct"
                    :rules="[requiredNumberRule]"
                    type="number"
                    step="0.01"
                    inputmode="decimal"
                    suffix="L/L"
                    :hint="hctHint"
                    persistent-hint
                  />
                </v-col>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="Platelets"
                    v-model="form.plt"
                    :rules="[requiredNumberRule]"
                    type="number"
                    step="1"
                    inputmode="decimal"
                    suffix="×10⁹/L"
                    hint="Normal: 150–400"
                    persistent-hint
                  />
                </v-col>
              </v-row>

              <!-- Red Cell Indices -->
              <div class="mt-4 mb-2 text-subtitle-2">Red Cell Indices</div>
              <v-row>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="MCV"
                    v-model="form.mcv"
                    :rules="[requiredNumberRule]"
                    type="number"
                    step="0.1"
                    inputmode="decimal"
                    suffix="fL"
                    hint="Normal: 82–92"
                    persistent-hint
                  />
                </v-col>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="MCH"
                    v-model="form.mch"
                    :rules="[requiredNumberRule]"
                    type="number"
                    step="0.1"
                    inputmode="decimal"
                    suffix="pg"
                    hint="Normal: 27–32"
                    persistent-hint
                  />
                </v-col>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="MCHC"
                    v-model="form.mchc"
                    :rules="[requiredNumberRule]"
                    type="number"
                    step="1"
                    inputmode="decimal"
                    suffix="g/L"
                    hint="Normal: 320–380"
                    persistent-hint
                  />
                </v-col>
              </v-row>

              <!-- Differential -->
              <div class="mt-4 mb-2 text-subtitle-2">Differential (enter ratios 0–1)</div>
              <v-row>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="Neutrophils"
                    v-model="form.neutrophils"
                    :rules="[numberRule]"
                    type="number"
                    step="0.01"
                    inputmode="decimal"
                    placeholder="e.g., 0.62"
                    hint="Normal: 0.50–0.70"
                    persistent-hint
                  />
                </v-col>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="Lymphocytes"
                    v-model="form.lymphocytes"
                    :rules="[numberRule]"
                    type="number"
                    step="0.01"
                    inputmode="decimal"
                    placeholder="e.g., 0.25"
                    hint="Normal: 0.20–0.40"
                    persistent-hint
                  />
                </v-col>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="Monocytes"
                    v-model="form.monocytes"
                    :rules="[numberRule]"
                    type="number"
                    step="0.01"
                    inputmode="decimal"
                    placeholder="e.g., 0.04"
                    hint="Normal: 0.02–0.06"
                    persistent-hint
                  />
                </v-col>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="Eosinophils"
                    v-model="form.eosinophils"
                    :rules="[numberRule]"
                    type="number"
                    step="0.01"
                    inputmode="decimal"
                    placeholder="e.g., 0.02"
                    hint="Normal: 0.02–0.05"
                    persistent-hint
                  />
                </v-col>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="Basophils"
                    v-model="form.basophils"
                    :rules="[numberRule]"
                    type="number"
                    step="0.01"
                    inputmode="decimal"
                    placeholder="e.g., 0.01"
                    hint="Normal: 0.00–0.01"
                    persistent-hint
                  />
                </v-col>
              </v-row>

              <!-- Status Overview -->
              <v-divider class="my-4" />
              <v-alert type="info" variant="tonal" rounded="lg" class="mb-4">
                <div class="mb-2 text-subtitle-2">Status Overview</div>
                <div class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="item in summaryItems"
                    :key="item.key"
                    :color="chipColor(item.status)"
                    :variant="item.status === '—' ? 'outlined' : 'flat'"
                    density="comfortable"
                    class="mb-1"
                  >
                    {{ item.label }}:
                    <strong class="ml-1">{{ fmtVal(item) }}</strong>
                    <span v-if="!['neut','lymph','mono','eos','baso'].includes(item.key) && item.unit" class="ml-1">{{ item.unit }}</span>
                    <span class="ml-2">• {{ item.status }}</span>
                  </v-chip>
                </div>
              </v-alert>

              <!-- Provider + Analyze -->
              <v-row class="mb-2" align="center" no-gutters>
                <v-col :cols="mobile ? 12 : 6">
                  <v-select
                    v-model="provider"
                    :items="providerItems"
                    label="AI Provider"
                    variant="outlined"
                    density="comfortable"
                    rounded
                    hide-details
                  />
                </v-col>
              </v-row>

              <v-btn color="primary" size="large" :loading="loading" :disabled="loading" @click="onSubmit" class="mb-2">
                Get Interpretation (AI)
              </v-btn>
              <v-progress-linear v-if="loading" indeterminate class="mb-2" />
            </v-form>

            <v-divider />

            <!-- AI Result -->
            <v-card v-if="aiResult" class="mt-4" rounded="xl">
              <v-card-title>AI Interpretation</v-card-title>
              <v-card-text style="max-height: 420px; overflow: auto">
                <div v-html="htmlResult" class="ai-markdown"></div>
              </v-card-text>
            </v-card>
          </v-card-text>
        </v-card>
      </v-container>
    </template>

    <template #bottom>
      <BottomNavi v-if="mobile" />
    </template>
  </AppLayout>
</template>

<style scoped>
:deep(.v-card-subtitle){ white-space:normal!important; overflow:visible!important; text-overflow:unset!important; }
.ai-markdown{ font-family:'Poppins',sans-serif; line-height:1.6; font-size:.95rem; }
.ai-markdown h2{ margin:.35rem 0 .45rem; font-weight:700; font-size:1.02rem; }
.ai-markdown ul, .ai-markdown ol{ margin:.25rem 0 .55rem; padding-left:1.25rem; }
.ai-markdown li{ margin:.18rem 0; }
.ai-markdown strong{ font-weight:600; }
</style>
