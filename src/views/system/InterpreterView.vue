<!-- src/views/system/Interpret.vue -->
<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavi from '@/components/layout/AppLayout.vue'
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
const showResult = ref(false)

/* Wizard */
const totalSteps = 3
const currentStep = ref(1)

/* Result meta for ResultPage */
const resultMeta = ref({
  age: '',
  sex: '',
  takenAt: '',
  labName: '',
  labCity: '',
  labCountry: '',
})

/* Base form */
const form = ref({
  age: '',
  sex: 'F',

  labName: '',
  labCity: '',
  labCountry: 'Philippines',
  testDate: '',

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

/* ------------ Generic rules ------------ */
const requiredText = (v) => !!(v && String(v).trim()) || 'Required'

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

/* helper to run same rules programmatically */
const runRules = (value, rules = []) => {
  for (const r of rules) {
    if (!r) continue
    const res = r(value)
    if (res !== true) return false
  }
  return true
}

/* ------------ Step 1 gate (includes lab + city + date) ------------ */
const canProceedFromStep1 = computed(() => {
  const ageNum = Number(form.value.age)
  const hasAge = form.value.age !== '' && !isNaN(ageNum) && ageNum >= 0 && ageNum <= 120
  const hasSex = !!form.value.sex
  const hasLabName = !!form.value.labName?.trim()
  const hasCity = !!form.value.labCity?.trim()
  const hasTestDate = !!form.value.testDate

  return hasAge && hasSex && hasLabName && hasCity && hasTestDate
})

const goFromStep1 = () => {
  errorMsg.value = ''
  if (!canProceedFromStep1.value) {
    errorMsg.value =
      'Please complete age, sex, laboratory name, city, and test date before proceeding.'
    return
  }
  currentStep.value = 2
}

/* ------------ Step 2 gate (CBC; block red errors) ------------ */
const goFromStep2 = () => {
  errorMsg.value = ''

  const requiredCBC = [
    ['wbc', wbcRules],
    ['rbc', rbcRules],
    ['hb', hbRules],
    ['hct', hctRules],
    ['mcv', mcvRules],
    ['mch', mchRules],
    ['mchc', mchcRules],
    ['plt', pltRules],
  ]

  const invalid = requiredCBC.filter(
    ([key, rules]) =>
      form.value[key] === '' || form.value[key] == null || !runRules(form.value[key], rules),
  )

  if (invalid.length) {
    errorMsg.value =
      'Please complete all CBC core fields with realistic values. Fields in red must be corrected before proceeding.'
    return
  }

  currentStep.value = 3
}

const prevStep = () => {
  if (currentStep.value > 1) currentStep.value -= 1
}

/* ------------ Reference ranges & hints ------------ */
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

const sex = computed(() => (form.value.sex === 'M' ? 'M' : 'F'))
const rbcHint = computed(() =>
  sex.value === 'M' ? 'Normal: 4.5–5.2 ×10¹²/L' : 'Normal: 3.4–5.6 ×10¹²/L',
)
const hbHint = computed(() => (sex.value === 'M' ? 'Normal: 135–175 g/L' : 'Normal: 125–155 g/L'))
const hctHint = computed(() =>
  sex.value === 'M' ? 'Normal: 0.40–0.52 L/L' : 'Normal: 0.36–0.48 L/L',
)

/* ------------ Normalizers & watchers ------------ */
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

/* Auto-normalize common patterns */
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
    const diffKeys = ['neutrophils', 'lymphocytes', 'monocytes', 'eosinophils', 'basophils']
    diffKeys.forEach((k, i) => {
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

/* ------------ Summary table for ResultPage ------------ */
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
    `Laboratory: ${form.value.labName || 'N/A'}`,
    `Location: ${[form.value.labCity, form.value.labCountry].filter(Boolean).join(', ') || 'N/A'}`,
    `Test date: ${form.value.testDate || 'N/A'}`,
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

/* ------------ Supabase saver helpers ------------ */
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

/* Save inputs + interpretation into cbc.tests + cbc.interpretations */
async function saveInterpretationRPC(prompt, resultMarkdown) {
  const { data: authData } = await supabase.auth.getUser()

  if (!authData?.user) {
    lastSavedIds.value = null
    return
  }

  const payload = {
    age: Number(form.value.age),
    sex: form.value.sex,

    lab_name: form.value.labName?.trim() || null,
    lab_city: form.value.labCity?.trim() || null,
    lab_country: form.value.labCountry?.trim() || null,
    test_date: form.value.testDate || null,

    wbc: Number(form.value.wbc),
    rbc: Number(form.value.rbc),
    hb: Number(form.value.hb),
    hct: normHctSend(form.value.hct),
    mcv: Number(form.value.mcv),
    mch: Number(form.value.mch),
    mchc: Number(form.value.mchc),
    plt: Number(form.value.plt),

    neutrophils: form.value.neutrophils === '' ? '' : normRatioSend(form.value.neutrophils),
    lymphocytes: form.value.lymphocytes === '' ? '' : normRatioSend(form.value.lymphocytes),
    monocytes: form.value.monocytes === '' ? '' : normRatioSend(form.value.monocytes),
    eosinophils: form.value.eosinophils === '' ? '' : normRatioSend(form.value.eosinophils),
    basophils: form.value.basophils === '' ? '' : normRatioSend(form.value.basophils),

    provider: provider.value === 'openai' ? 'openai' : 'groq',
    model: provider.value === 'openai' ? OPENAI_MODEL : GROQ_MODEL,

    prompt,
    result_markdown: resultMarkdown,
    tokens_in: '',
    tokens_out: '',
    latency_ms: '',
  }

  saving.value = true
  try {
    const { data, error } = await supabase.rpc('save_interpretation', { payload })
    if (error) {
      console.error('save_interpretation error:', error)
      lastSavedIds.value = null
      return
    }

    if (Array.isArray(data) && data.length > 0) {
      lastSavedIds.value = {
        test_id: data[0].test_id,
        interpretation_id: data[0].interpretation_id,
      }
    } else {
      lastSavedIds.value = null
    }
  } finally {
    saving.value = false
  }
}

/* Save bookmark into cbc.saved_history */
async function handleSaveHistory() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!lastSavedIds.value?.test_id || !lastSavedIds.value?.interpretation_id) {
    errorMsg.value = 'No interpretation to save. Please run an analysis first.'
    return
  }

  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) {
    errorMsg.value = 'You must be signed in to save to history.'
    return
  }

  saving.value = true
  try {
    const { error } = await supabase.rpc('save_cbc_history', {
      p_test_id: lastSavedIds.value.test_id,
      p_interpretation_id: lastSavedIds.value.interpretation_id,
    })

    if (error) {
      console.error(error)
      throw error
    }

    successMsg.value = 'Saved to History.'
  } catch (e) {
    console.error(e)
    errorMsg.value = 'Could not save to history. Please try again.'
  } finally {
    saving.value = false
    setTimeout(() => {
      successMsg.value = ''
      errorMsg.value = ''
    }, 2500)
  }
}

/* ------------ AI callers ------------ */
async function callGroq(prompt) {
  return await getAI({ provider: 'groq', model: GROQ_MODEL, prompt })
}
async function callOpenAI(prompt) {
  return await getAI({ provider: 'openai', model: OPENAI_MODEL, prompt })
}

/* ------------ Central validation before submit ------------ */
const validateAllBeforeSubmit = () => {
  // Step 1
  if (!canProceedFromStep1.value) {
    errorMsg.value = 'Please complete your personal and laboratory details before analyzing.'
    currentStep.value = 1
    return false
  }

  // Step 2: CBC core
  const requiredCBC = [
    ['wbc', wbcRules],
    ['rbc', rbcRules],
    ['hb', hbRules],
    ['hct', hctRules],
    ['mcv', mcvRules],
    ['mch', mchRules],
    ['mchc', mchcRules],
    ['plt', pltRules],
  ]

  for (const [key, rules] of requiredCBC) {
    if (form.value[key] === '' || form.value[key] == null || !runRules(form.value[key], rules)) {
      errorMsg.value =
        'Please review your CBC values. Fields highlighted in red or out of realistic range must be corrected.'
      currentStep.value = 2
      return false
    }
  }

  return true
}

/* ------------ Submit ------------ */
async function onSubmit() {
  errorMsg.value = ''
  successMsg.value = ''
  aiResult.value = ''
  lastSavedIds.value = null
  showResult.value = false

  if (!validateAllBeforeSubmit()) {
    return
  }

  loading.value = true
  try {
    const prompt = buildPrompt()
    lastPrompt.value = prompt

    const raw = provider.value === 'openai' ? await callOpenAI(prompt) : await callGroq(prompt)

    aiResult.value = stripThink(raw)

    resultMeta.value = {
      age: form.value.age,
      sex: sex.value,
      takenAt: form.value.testDate || new Date().toISOString(),
      labName: form.value.labName || '',
      labCity: form.value.labCity || '',
      labCountry: form.value.labCountry || '',
    }

    await saveInterpretationRPC(prompt, aiResult.value)
    showResult.value = true
  } catch (e) {
    console.error(e)
    errorMsg.value = String(e?.message || e || 'Something went wrong.')
  } finally {
    loading.value = false
  }
}
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
                Guided steps: enter your details, add CBC values, choose your AI, then analyze your
                report. 🩺
              </span>
              <span v-else>
                Below is your personalized AI interpretation — summarizing possible findings and
                next-step guidance based on your CBC. 📊
              </span>
            </p>
          </template>
        </v-card>

        <!-- FORM WIZARD VIEW -->
        <v-card v-if="!showResult" class="form-card">
          <v-card-text>
            <!-- Wizard title + stepper -->
            <div class="wizard-header mt-3">
              <div class="wizard-title mb-4">
                <v-icon size="18" class="me-2" color="#B71C1C">mdi-water-opacity</v-icon>
                Blood Test Analysis
              </div>
            </div>

            <!-- UPDATED WIZARD STEPS -->
            <div class="wizard-steps">
              <!-- grey base line + red progress -->
              <div class="wizard-bar">
                <div
                  class="wizard-bar-fill"
                  :style="{ width: ((currentStep - 1) / (totalSteps - 1)) * 100 + '%' }"
                />
              </div>

              <!-- dots -->
              <div class="wizard-dots">
                <div
                  v-for="step in totalSteps"
                  :key="step"
                  class="wizard-dot"
                  :class="{
                    'is-active': step === currentStep,
                    'is-complete': step < currentStep,
                  }"
                >
                  <span v-if="step < currentStep">✓</span>
                  <span v-else>{{ step }}</span>
                </div>
              </div>
            </div>

            <v-form ref="formRef" @submit.prevent="onSubmit">
              <!-- STEP 1: Personal & Lab Info -->
              <div v-if="currentStep === 1">
                <div class="step-title">Your Personal Information</div>
                <p class="step-subtitle">
                  Please enter your details so we can personalize your CBC interpretation report.
                </p>

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
                      class="mb-4 d-flex align-center flex-wrap"
                    >
                      <v-label class="font-weight-medium d-flex align-center me-3">
                        <v-icon size="18" class="me-" color="#0D47A1"
                          >mdi-gender-male-female</v-icon
                        >
                        Sex
                      </v-label>
                      <v-radio label="Female" value="F" />
                      <v-radio label="Male" value="M" />
                    </v-radio-group>
                  </v-col>

                  <!-- Laboratory Name -->
                  <v-col cols="12">
                    <v-text-field
                      label="Laboratory Name"
                      v-model="form.labName"
                      :rules="[requiredText]"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-hospital-building"
                      hint="e.g., City Diagnostics Laboratory"
                      persistent-hint
                    />
                  </v-col>

                  <!-- City -->
                  <v-col cols="12" md="4">
                    <v-text-field
                      label="City"
                      v-model="form.labCity"
                      :rules="[requiredText]"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-city"
                    />
                  </v-col>

                  <!-- Country (readonly Philippines) -->
                  <v-col cols="12" md="4">
                    <v-text-field
                      label="Country"
                      v-model="form.labCountry"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-earth"
                      readonly
                    />
                  </v-col>

                  <!-- Test Date -->
                  <v-col cols="12" md="4">
                    <v-text-field
                      label="Test Date"
                      v-model="form.testDate"
                      :rules="[requiredText]"
                      type="date"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-calendar"
                    />
                  </v-col>
                </v-row>

                <div class="step-actions mt-6 d-flex justify-end">
                  <v-btn
                    color="#0D47A1"
                    class="wizard-next-btn"
                    :disabled="!canProceedFromStep1"
                    @click="goFromStep1"
                  >
                    Next
                    <v-icon end>mdi-arrow-right</v-icon>
                  </v-btn>
                </div>
              </div>

              <!-- STEP 2: CBC Values -->
              <div v-else-if="currentStep === 2">
                <div class="step-title">Enter Your CBC Results</div>
                <p class="step-subtitle">
                  Fill in your CBC values. These will be used to generate your AI-assisted
                  interpretation.
                </p>

                <!-- CBC Core -->
                <div class="mt-4 mb-2 text-subtitle d-flex align-center gap-2">
                  <v-icon size="20" color="#B71C1C">mdi-water</v-icon>
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
                      variant="outlined"
                      density="comfortable"
                      class="cbc-input"
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
                      variant="outlined"
                      density="comfortable"
                      class="cbc-input"
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
                      variant="outlined"
                      density="comfortable"
                      class="cbc-input"
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
                      variant="outlined"
                      density="comfortable"
                      class="cbc-input"
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
                      variant="outlined"
                      density="comfortable"
                      class="cbc-input"
                    />
                  </v-col>
                </v-row>

                <!-- Red Cell Indices -->
                <div class="mt-4 mb-2 text-subtitle d-flex align-center gap-2">
                  <v-icon size="20" color="#B71C1C">mdi-flask-outline</v-icon>
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
                      variant="outlined"
                      density="comfortable"
                      class="cbc-input"
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
                      variant="outlined"
                      density="comfortable"
                      class="cbc-input"
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
                      variant="outlined"
                      density="comfortable"
                      class="cbc-input"
                    />
                  </v-col>
                </v-row>

                <!-- Differential -->
                <div class="mt-4 mb-2 text-subtitle d-flex align-center gap-2">
                  <v-icon size="20" color="#B71C1C">mdi-clipboard-pulse-outline</v-icon>
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
                      variant="outlined"
                      density="comfortable"
                      class="cbc-input"
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
                      variant="outlined"
                      density="comfortable"
                      class="cbc-input"
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
                      variant="outlined"
                      density="comfortable"
                      class="cbc-input"
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
                      variant="outlined"
                      density="comfortable"
                      class="cbc-input"
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
                      variant="outlined"
                      density="comfortable"
                      class="cbc-input"
                    />
                  </v-col>
                </v-row>

                <v-alert
                  v-if="currentStep === 2 && errorMsg"
                  type="error"
                  variant="tonal"
                  class="mt-2 mb-0"
                >
                  {{ errorMsg }}
                </v-alert>

                <div class="step-actions mt-6 d-flex justify-space-between">
                  <v-btn variant="outlined" class="wizard-prev-btn" @click="prevStep">
                    <v-icon start>mdi-arrow-left</v-icon>
                    Previous
                  </v-btn>
                  <v-btn color="#0D47A1" class="wizard-next-btn" @click="goFromStep2">
                    Next
                    <v-icon end>mdi-arrow-right</v-icon>
                  </v-btn>
                </div>
              </div>

              <!-- STEP 3: AI Provider Preference + Submit -->
              <div v-else-if="currentStep === 3">
                <div class="step-title">Choose Your AI Interpreter</div>
                <p class="step-subtitle">
                  Select which AI model will interpret your CBC report. Both use the same inputs you
                  provided.
                </p>

                <v-row class="mb-2" align="center">
                  <v-col cols="12">
                    <v-select
                      v-model="provider"
                      :items="providerItems"
                      label="AI Provider"
                      variant="outlined"
                      density="comfortable"
                      rounded
                      hide-details
                      :menu-props="{ maxHeight: 240 }"
                      prepend-inner-icon="mdi-robot-outline"
                    />
                  </v-col>
                </v-row>

                <v-alert type="info" variant="tonal" class="mt-4">
                  <strong>Terms &amp; Privacy:</strong>
                  By clicking
                  <em>Analyze Blood Test</em>, you agree that this AI-generated explanation is for
                  educational support and does not replace consultation with a licensed physician.
                </v-alert>

                <div class="step-actions mt-6 d-flex justify-space-between align-center ga-2">
                  <v-btn variant="outlined" class="wizard-prev-btn" @click="prevStep">
                    <v-icon start>mdi-arrow-left</v-icon>
                    Previous
                  </v-btn>

                  <v-btn
                    type="submit"
                    color="success"
                    class="wizard-analyze-btn"
                    :loading="loading"
                    :disabled="loading"
                    prepend-icon="mdi-flash"
                  >
                    Analyze Blood Test
                  </v-btn>
                </div>

                <v-progress-linear v-if="loading || saving" indeterminate class="mt-2" />
              </div>
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
                  :loading="loading"
                  :saving="saving"
                  :can-save="!!lastSavedIds"
                  :patient-age="resultMeta.age"
                  :patient-sex="resultMeta.sex"
                  :lab-name="resultMeta.labName"
                  :lab-city="resultMeta.labCity"
                  :lab-country="resultMeta.labCountry"
                  :test-date="resultMeta.takenAt"
                  :save-success="successMsg"
                  :save-error="errorMsg"
                  :summary-items="summaryItems"
                  :chip-color-fn="chipColor"
                  :fmt-val-fn="fmtVal"
                  @back="showResult = false"
                  @save="handleSaveHistory"
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

/* Wizard header */
.wizard-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 8px;
}
.wizard-title {
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
}

/* Steps bar + dots (with connecting line) */
.wizard-steps {
  position: relative;
  margin: 24px 8px 24px;
}

/* base grey line */
.wizard-bar {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 3px;
  transform: translateY(-50%);
  border-radius: 999px;
  background-color: #e5e7eb;
  overflow: hidden;
}

/* red progress line */
.wizard-bar-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 999px;
  background-color: #22c55e;
  transition: width 0.25s ease;
}

/* dots aligned on the line */
.wizard-dots {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* default dot */
.wizard-dot {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  background-color: #e5e7eb;
  color: #6b7280;
  transition: all 0.2s ease;
}

/* current step (red) */
.wizard-dot.is-active {
  background-color: #b71c1c;
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(183, 28, 28, 0.35);
}

/* completed steps (green) */
.wizard-dot.is-complete {
  background-color: #22c55e;
  color: #ffffff;
}

/* Step titles */
.step-title {
  font-weight: 600;
  font-size: 1.02rem;
  margin-bottom: 4px;
}
.step-subtitle {
  font-size: 0.86rem;
  color: #6b7280;
  margin-bottom: 16px;
}

/* Buttons */
.step-actions .wizard-prev-btn {
  border-radius: 999px;
  text-transform: none;
}
.step-actions .wizard-next-btn {
  border-radius: 999px;
  text-transform: none;
  color: #ffffff;
}
.step-actions .wizard-analyze-btn {
  border-radius: 999px;
  text-transform: none;
}

/* AI markdown */
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
  border: 2px solid #0d47a1;
  border-radius: 24px;
  padding: 4px;
}

.header-card {
  border: 2px solid #0d47a1;
  border-radius: 16px;
  background-color: var(--v-theme-surface);
  transition: border-color 0.3s ease;
}
.header-card:hover {
  border-color: rgba(var(--v-theme-primary-rgb), 1);
  box-shadow: 0 0 8px rgba(var(--v-theme-primary-rgb), 0.2);
}

.form-card {
  border: 2px solid #0d47a1;
  border-radius: 16px;
  background-color: var(--v-theme-surface);
  transition: border-color 0.3s ease;
}

/* CBC inputs */
.cbc-input :deep(.v-field) {
  border-radius: 8px;
}

/* Icons color */
:deep(.form-card .v-input .v-field__prepend-inner .v-icon),
:deep(.form-card .v-input .v-field__append-inner .v-icon),
:deep(.form-card .step-title .v-icon),
:deep(.form-card .text-subtitle-2 .v-icon) {
  color: #0d47a1 !important;
}
</style>
