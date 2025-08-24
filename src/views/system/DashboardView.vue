<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import { ref } from 'vue'
import { useDisplay } from 'vuetify'

import SideNavi from '@/components/layout/navigation/SideNavi.vue'

const { mobile } = useDisplay()
const isDrawerVisible = ref(true)
</script>

<template>
  <AppLayout
    :is-with-app-bar-nav-icon="true"
    @is-drawer-visible="isDrawerVisible = !isDrawerVisible"
  >
    <template #navigation>
      <SideNavi :is-drawer-visible="isDrawerVisible" />
    </template>

    <!-- Put your dashboard widgets here later -->
  </AppLayout>
</template>
