<!-- src/views/system/Interpret.vue -->
<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavi from '@/components/layout/navigation/SideNavi.vue'
import BottomNavi from '@/components/layout/navigation/BottomNavi.vue'
import { ref, computed, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { getCBCInterpretation as getAI } from '@/utils/API'
import { renderMarkdownSafe } from '@/utils/markdown'
import { supabase } from '@/utils/supabase'
import ResultPage from '@/components/system/interpreter/ResultPage.vue'

const { mobile } = useDisplay()
const isDrawerVisible = ref(true)

/* ------------ AI Models ------------ */
const GROQ_MODEL = 'qwen/qwen3-32b'
const OPENAI_MODEL = 'gpt-4o'

/* ------------ Prompt Header ------------ */
const HEADER = `
You are a careful hematology explainer. Write for a patient (friendly tone, plain language).
Use ONLY the provided inputs and reference ranges.

Guidelines:
- Discuss **only abnormal findings** in the breakdown.
- Avoid firm diagnoses, but you may say “suggestive of” or “may occur in conditions like dengue or other viral illnesses” if patterns fit.
- The summary should be a natural, conversational explanation of what these results mean, what may cause them, and what lifestyle habits (diet, rest, hydration, exercise, supplements) may help recovery.
- In next steps, give 5–7 concrete, supportive actions (repeat CBC, hydration, diet examples, iron/vitamin-rich foods, avoiding certain meds, when to seek medical help).

Output **Markdown** in exactly this format:
### 🧩 Detailed Interpretation Breakdown
### 🩺 Summarized Final Interpretation (simple)
### 🧭 Suggested Next Steps / Follow-up Actions
`.trim()

/* ------------ Form State ------------ */
const formRef = ref()
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const aiResult = ref('')
const htmlResult = computed(() => renderMarkdownSafe(aiResult.value))
const lastPrompt = ref('')
const lastSavedIds = ref(null)

/* Show/hide result page */
const showResult = ref(false)

/* Result meta (patient info + timestamp shown on ResultPage) */
const resultMeta = ref({
  age: '',
  sex: '',
  takenAt: '',
})

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

/* ------------ VALIDATION ------------ */
const numberRule = (v) => v === '' || v == null || !isNaN(Number(v)) || 'Numbers only'
const requiredNumberRule = (v) => (v !== '' && v != null && !isNaN(Number(v))) || 'Required number'

const hardLimitRule = (min, max, label) => (v) => {
  if (v === '' || v == null) return true
  const n = Number(v)
  if (isNaN(n)) return `${label}: must be a number`
  if (n < min || n > max) return `${label}: enter a realistic value (${min}–${max})`
  return true
}

const ratioHardRule = hardLimitRule(0, 1, 'Differential (ratio 0–1)')
const hctHardRule = hardLimitRule(0, 1, 'Hematocrit (0–1)')

const hardLimits = {
  wbc: { min: 0, max: 500 },
  rbc: { min: 0, max: 9 },
  hb: { min: 0, max: 250 },
  hct: { min: 0, max: 1 },
  mcv: { min: 40, max: 140 },
  mch: { min: 15, max: 45 },
  mchc: { min: 250, max: 420 },
  plt: { min: 0, max: 2000 },
}

/* ------------ Reference Ranges ------------ */
const ranges = {
  wbc: { low: 5.0, high: 10.0, unit: '×10⁹/L', label: 'WBC' },
  rbcM: { low: 4.5, high: 5.2, unit: '×10¹²/L', label: 'RBC' },
  rbcF: { low: 3.4, high: 5.6, unit: '×10¹²/L', label: 'RBC' },
  hbM: { low: 135, high: 175, unit: 'g/L', label: 'Hemoglobin' },
  hbF: { low: 125, high: 155, unit: 'g/L', label: 'Hemoglobin' },
  hctM: { low: 0.4, high: 0.52, unit: 'L/L', label: 'Hematocrit' },
  hctF: { low: 0.36, high: 0.48, unit: 'L/L', label: 'Hematocrit' },
  mcv: { low: 82, high: 92, unit: 'fL', label: 'MCV' },
  mch: { low: 27, high: 32, unit: 'pg', label: 'MCH' },
  mchc: { low: 320, high: 380, unit: 'g/L', label: 'MCHC' },
  plt: { low: 150, high: 400, unit: '×10⁹/L', label: 'Platelets' },
  neut: { low: 0.5, high: 0.7, unit: '', label: 'Neutrophils' },
  lymph: { low: 0.2, high: 0.4, unit: '', label: 'Lymphocytes' },
  mono: { low: 0.02, high: 0.06, unit: '', label: 'Monocytes' },
  eos: { low: 0.02, high: 0.05, unit: '', label: 'Eosinophils' },
  baso: { low: 0.0, high: 0.01, unit: '', label: 'Basophils' },
}

/* ------------ Computed hints ------------ */
const sex = computed(() => (form.value.sex === 'M' ? 'M' : 'F'))
const rbcHint = computed(() =>
  sex.value === 'M' ? 'Normal: 4.5–5.2 ×10¹²/L' : 'Normal: 3.4–5.6 ×10¹²/L',
)
const hbHint = computed(() => (sex.value === 'M' ? 'Normal: 135–175 g/L' : 'Normal: 125–155 g/L'))
const hctHint = computed(() =>
  sex.value === 'M' ? 'Normal: 0.40–0.52 L/L' : 'Normal: 0.36–0.48 L/L',
)

/* ------------ Helpers ------------ */
const parse = (v) => (v === '' || v == null ? NaN : Number(v))
const getStatus = (val, low, high) => {
  if (!isFinite(val)) return '—'
  if (val < low) return 'Low'
  if (val > high) return 'High'
  return 'Normal'
}

const clamp01 = (x) => Math.max(0, Math.min(1, x))

const normalizeRatio = (v) => {
  if (v === '' || v == null) return ''
  const n = Number(v)
  if (isNaN(n)) return v
  return n > 1 && n <= 100 ? (n / 100).toFixed(2) : n
}
const normalizeHct = (v) => {
  if (v === '' || v == null) return ''
  const n = Number(v)
  if (isNaN(n)) return v
  return n > 1.5 && n <= 100 ? (n / 100).toFixed(2) : n
}
const normalizeRBC = (v) => {
  if (v === '' || v == null) return ''
  const n = Number(v)
  if (isNaN(n)) return v
  if (n > 20 && n <= 100) return Number((n / 10).toFixed(1))
  return n
}

/* Watchers: auto-normalize common input patterns */
watch(
  () => [
    form.value.neutrophils,
    form.value.lymphocytes,
    form.value.monocytes,
    form.value.eosinophils,
    form.value.basophils,
    form.value.hct,
    form.value.rbc,
  ],
  (vals) => {
    const keys = ['neutrophils', 'lymphocytes', 'monocytes', 'eosinophils', 'basophils']
    keys.forEach((k, i) => {
      const oldVal = vals[i]
      const fixed = normalizeRatio(oldVal)
      if (fixed !== oldVal && fixed !== '') form.value[k] = fixed
    })

    const hOld = vals[5]
    const hFix = normalizeHct(hOld)
    if (hFix !== hOld && hFix !== '') form.value.hct = hFix

    const rOld = vals[6]
    const rFix = normalizeRBC(rOld)
    if (rFix !== rOld && rFix !== '') form.value.rbc = rFix
  },
)

/* ------------ Summary table ------------ */
const summaryItems = computed(() => {
  const s = sex.value
  return [
    {
      key: 'wbc',
      ...ranges.wbc,
      value: parse(form.value.wbc),
      status: getStatus(parse(form.value.wbc), ranges.wbc.low, ranges.wbc.high),
    },
    {
      key: 'rbc',
      ...(s === 'M' ? ranges.rbcM : ranges.rbcF),
      value: parse(form.value.rbc),
      status: getStatus(
        parse(form.value.rbc),
        s === 'M' ? ranges.rbcM.low : ranges.rbcF.low,
        s === 'M' ? ranges.rbcM.high : ranges.rbcF.high,
      ),
    },
    {
      key: 'hb',
      ...(s === 'M' ? ranges.hbM : ranges.hbF),
      value: parse(form.value.hb),
      status: getStatus(
        parse(form.value.hb),
        s === 'M' ? ranges.hbM.low : ranges.hbF.low,
        s === 'M' ? ranges.hbM.high : ranges.hbF.high,
      ),
    },
    {
      key: 'hct',
      ...(s === 'M' ? ranges.hctM : ranges.hctF),
      value: parse(form.value.hct),
      status: getStatus(
        parse(form.value.hct),
        s === 'M' ? ranges.hctM.low : ranges.hctF.low,
        s === 'M' ? ranges.hctM.high : ranges.hctF.high,
      ),
    },
    {
      key: 'mcv',
      ...ranges.mcv,
      value: parse(form.value.mcv),
      status: getStatus(parse(form.value.mcv), ranges.mcv.low, ranges.mcv.high),
    },
    {
      key: 'mch',
      ...ranges.mch,
      value: parse(form.value.mch),
      status: getStatus(parse(form.value.mch), ranges.mch.low, ranges.mch.high),
    },
    {
      key: 'mchc',
      ...ranges.mchc,
      value: parse(form.value.mchc),
      status: getStatus(parse(form.value.mchc), ranges.mchc.low, ranges.mchc.high),
    },
    {
      key: 'plt',
      ...ranges.plt,
      value: parse(form.value.plt),
      status: getStatus(parse(form.value.plt), ranges.plt.low, ranges.plt.high),
    },
    {
      key: 'neut',
      ...ranges.neut,
      value: parse(form.value.neutrophils),
      status: getStatus(parse(form.value.neutrophils), ranges.neut.low, ranges.neut.high),
    },
    {
      key: 'lymph',
      ...ranges.lymph,
      value: parse(form.value.lymphocytes),
      status: getStatus(parse(form.value.lymphocytes), ranges.lymph.low, ranges.lymph.high),
    },
    {
      key: 'mono',
      ...ranges.mono,
      value: parse(form.value.monocytes),
      status: getStatus(parse(form.value.monocytes), ranges.mono.low, ranges.mono.high),
    },
    {
      key: 'eos',
      ...ranges.eos,
      value: parse(form.value.eosinophils),
      status: getStatus(parse(form.value.eosinophils), ranges.eos.low, ranges.eos.high),
    },
    {
      key: 'baso',
      ...ranges.baso,
      value: parse(form.value.basophils),
      status: getStatus(parse(form.value.basophils), ranges.baso.low, ranges.baso.high),
    },
  ]
})

/* ------------ Display helpers ------------ */
const chipColor = (status) =>
  status === 'Low'
    ? 'error'
    : status === 'High'
      ? 'warning'
      : status === 'Normal'
        ? 'success'
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

  const abnormals =
    (summaryItems.value || [])
      .filter((i) => i.status && i.status !== 'Normal' && i.status !== '—')
      .map((i) => {
        const unit = i.unit ? ` ${i.unit}` : ''
        const val = isFinite(i.value) ? i.value : '—'
        return `- ${i.label}: ${val}${unit} → **${i.status}** (ref ${i.low}–${i.high}${unit})`
      })
      .join('\n') || '- None detected (if none, say so briefly).'

  return `
${HEADER}

**Inputs (use these only):**
${core}

**Abnormal-only list (drive your breakdown from here):**
${abnormals}
`.trim()
}

/* ------------ Supabase saver ------------ */
const clamp01Send = (x) => clamp01(x)
function normRatioSend(v) {
  if (v === '' || v == null) return ''
  const n = Number(v)
  if (isNaN(n)) return ''
  return clamp01Send(n > 1 ? n / 100 : n)
}
function normHctSend(v) {
  if (v === '' || v == null) return ''
  const n = Number(v)
  if (isNaN(n)) return ''
  return n > 1.5 ? Number((n / 100).toFixed(2)) : n
}

async function saveToHistory(prompt, resultMarkdown, { silent = true } = {}) {
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) throw new Error('You must be signed in to save results.')

  const payload = {
    age: form.value.age,
    sex: form.value.sex,
    wbc: form.value.wbc,
    rbc: form.value.rbc,
    hb: form.value.hb,
    hct: normHctSend(form.value.hct),
    mcv: form.value.mcv,
    mch: form.value.mch,
    mchc: form.value.mchc,
    plt: form.value.plt,

    neutrophils: form.value.neutrophils === '' ? '' : normRatioSend(form.value.neutrophils),
    lymphocytes: form.value.lymphocytes === '' ? '' : normRatioSend(form.value.lymphocytes),
    monocytes: form.value.monocytes === '' ? '' : normRatioSend(form.value.monocytes),
    eosinophils: form.value.eosinophils === '' ? '' : normRatioSend(form.value.eosinophils),
    basophils: form.value.basophils === '' ? '' : normRatioSend(form.value.basophils),

    provider: provider.value === 'openai' ? 'openai' : 'groq',
    model: provider.value === 'openai' ? OPENAI_MODEL : GROQ_MODEL,

    prompt,
    result_markdown: resultMarkdown,

    // NEW: timestamp of interpretation (ensure your DB & RPC accept this)
    taken_at: resultMeta.value.takenAt || null,

    tokens_in: '',
    tokens_out: '',
    latency_ms: '',
  }

  saving.value = true
  try {
    const { data, error } = await supabase.rpc('save_interpretation', { payload })
    if (error) throw error
    lastSavedIds.value = Array.isArray(data) ? data[0] : null
    if (silent) {
      console.debug('Saved interpretation (silent):', lastSavedIds.value)
    } else {
      successMsg.value = 'Saved to history.'
      setTimeout(() => (successMsg.value = ''), 2500)
    }
  } finally {
    saving.value = false
  }
}

/* ------------ AI callers ------------ */
async function callGroq(prompt) {
  return await getAI({ provider: 'groq', model: GROQ_MODEL, prompt })
}
async function callOpenAI(prompt) {
  return await getAI({ provider: 'openai', model: OPENAI_MODEL, prompt })
}

/* ------------ Submit ------------ */
async function onSubmit() {
  errorMsg.value = ''
  successMsg.value = ''
  aiResult.value = ''
  lastSavedIds.value = null
  showResult.value = false

  if (formRef.value?.validate) {
    const { valid } = await formRef.value.validate()
    if (!valid) {
      errorMsg.value = 'Please fix the highlighted fields.'
      return
    }
  }

  const required = ['age', 'wbc', 'rbc', 'hb', 'hct', 'mcv', 'mch', 'mchc', 'plt']
  const missing = required.filter(
    (k) => form.value[k] === '' || form.value[k] === null || form.value[k] === undefined,
  )
  if (missing.length) {
    errorMsg.value = `Missing required fields: ${missing.join(', ')}`
    return
  }

  loading.value = true
  try {
    const prompt = buildPrompt()
    lastPrompt.value = prompt

    const raw = provider.value === 'openai' ? await callOpenAI(prompt) : await callGroq(prompt)

    aiResult.value = stripThink(raw)

    // Capture meta at interpretation time (for ResultPage + history)
    resultMeta.value = {
      age: form.value.age,
      sex: sex.value,
      takenAt: new Date().toISOString(),
    }

    // Auto-save to history (silent)
    await saveToHistory(prompt, aiResult.value, { silent: true })

    // Show result view
    showResult.value = true
  } catch (e) {
    console.error(e)
    errorMsg.value = String(e?.message || e || 'Something went wrong.')
  } finally {
    loading.value = false
  }
}

/* ------------ Rule arrays ------------ */
const wbcRules = [requiredNumberRule, hardLimitRule(hardLimits.wbc.min, hardLimits.wbc.max, 'WBC')]
const rbcRules = [requiredNumberRule, hardLimitRule(hardLimits.rbc.min, hardLimits.rbc.max, 'RBC')]
const hbRules = [
  requiredNumberRule,
  hardLimitRule(hardLimits.hb.min, hardLimits.hb.max, 'Hemoglobin'),
]
const hctRules = [requiredNumberRule, hctHardRule]
const mcvRules = [requiredNumberRule, hardLimitRule(hardLimits.mcv.min, hardLimits.mcv.max, 'MCV')]
const mchRules = [requiredNumberRule, hardLimitRule(hardLimits.mch.min, hardLimits.mch.max, 'MCH')]
const mchcRules = [
  requiredNumberRule,
  hardLimitRule(hardLimits.mchc.min, hardLimits.mchc.max, 'MCHC'),
]
const pltRules = [
  requiredNumberRule,
  hardLimitRule(hardLimits.plt.min, hardLimits.plt.max, 'Platelets'),
]

const neutRules = [numberRule, ratioHardRule]
const lymphRules = [numberRule, ratioHardRule]
const monoRules = [numberRule, ratioHardRule]
const eosRules = [numberRule, ratioHardRule]
const basoRules = [numberRule, ratioHardRule]
</script>

<template>
  <AppLayout
    :is-with-app-bar-nav-icon="!mobile"
    @is-drawer-visible="isDrawerVisible = !isDrawerVisible"
  >
    <template #navigation>
      <SideNavi v-if="!mobile" :is-drawer-visible="isDrawerVisible" />
    </template>

    <template #content>
      <v-container class="py-6">
        <!-- Header card -->
        <v-card class="mb-5 header-card" variant="flat">
          <template #title>
            <span class="text-h6 font-weight-bold">
              <v-breadcrumbs :items="['CBC', showResult ? 'Result' : 'Inputs']">
                <template #prepend>
                  <v-icon
                    icon="mdi mdi-file-account-outline"
                    size="small"
                    class="me-1"
                    color="#b70d37"
                  />
                </template>
              </v-breadcrumbs>
            </span>
          </template>

          <template #subtitle>
            <p class="ms-4 text-wrap">
              <span v-if="!showResult">
                Add your details and CBC results, confirm the overview, then analyze with your
                chosen AI. 🩺
              </span>
              <span v-else>
                Below is your personalized AI interpretation — summarizing possible findings and
                next-step guidance based on your CBC. 📊
              </span>
            </p>
          </template>
        </v-card>

        <!-- FORM VIEW -->
        <v-card v-if="!showResult" class="form-card">
          <v-card-text>
            <v-form ref="formRef" @submit.prevent="onSubmit">
              <v-alert v-if="errorMsg" type="error" class="mb-4" variant="tonal">
                {{ errorMsg }}
              </v-alert>
              <v-alert v-if="successMsg" type="success" class="mb-4" variant="tonal">
                {{ successMsg }}
              </v-alert>

              <!-- Personal Info -->
              <div class="mt-4 mb-5 text-subtitle-2 d-flex align-center gap-2">
                <v-icon class="me-2" size="20">mdi-account</v-icon>
                <span>Personal Info</span>
              </div>
              <v-row class="align-center" dense>
                <!-- Age -->
                <v-col cols="12" md="4">
                  <v-text-field
                    label="Age"
                    v-model="form.age"
                    :rules="[requiredNumberRule]"
                    type="number"
                    step="1"
                    min="0"
                    max="120"
                    suffix="yr"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-cake-variant"
                  />
                </v-col>

                <!-- Sex -->
                <v-col cols="12" md="8" class="d-flex align-center">
                  <v-radio-group
                    v-model="form.sex"
                    inline
                    class="mt-0 d-flex align-center flex-wrap"
                  >
                    <v-label class="font-weight-medium d-flex align-center me-3">
                      <v-icon color="#b70d37" size="18" class="me-1">mdi-gender-male-female</v-icon>
                      Sex
                    </v-label>

                    <v-radio label="Female" value="F" />
                    <v-radio label="Male" value="M" />
                  </v-radio-group>
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <!-- CBC Core -->
              <div class="mt-4 mb-2 text-subtitle-2 d-flex align-center gap-2">
                <v-icon color="#B71C1C" size="20">mdi-water</v-icon>
                <span>CBC Core</span>
              </div>

              <v-row>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="WBC"
                    v-model="form.wbc"
                    :rules="wbcRules"
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
                    :rules="rbcRules"
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
                    :rules="hbRules"
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
                    :rules="hctRules"
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
                    :rules="pltRules"
                    type="number"
                    inputmode="decimal"
                    step="1"
                    suffix="×10⁹/L"
                    hint="Normal: 150–400"
                    persistent-hint
                  />
                </v-col>
              </v-row>

              <!-- Red Cell Indices -->
              <div class="mt-4 mb-2 text-subtitle-2 d-flex align-center gap-2">
                <v-icon color="#b70d37" size="20">mdi-flask-outline</v-icon>
                <span>Red Cell Indices</span>
              </div>

              <v-row>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="MCV"
                    v-model="form.mcv"
                    :rules="mcvRules"
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
                    :rules="mchRules"
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
                    :rules="mchcRules"
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
              <div class="mt-4 mb-2 text-subtitle-2 d-flex align-center gap-2">
                <v-icon color="#b70d37" size="20">mdi-clipboard-pulse-outline</v-icon>
                <span>Differential (enter ratios 0–1)</span>
              </div>

              <v-row>
                <v-col :cols="mobile ? 12 : 3">
                  <v-text-field
                    label="Neutrophils"
                    v-model="form.neutrophils"
                    :rules="neutRules"
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
                    :rules="lymphRules"
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
                    :rules="monoRules"
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
                    :rules="eosRules"
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
                    :rules="basoRules"
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
                    :menu-props="{ maxHeight: 240 }"
                  />
                </v-col>
              </v-row>

              <v-btn
                type="submit"
                color="primary"
                size="large"
                :loading="loading"
                :disabled="loading"
                class="mb-2"
              >
                Get Interpretation (AI)
              </v-btn>
              <v-progress-linear v-if="loading || saving" indeterminate class="mb-2" />
            </v-form>
          </v-card-text>
        </v-card>

        <!-- RESULT VIEW -->
        <v-row v-else>
          <v-col cols="12" lg="12">
            <v-card class="mb-5 result-shell-card" variant="flat">
              <v-card-text>
                <ResultPage
                  :html-result="htmlResult"
                  :raw-markdown="aiResult"
                  :provider="provider"
                  :model="provider === 'openai' ? OPENAI_MODEL : GROQ_MODEL"
                  :loading="loading || saving"
                  :patient-age="resultMeta.age"
                  :patient-sex="resultMeta.sex"
                  @back="showResult = false"
                />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </template>

    <template #bottom>
      <BottomNavi v-if="mobile" />
    </template>
  </AppLayout>
</template>

<style scoped>
:deep(.v-card-subtitle) {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: unset !important;
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

.result-shell-card {
  border: 2px solid #b70d37; /* or rgba(var(--v-theme-primary-rgb), 0.9) */
  border-radius: 24px;
  padding: 4px; /* small inset so inner red border doesn't touch edge */
}

.header-card {
  border: 2px solid #0c0a0b; /* fixed color */
  /* or adaptive: border: 2px solid rgba(var(--v-theme-primary-rgb), 0.9); */
  border-radius: 16px;
  background-color: var(--v-theme-surface);
  transition: border-color 0.3s ease;
}

/* Optional hover effect for a nice feel */
.header-card:hover {
  border-color: rgba(var(--v-theme-primary-rgb), 1);
  box-shadow: 0 0 8px rgba(var(--v-theme-primary-rgb), 0.2);
}

.form-card {
  border: 2px solid #0c0a0b; /* fixed color */
  /* or adaptive: border: 2px solid rgba(var(--v-theme-primary-rgb), 0.9); */
  border-radius: 16px;
  background-color: var(--v-theme-surface);
  transition: border-color 0.3s ease;
}
</style>
