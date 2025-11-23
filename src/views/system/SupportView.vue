<!-- src/views/system/SupportView.vue -->
<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavi from '@/components/layout/navigation/SideNavi.vue'
import BottomNavi from '@/components/layout/navigation/BottomNavi.vue'
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()
const isDrawerVisible = ref(true)

/* ===========================
   Quick Start carousel steps
   =========================== */
const steps = [
  {
    id: 1,
    title: 'Fill in your info',
    description: 'Add Age, Sex, Laboratory Name, City, Country, and Test Date.',
    img: '/images/page1.png',
  },
  {
    id: 2,
    title: 'Choose the machine',
    description: 'Select the analyzer used for your CBC (Pentra, Abbott, etc.).',
    img: '/images/page2.png',
  },
  {
    id: 3,
    title: 'Input CBC values',
    description: 'Type the values from your lab report (Hb, RBC, WBC, PLT, etc.).',
    img: '/images/page3.png',
  },
  {
    id: 4,
    title: 'Pick AI model',
    description: 'Choose which interpretation model to use (for example HemaSense AI).',
    img: '/images/page4.png',
  },
  {
    id: 5,
    title: 'Analyze & view results',
    description: 'Tap “Analyze” and see your overview, key findings, and CBC summary.',
    img: '/images/page5.png',
  },
]

const activeStep = ref(0)
const totalSteps = steps.length

const canGoPrev = computed(() => activeStep.value > 0)
const canGoNext = computed(() => activeStep.value < totalSteps - 1)

const goNext = () => {
  if (activeStep.value < totalSteps - 1) activeStep.value += 1
}

const goPrev = () => {
  if (activeStep.value > 0) activeStep.value -= 1
}

const touchOptions = {
  left: () => goNext(),
  right: () => goPrev(),
}

/* ===========================
   CBC Terms & Meanings data
   =========================== */

const search = ref('')

const cbcTerms = [
  // -------- Main CBC panel --------
  {
    id: 'wbc',
    abbrev: 'WBC',
    name: 'White Blood Cell Count',
    unit: '10/L',
    normalRange: '5.0 – 10.0',
    description:
      'Cells that help your body fight infection and inflammation.',
  },
  {
    id: 'rbc',
    abbrev: 'RBC',
    name: 'Red Blood Cell Count',
    unit: '10/L',
    normalRange: 'M: 4.5 – 5.2   F: 3.4 – 5.6',
    description:
      'Red blood cells carry oxygen from your lungs to the rest of your body.',
  },
  {
    id: 'hgb',
    abbrev: 'Hemoglobin',
    name: 'Hemoglobin',
    unit: 'g/L',
    normalRange: 'M: 135 – 175   F: 125 – 155',
    description:
      'The red blood cell protein that carries oxygen.',
  },
  {
    id: 'hct',
    abbrev: 'Hematocrit',
    name: 'Hematocrit',
    unit: '',
    normalRange: 'M: 0.40 – 0.52   F: 0.36 – 0.48',
    description:
      'The fraction of your blood that is made up of red blood cells.',
  },
  {
    id: 'mcv',
    abbrev: 'MCV',
    name: 'Mean Corpuscular Volume',
    unit: 'fL',
    normalRange: '82 – 92',
    description:
      'Average size of your red blood cells.',
  },
  {
    id: 'mch',
    abbrev: 'MCH',
    name: 'Mean Corpuscular Hemoglobin',
    unit: 'pg',
    normalRange: '27 – 32',
    description:
      'Average amount of hemoglobin in each red blood cell.',
  },
  {
    id: 'mchc',
    abbrev: 'MCHC',
    name: 'Mean Corpuscular Hemoglobin Concentration',
    unit: 'G/L',
    normalRange: '320 – 380',
    description:
      'How concentrated the hemoglobin is inside your red blood cells.',
  },
  {
    id: 'plt',
    abbrev: 'Platelet',
    name: 'Platelet Count',
    unit: '10/L',
    normalRange: '150 – 400',
    description:
      'Cell fragments that help your blood clot and stop bleeding.',
  },

  // -------- Differential count --------
  {
    id: 'neutrophils',
    abbrev: 'Neutrophils',
    name: 'Neutrophils',
    unit: '',
    normalRange: '0.50 – 0.70',
    description:
      'A type of white blood cell that is the first defender against infection.',
  },
  {
    id: 'lymphocyte',
    abbrev: 'Lymphocyte',
    name: 'Lymphocyte',
    unit: '',
    normalRange: '0.20 – 0.40',
    description:
      'White blood cells involved in immune memory, such as B and T cells.',
  },
  {
    id: 'monocytes',
    abbrev: 'Monocytes',
    name: 'Monocytes',
    unit: '',
    normalRange: '0.02 – 0.06',
    description:
      'White blood cells that help clean up damaged cells and support immune response.',
  },
  {
    id: 'eosinophils',
    abbrev: 'Eosinophils',
    name: 'Eosinophils',
    unit: '',
    normalRange: '0.02 – 0.05',
    description:
      'White blood cells linked to allergies and parasite infections.',
  },
  {
    id: 'basophils',
    abbrev: 'Basophils',
    name: 'Basophils',
    unit: '',
    normalRange: '0.00 – 0.01',
    description:
      'The least common white blood cells; involved in allergic reactions and inflammation.',
  },
]

const filteredTerms = computed(() => {
  if (!search.value.trim()) return cbcTerms
  const q = search.value.toLowerCase()
  return cbcTerms.filter((t) => {
    return (
      t.abbrev.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q)
    )
  })
})

// quick filters for chips
const quickFilters = ['Hb', 'WBC', 'Platelet', 'Neutrophils']

const setQuickFilter = (value) => {
  search.value = value
}
</script>

<template>
  <AppLayout
    :is-with-app-bar-nav-icon="!mobile"
    @is-drawer-visible="isDrawerVisible = !isDrawerVisible"
  >
    <!-- navigation slot -->
    <template #navigation>
      <SideNavi v-if="!mobile" :is-drawer-visible="isDrawerVisible" />
    </template>

    <!-- content slot -->
    <template #content>
      <v-container class="py-6">
        <!-- Page Header -->
        <v-row class="align-center mb-4">
          <v-col cols="auto" class="d-flex align-center">
            <div class="section-line bg-blue-darken-1 me-2" />
            <v-icon size="20" color="blue-darken-1" class="me-2">
              mdi-help-circle-outline
            </v-icon>
            <h2 class="text-h6 text-md-h5 font-weight-bold mb-0">Support</h2>
          </v-col>
        </v-row>

        <!-- Subtitle -->
        <p class="text-body-2 mb-6 text-grey-darken-1">
          📖 This page is your user guide. Follow the steps below to learn how to enter
          your CBC, run the AI, and read your results.
        </p>

        <!-- Quick Start carousel (no white background) -->
        <v-row justify="center">
          <v-col cols="12" sm="10" md="8" lg="6">
            <v-card class="onboarding-card" elevation="0" variant="text">
              <v-window
                v-model="activeStep"
                class="onboarding-window"
                :touch="touchOptions"
              >
                <v-window-item
                  v-for="(step, index) in steps"
                  :key="step.id"
                  :value="index"
                >
                  <div class="onboarding-content">
                    <div class="onboarding-illustration">
                      <v-img
                        :src="step.img"
                        :alt="step.title"
                        class="onboarding-image"
                        contain
                      />
                    </div>

                    <div
                      class="text-caption text-blue-darken-2 font-weight-medium mb-1"
                    >
                      Step {{ index + 1 }} of {{ totalSteps }}
                    </div>

                    <h3 class="text-subtitle-1 text-md-h6 font-weight-bold mb-2">
                      {{ step.title }}
                    </h3>

                    <p class="text-body-2 text-grey-darken-2">
                      {{ step.description }}
                    </p>
                  </div>
                </v-window-item>
              </v-window>

              <!-- Bottom controls: Previous | dots | Next -->
              <div
                class="onboarding-footer d-flex align-center justify-space-between"
              >
                <v-btn
                  variant="text"
                  size="small"
                  class="px-2 text-transform-none"
                  :disabled="!canGoPrev"
                  @click="goPrev"
                >
                  Previous
                </v-btn>

                <div class="dots">
                  <span
                    v-for="(step, index) in steps"
                    :key="step.id"
                    class="dot"
                    :class="{ 'dot--active': index === activeStep }"
                  />
                </div>

                <v-btn
                  variant="text"
                  color="blue-darken-1"
                  size="small"
                  class="px-4 text-transform-none"
                  :disabled="!canGoNext"
                  @click="goNext"
                >
                  Next
                </v-btn>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- =========================
             CBC Terms & Meanings
             ========================= -->
        <v-row class="mt-8">
          <v-col cols="12" md="8" lg="7">
            <h3 class="text-subtitle-1 text-md-h6 font-weight-bold mb-1">
              CBC Terms &amp; Meanings
            </h3>
            <p class="text-body-2 text-grey-darken-1 mb-2">
              Search a CBC term to see what it means and why it matters.
            </p>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="8" lg="7">
            <!-- 🔍 Fancy search header + field -->
            <v-card class="term-search-card mb-3" variant="flat">
              <div class="d-flex align-center mb-2">
                <v-icon size="24" color="blue-darken-2">
                  mdi-book-search-outline
                </v-icon>
                <div class="ms-2">
                  <div class="text-body-2 font-weight-medium">
                    Search CBC term
                  </div>
                  <div class="text-caption text-grey-darken-1">
                    Type a name or short code (Hb, WBC, Platelet, Neutrophils).
                  </div>
                </div>
              </div>

              <v-text-field
                v-model="search"
                density="comfortable"
                variant="outlined"
                clearable
                rounded="pill"
                class="term-search mb-2"
                hide-details
              >
                <template #prepend-inner>
                  <v-icon size="20" class="me-1">mdi-magnify</v-icon>
                </template>

                <template #append-inner>
                  <v-icon size="18" class="me-1 text-grey-darken-1">
                    mdi-flask-outline
                  </v-icon>
                </template>
              </v-text-field>

              <!-- Helper line: result count or hint -->
              <p class="text-caption text-grey-darken-1 mb-1">
                <span v-if="search">
                  Showing {{ filteredTerms.length }}
                  result<span v-if="filteredTerms.length !== 1">s</span>
                  for “{{ search }}”
                </span>
                <span v-else>
                  Tip: tap a quick term below or scroll the list.
                </span>
              </p>

              <!-- Quick filter chips -->
              <div class="mb-1">
                <v-chip
                  v-for="term in quickFilters"
                  :key="term"
                  size="small"
                  class="me-2 mb-1 text-blue-darken-2"
                  color="blue-lighten-5"
                  label
                  @click="setQuickFilter(term)"
                >
                  {{ term }}
                </v-chip>
              </div>
            </v-card>

            <!-- Terms list -->
            <v-expansion-panels>
              <template v-if="filteredTerms.length">
                <v-expansion-panel
                  v-for="term in filteredTerms"
                  :key="term.id"
                  class="term-panel"
                >
                  <v-expansion-panel-title>
                    <div
                      class="d-flex justify-space-between align-center w-100"
                    >
                      <div class="d-flex flex-column">
                        <span class="font-weight-bold">
                          {{ term.abbrev }}
                        </span>
                        <span class="text-caption text-grey-darken-1">
                          {{ term.name }}
                        </span>
                      </div>
                      <div class="text-right">
                        <span class="text-caption text-grey-darken-1">
                          {{ term.unit }}
                        </span>
                      </div>
                    </div>
                  </v-expansion-panel-title>

                  <v-expansion-panel-text>
                    <p class="text-body-2 mb-1">
                      {{ term.description }}
                    </p>
                    <p
                      v-if="term.normalRange"
                      class="text-caption text-grey-darken-1"
                    >
                      Typical adult range:
                      <strong>{{ term.normalRange }}</strong>
                    </p>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </template>

              <!-- Empty state -->
              <template v-else>
                <div class="term-empty">
                  <v-icon size="24" class="mb-1">mdi-text-search</v-icon>
                  <p class="text-body-2 mb-0">
                    No CBC term found for “{{ search }}”.
                  </p>
                  <p class="text-caption text-grey-darken-1">
                    Try a shorter word like <strong>WBC</strong> or
                    <strong>Hemoglobin</strong>.
                  </p>
                </div>
              </template>
            </v-expansion-panels>
          </v-col>
        </v-row>

        <!-- =========================
             Reminder / Disclaimer
             ========================= -->
        <v-row class="mt-8">
          <v-col cols="12" md="8" lg="7">
            <h3 class="text-subtitle-1 text-md-h6 font-weight-bold mb-2">
              Reminder about medical use
            </h3>

            <v-alert
              type="warning"
              variant="outlined"
              density="comfortable"
              border="start"
              class="disclaimer-alert"
            >
              <div class="text-body-2 mb-1">
                ⚠️ HemaSense only gives an <strong>AI-assisted interpretation</strong>
                of your CBC result.
              </div>
              <div class="text-body-2">
                It does <strong>not</strong> replace a doctor or medical technologist.
                Always discuss your CBC and any symptoms with a licensed health
                professional before making decisions about your health.
              </div>
            </v-alert>
          </v-col>
        </v-row>
      </v-container>
    </template>

    <!-- bottom slot (mobile only) -->
    <template #bottom>
      <BottomNavi v-if="mobile" />
    </template>
  </AppLayout>
</template>

<style scoped>
.section-line {
  width: 50px;
  height: 2px;
  border-radius: 999px;
}

/* Quick start carousel */
.onboarding-card {
  background-color: transparent;
  box-shadow: none;
  border: none;
  padding: 0;
}

.onboarding-window {
  min-height: 280px;
}

.onboarding-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-top: 4px;
}

.onboarding-illustration {
  width: 100%;
  max-width: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.onboarding-image {
  width: 100%;
  height: auto;
  border-radius: 0;
}

.onboarding-footer {
  margin-top: 8px;
}

/* dots */
.dots {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #cbd5e1;
  transition: all 0.2s ease;
}

.dot--active {
  width: 16px;
  background: #1e88e5;
}

/* ===== CBC Terms UI tweaks ===== */

/* Search card wrapper */
.term-search-card {
  border-radius: 20px;
  padding: 12px 14px 10px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  backdrop-filter: blur(6px);
}

/* Search field styling */
.term-search {
  transition: box-shadow 0.2s ease, transform 0.15s ease;
}

/* transparent background in light & dark */
.term-search :deep(.v-field) {
  border-radius: 999px;
  background-color: transparent !important;
}

.term-search :deep(.v-field__overlay) {
  background-color: transparent !important;
  opacity: 1;
}

.term-search :deep(.v-field--focused) {
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.5);
}

/* Each term behaves like a soft card */
.term-panel {
  border-radius: 16px;
  margin-bottom: 8px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.5);
  transition: transform 0.15s ease, box-shadow 0.15s ease,
    border-color 0.15s ease, background-color 0.15s ease;
}

.term-panel:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15);
  border-color: rgba(59, 130, 246, 0.7);
}

/* tighten panel padding slightly */
.term-panel :deep(.v-expansion-panel-title) {
  padding-top: 10px;
  padding-bottom: 10px;
}

/* Empty state */
.term-empty {
  padding: 16px;
  text-align: center;
  border-radius: 16px;
  border: 1px dashed rgba(148, 163, 184, 0.6);
  margin-top: 4px;
}

/* Disclaimer alert */
.disclaimer-alert {
  border-radius: 16px;
}
</style>
