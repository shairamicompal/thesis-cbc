<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavi from '@/components/layout/navigation/SideNavi.vue'
import BottomNavi from '@/components/layout/navigation/BottomNavi.vue'
import { ref } from 'vue'
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()
const isDrawerVisible = ref(true)
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
      <v-container class="py-8 py-md-10" style="max-width: 980px">
        <!-- Hero -->
        <v-card rounded="xl" elevation="3" class="pa-6 pa-md-8 mb-6">
          <div class="text-h5 text-md-h4 font-weight-bold mb-2 brand-title">
            Welcome to
            <span class="hema">Hema</span><span class="sense">Sense</span>!
          </div>

          <div class="text-body-2 text-medium-emphasis mb-6">
            Empowering you with clearer insights, because understanding your health means living
            smarter.
          </div>

          <v-row align="center" class="mb-2">
            <!-- <v-col cols="12" md="6">
              <v-img
                src="/images/illustration/ill1.png"
                aspect-ratio="16/9"
                class="rounded-lg"
                cover
              />
            </v-col> -->

            <v-col cols="12" md="6">
              <!-- What you'll get -->
              <div class="text-subtitle-1 font-weight-bold mb-3">✨ What You’ll Get</div>

              <v-list density="comfortable" lines="one">
                <v-list-item>
                  <template #prepend>
                    <v-avatar size="28" class="mr-2" color="red-lighten-5">
                      <v-icon color="red-accent-3">mdi-magnify</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="font-weight-medium">Smart Analysis</v-list-item-title>
                  <v-list-item-subtitle>
                    AI highlights patterns and flags out-of-range values in your CBC.
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-avatar size="28" class="mr-2" color="red-lighten-5">
                      <v-icon color="red-accent-3">mdi-flash</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="font-weight-medium">Instant Insights</v-list-item-title>
                  <v-list-item-subtitle>
                    Clear, plain-language explanations—no medical jargon.
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-avatar size="28" class="mr-2" color="red-lighten-5">
                      <v-icon color="red-accent-3">mdi-chart-line</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="font-weight-medium">Track Trends</v-list-item-title>
                  <v-list-item-subtitle>
                    Compare results over time to see progress at a glance.
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>

        </v-card>

        <!-- Getting started -->
        <v-card rounded="xl" elevation="2" class="pa-6">
          <div class="text-subtitle-1 font-weight-bold mb-4">🚀 Getting Started</div>

          <v-row>
            <v-col cols="12" md="4" class="mb-4">
              <div class="d-flex">
                <v-avatar color="red-accent-3" size="32" class="mr-3">
                  <span class="text-body-2 font-weight-bold">1</span>
                </v-avatar>
                <div>
                  <div class="font-weight-medium">Input Your CBC</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Enter your CBC values (WBC, RBC, Hb, indices, differential).
                  </div>
                </div>
              </div>
            </v-col>

            <v-col cols="12" md="4" class="mb-4">
              <div class="d-flex">
                <v-avatar color="red-accent-3" size="32" class="mr-3">
                  <span class="text-body-2 font-weight-bold">2</span>
                </v-avatar>
                <div>
                  <div class="font-weight-medium">Choose AI Analyzer</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Pick your preferred AI engine to process the results.
                  </div>
                </div>
              </div>
            </v-col>

            <v-col cols="12" md="4" class="mb-4">
              <div class="d-flex">
                <v-avatar color="red-accent-3" size="32" class="mr-3">
                  <span class="text-body-2 font-weight-bold">3</span>
                </v-avatar>
                <div>
                  <div class="font-weight-medium">Get Interpreted Output</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Receive a detailed breakdown, a concise final summary, and suggested next steps
                    or follow-up actions.
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card>

        <!-- Disclaimer -->
        <div class="text-caption text-medium-emphasis mt-4">
          ⚠️ HemaSense provides educational information and does not replace professional medical
          advice. Always consult a licensed clinician for diagnosis or treatment decisions.
        </div>
      </v-container>
    </template>

    <!-- bottom slot (mobile only) -->
    <template #bottom>
      <BottomNavi v-if="mobile" />
    </template>
  </AppLayout>
</template>
<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Lato:wght@700&display=swap');

/* Apply Inter for normal text */
body,
.text-body-1,
.text-body-2,
.text-medium-emphasis,
.text-caption {
  font-family: 'Inter', sans-serif;
}

/* Apply Lato for headings + brand */
.text-h5,
.text-h4,
.font-weight-bold,
.brand-title {
  font-family: 'Lato', sans-serif;
}

.hema {
  color: #d32f2f; /* strong medical red */
  font-weight: 900;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.sense {
  color: #1976d2; /* deep healthcare blue */
  font-weight: 900;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Optional subtle underline effect */
/* .hema::after {
  content: '';
  display: block;
  height: 3px;
  background: #f44336;
  margin-top: 2px;
  border-radius: 2px;
} */
</style>
