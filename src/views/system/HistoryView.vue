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
        <h2 class="text-h5 font-weight-bold mb-4">History</h2>

        <!-- Subtitle -->
        <p class="text-body-2 mb-6 text-grey-darken-1">
          Review your past CBC interpretations and analysis. This section will display your previous
          records once available.
        </p>

      </v-container>
    </template>

    <!-- 👇 bottom slot (mobile only) -->
    <template #bottom>
      <BottomNavi v-if="mobile" />
    </template>
  </AppLayout>
</template>
