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
    <!-- content slot -->
    <template #content>
      <v-container class="py-6">
        <!-- Page Title -->
        <h2 class="text-h5 font-weight-bold mb-4">History</h2>

        <!-- Subtitle -->
        <p class="text-body-2 mb-6 text-grey-darken-1">
          Review your past CBC interpretations and analysis. This section will display your previous
          records once available.
        </p>

        <!-- Placeholder Cards -->
        <v-row dense>
          <v-col cols="12" md="6" lg="4" v-for="n in 3" :key="n">
            <v-card elevation="2" class="pa-4">
              <h3 class="text-subtitle-1 font-weight-medium">CBC Record #{{ n }}</h3>
              <p class="text-body-2 text-grey-darken-1">
                Date: 2025-09-1{{ n }}
                <br />
                Status: Placeholder record for testing UI layout.
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
