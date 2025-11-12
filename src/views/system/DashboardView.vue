<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavi from '@/components/layout/navigation/SideNavi.vue'
import BottomNavi from '@/components/layout/navigation/BottomNavi.vue'

// Import the two destination views
import InterpreterView from '@/views/system/InterpreterView.vue'
import HistoryView from '@/views/system/HistoryView.vue'

import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useRouter } from 'vue-router'
import { useAuthUserStore } from '@/stores/authUser' // adjust path if different

const { mobile } = useDisplay()
const isDrawerVisible = ref(true)
const router = useRouter()
const authUser = useAuthUserStore()

const loadingUser = ref(true)
const hasVisitedBefore = ref(false)

/* --------- Lifecycle: fetch user + determine greeting --------- */
onMounted(async () => {
  if (localStorage.getItem('cbc_home_seen') === '1') {
    hasVisitedBefore.value = true
  }

  try {
    await authUser.getUserInformation()
  } catch (err) {
    console.error('Failed to fetch user info:', err)
  } finally {
    loadingUser.value = false
    if (!hasVisitedBefore.value) {
      localStorage.setItem('cbc_home_seen', '1')
    }
  }
})

/* --------- First name resolver --------- */
const firstName = computed(() => {
  const meta = authUser.userData || {}
  const rawName =
    meta.full_name ||
    meta.name ||
    meta.first_name ||
    meta.firstname ||
    meta.display_name ||
    ''

  if (rawName && typeof rawName === 'string') {
    const first = rawName.trim().split(' ')[0]
    if (first) return first
  }

  if (meta.email && typeof meta.email === 'string') {
    const local = meta.email.split('@')[0]
    if (local) return local
  }

  return 'User'
})

/* --------- Greeting lines --------- */
const greetingLine = computed(() => {
  if (loadingUser.value) {
    return `Welcome, ${firstName.value}`
  }
  return hasVisitedBefore.value
    ? `Welcome back, ${firstName.value} 👋`
    : `Welcome, ${firstName.value} 👋`
})

const subtextLine = computed(() => 'Ready to interpret your latest CBC result?')

/* --------- Navigation handlers --------- */
const goToAnalysis = () => {
  // Push directly to the InterpreterView route
  router.push({
    path: '/interpreter',
    component: InterpreterView
  })
}

const goToHistory = () => {
  router.push({
    path: '/history',
    component: HistoryView
  })
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
      <v-container class="py-6 py-md-8" style="max-width: 980px">
        <!-- Logo + Greeting -->
        <div class="text-center">
          <v-img
            class="mx-auto"
            src="/images/logoHS_1.png"
            :width="mobile ? '90%' : '34%'"
            cover
          />
          <div class="text-subtitle-1 font-weight-medium">
            {{ greetingLine }}
          </div>
          <div class="text-body-2 text-medium-emphasis mt-1">
            {{ subtextLine }}
          </div>
        </div>

        <!-- Primary Action Card -->
        <v-card class="mx-auto pa-5 text-center home-primary-card">
          <v-btn
            color="#b70d37"
            rounded="pill"
            size="large"
            prepend-icon="mdi mdi-water-plus"
            @click="goToAnalysis"
          >
            Start Analysis
          </v-btn>
        </v-card>

        <!-- Quick Actions -->
        <v-row class="mt-6" justify="center" align="stretch" dense>
          <v-col cols="6" sm="4">
            <v-card
              class="pa-3 text-center rounded-lg home-mini-card"
              variant="outlined"
              @click="goToHistory"
            >
              <v-icon size="22" class="mb-1" color="#1b365d">
                mdi-history
              </v-icon>
              <div class="text-caption font-weight-medium">View History</div>
              <div class="text-xxs text-medium-emphasis mt-1">
                All your saved interpreted CBC result.
              </div>
            </v-card>
          </v-col>

          <v-col cols="6" sm="4">
            <v-card class="pa-3 text-center rounded-lg home-mini-card" variant="outlined">
              <v-icon size="22" class="mb-1" color="#1b365d">
                mdi-lightbulb-on-outline
              </v-icon>
              <div class="text-caption font-weight-medium">How It Works</div>
              <div class="text-xxs text-medium-emphasis mt-1">
                Short guide to reading your results.
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" sm="4">
            <v-card class="pa-3 text-center rounded-lg home-mini-card" variant="outlined">
              <v-icon size="22" class="mb-1" color="#1b365d">
                mdi-shield-check-outline
              </v-icon>
              <div class="text-caption font-weight-medium">Secure & Private</div>
              <div class="text-xxs text-medium-emphasis mt-1">
                Your CBC data stays encrypted and confidential.
              </div>
            </v-card>
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
.home-primary-card {
  backdrop-filter: blur(6px);
  border-radius: 24px;
  border: none !important;
  box-shadow: none !important;
}

.home-mini-card {
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
  border-radius: 18px;
}

.home-mini-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.text-xxs {
  font-size: 0.68rem;
}
</style>
