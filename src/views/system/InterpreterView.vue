<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavi from '@/components/layout/navigation/SideNavi.vue'
import { ref, computed, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useRouter } from 'vue-router'

const router = useRouter()
const { mobile } = useDisplay()
const isDrawerVisible = ref(true)

/* -------------------------------------------
   PREFLIGHT (Dialog) STATE
-------------------------------------------- */
const preflightOpen = ref(true) // show dialog on load
const preStep = ref(1) // 1..4
const formReady = ref(false) // becomes true after Finish
const aborted = ref(false) // user opted to leave via Home

// Step 1: Consent
const consent = ref({
  acknowledgePurpose: false,
  agreeProcessing: false,
  noEmergency: false,
})

// Step 2: Profile + Context
const profileCtx = ref({
  age: null, // user age (no "years" label)
  sexAtBirth: null, // collected but NOT displayed in review
  takenDate: null, // ISO date (CBC taken)
  symptoms: [],
  symptomsOther: '',
})

// Step 3: Reference Model (locked to Pentra)
const referenceModel = ref({
  usePentraButuan: true,
  useGeneralRanges: false,
  units: 'SI',
  machineName: 'Pentra (Butuan)',
})

const SYMPTOMS = [
  'Anemia',
  'Leukocytosis',
  'Leukopenia',
  'Neutrophilia',
  'Neutropenia',
  'Lymphocytosis',
  'Lymphopenia',
  'Thrombocytosis',
  'Thrombocytopenia',
  'Infection (suspected/ongoing)',
  'Inflammation',
  'Bleeding tendency',
  'Allergic reaction',
  'Other (specify)',
]

// Validation per step
const stepValid = computed(() => {
  switch (preStep.value) {
    case 1:
      return (
        consent.value.acknowledgePurpose &&
        consent.value.agreeProcessing &&
        consent.value.noEmergency
      )
    case 2:
      return (
        Number.isFinite(profileCtx.value.age) &&
        profileCtx.value.age >= 0 &&
        !!profileCtx.value.sexAtBirth &&
        !!profileCtx.value.takenDate
      )
    case 3:
      return referenceModel.value.usePentraButuan || referenceModel.value.useGeneralRanges
    case 4:
      return true
    default:
      return false
  }
})

function nextStep() {
  if (!stepValid.value) return
  if (preStep.value < 4) preStep.value += 1
  else finishPreflight()
}
function prevStep() {
  if (preStep.value > 1) preStep.value -= 1
}

function finishPreflight() {
  preflightOpen.value = false
  formReady.value = true
}

function goHome() {
  aborted.value = true
  preflightOpen.value = false
  router.push('/') // adjust if your home route differs
}

// Reset dialog if user reopens (optional)
watch(preflightOpen, (open) => {
  if (open === true && formReady.value === false) {
    preStep.value = 1
  }
})

/* CBC parameters (internal; not shown here) */
const CBC_RBC_PARAMS = ['RBC', 'HGB', 'HCT', 'MCV', 'MCH', 'MCHC']
const CBC_WBC_PARAMS = ['WBC']
const CBC_DIFF_PARAMS = ['NEUT', 'LYMPH', 'MONO', 'EO', 'BASO']
const CBC_PLT_PARAMS = ['PLT']
const CBC_PANEL_DEF = {
  type: 'cbc_diff',
  params: [...CBC_RBC_PARAMS, ...CBC_WBC_PARAMS, ...CBC_DIFF_PARAMS, ...CBC_PLT_PARAMS],
}
</script>

<template>
  <AppLayout
    :is-with-app-bar-nav-icon="true"
    @is-drawer-visible="isDrawerVisible = !isDrawerVisible"
  >
    <template #navigation>
      <SideNavi :is-drawer-visible="isDrawerVisible" />
    </template>

    <template #content>
      <!-- ===== Pre-Intake Dialog (fullscreen on mobile) ===== -->
      <v-dialog v-model="preflightOpen" :fullscreen="mobile" :persistent="false" :max-width="720">
        <v-card>
          <v-toolbar density="comfortable" color="primary" dark>
            <!-- Home icon (leave) -->
            <v-btn icon variant="text" @click="goHome" :aria-label="'Home'">
              <v-icon>mdi-home</v-icon>
            </v-btn>
            <v-toolbar-title>
              {{ preStep <= 3 ? 'Before You Input Your CBC' : 'Review & Confirm' }}
            </v-toolbar-title>
            <v-spacer />
            <div class="text-caption">Step {{ preStep }} / 4</div>
          </v-toolbar>

          <v-card-text class="pa-4">
            <!-- STEP 1: Consent -->
            <div v-if="preStep === 1" class="d-flex flex-column ga-4">
              <div class="text-h6">Safety, Privacy, and Scope</div>
              <div class="text-body-2">
                This tool helps you <strong>understand</strong> your CBC. It does not provide a
                medical diagnosis.
              </div>
              <v-checkbox
                v-model="consent.acknowledgePurpose"
                label="I understand this is an educational guide and not a medical diagnosis."
              />
              <v-checkbox
                v-model="consent.agreeProcessing"
                label="I agree to data processing per the Data Privacy Act of 2012."
              />
              <v-checkbox
                v-model="consent.noEmergency"
                label="I am not using this for an emergency."
              />
            </div>

            <!-- STEP 2: Profile + Context -->
            <div v-else-if="preStep === 2" class="d-flex flex-column ga-4">
              <div class="text-h6">Profile & Context</div>

              <!-- Age (no 'years' in label) -->
              <v-text-field
                v-model.number="profileCtx.age"
                label="Age"
                type="number"
                min="0"
                :rules="[(v) => (v !== null && v !== '' && v >= 0) || 'Enter a valid age']"
                hint="Enter your current age"
                persistent-hint
              />

              <!-- Changed label -->
              <v-radio-group v-model="profileCtx.sexAtBirth" label="Sex">
                <v-radio label="Female" value="female" />
                <v-radio label="Male" value="male" />
              </v-radio-group>

              <v-text-field
                v-model="profileCtx.takenDate"
                type="date"
                label="Date the CBC was taken"
              />

              <v-select
                v-model="profileCtx.symptoms"
                :items="SYMPTOMS"
                label="Doctor-confirmed findings you remember"
                hint="Select only what your doctor told you"
                chips
                multiple
                clearable
                persistent-hint
              />

              <v-text-field
                v-if="profileCtx.symptoms?.includes('Other (specify)')"
                v-model="profileCtx.symptomsOther"
                label="Other (please specify)"
                placeholder="(optional) Type what the doctor said"
                clearable
              />
            </div>

            <!-- STEP 3: Reference Model (locked Pentra) -->
            <div v-else-if="preStep === 3" class="d-flex flex-column ga-4">
              <div class="text-h6">Reference Model</div>
              <v-alert type="info" variant="tonal">
                We adhere to the <strong>{{ referenceModel.machineName }}</strong> used here in
                Butuan. Units: <strong>{{ referenceModel.units }}</strong
                >.
              </v-alert>
              <v-switch
                v-model="referenceModel.usePentraButuan"
                :readonly="true"
                color="primary"
                label="Pentra (Butuan) reference (locked)"
                inset
              />
              <v-switch
                v-model="referenceModel.useGeneralRanges"
                color="secondary"
                inset
                label="(Optional) Allow general reference ranges"
                hint="Keep off to strictly follow the Pentra machine."
                persistent-hint
              />
            </div>

            <!-- STEP 4: Review -->
            <div v-else class="d-flex flex-column ga-4">
              <div class="text-h6">Review</div>
              <v-list density="compact" lines="one">
                <v-list-subheader>Consent</v-list-subheader>
                <v-list-item
                  title="Educational use acknowledged"
                  :subtitle="consent.acknowledgePurpose ? 'Yes' : 'No'"
                />
                <v-list-item
                  title="Data-use agreement"
                  :subtitle="consent.agreeProcessing ? 'Accepted' : 'Not accepted'"
                />
                <v-list-item
                  title="Not for emergencies"
                  :subtitle="consent.noEmergency ? 'Yes' : 'No'"
                />

                <v-divider class="my-2" />

                <v-list-subheader>Profile & Context</v-list-subheader>
                <v-list-item title="Age" :subtitle="String(profileCtx.age ?? '—')" />
                <!-- Sex at birth intentionally NOT shown in results per request -->
                <v-list-item title="CBC date" :subtitle="profileCtx.takenDate || '—'" />
                <v-list-item
                  title="Doctor-confirmed findings"
                  :subtitle="
                    profileCtx.symptoms?.filter((s) => s !== 'Other (specify)').join(', ') || 'None'
                  "
                />
                <v-list-item
                  title="Others"
                  :subtitle="
                    profileCtx.symptoms?.includes('Other (specify)')
                      ? profileCtx.symptomsOther || ''
                      : ''
                  "
                />
                <v-divider class="my-2" />

                <v-list-subheader>Reference Model</v-list-subheader>
                <v-list-item title="Machine" :subtitle="referenceModel.machineName" />
                <v-list-item title="Units" :subtitle="referenceModel.units" />
                <v-list-item
                  title="General ranges allowed"
                  :subtitle="referenceModel.useGeneralRanges ? 'Yes' : 'No (strict Pentra)'"
                />
              </v-list>
            </div>
          </v-card-text>

          <v-divider />

          <v-card-actions class="pa-3">
            <!-- Cancel removed; keep Home icon above -->
            <v-spacer />
            <v-btn variant="text" @click="prevStep" :disabled="preStep === 1">Back</v-btn>
            <v-btn color="primary" :disabled="!stepValid" @click="nextStep">
              {{ preStep < 4 ? 'Continue' : 'Finish & Start Input' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- ===== Page content below ===== -->
      <div class="pa-4">
        <v-alert
          v-if="!formReady && !aborted"
          type="warning"
          variant="tonal"
          title="Complete pre-intake"
          text="Please complete the short pre-intake to start entering CBC values."
        />
        <v-alert
          v-else-if="aborted && !formReady"
          type="info"
          variant="tonal"
          title="You left the intake"
          text="You can start again anytime."
        />
        <div v-else class="d-flex flex-column ga-4">
          <div class="text-h6">CBC Manual Input (Pentra-aligned)</div>
          <v-alert type="success" variant="tonal">
            Pre-intake complete. Render your CBC input fields here.
          </v-alert>
        </div>
      </div>
    </template>
  </AppLayout>
</template>
