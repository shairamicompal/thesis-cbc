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
      <v-container class="py-6">
        <!-- Page Title -->
        <h2 class="text-h5 font-weight-bold mb-4">Analysis</h2>

        <!-- Subtitle -->
        <p class="text-body-2 mb-6 text-grey-darken-1">
          Explore insights and visual reports from your CBC results. This section will show detailed
          analytics and charts once implemented.
        </p>

        <!-- Placeholder Sections -->
        <v-row dense>
          <v-col cols="12">
            <v-card elevation="2" class="pa-4 mb-4">
              <h3 class="text-subtitle-1 font-weight-medium">Trend Analysis</h3>
              <p class="text-body-2 text-grey-darken-1">
                Placeholder for charts and graphs that will visualize CBC trends.
              </p>
            </v-card>
          </v-col>

          <v-col cols="12">
            <v-card elevation="2" class="pa-4 mb-4">
              <h3 class="text-subtitle-1 font-weight-medium">AI Insights</h3>
              <p class="text-body-2 text-grey-darken-1">
                Placeholder for AI-powered interpretations and recommendations.
              </p>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </template>

    <!-- 👇 bottom slot (mobile only) -->
    <template #bottom>
      <BottomNavi v-if="mobile" />
    </template>
  </AppLayout>
</template>
