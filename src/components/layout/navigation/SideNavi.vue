<script setup>
import { mainNav } from './sideNavigation' // 👉 export your mainNav array here
import { useDisplay } from 'vuetify'
import { ref, watch } from 'vue'

const props = defineProps({
  isDrawerVisible: { type: Boolean, default: true },
})

const { mobile } = useDisplay()
const isDrawerVisible = ref(props.isDrawerVisible)

// Sync props with local state
watch(() => props.isDrawerVisible, (val) => {
  isDrawerVisible.value = val
})

function generateRoute(title) {
  if (!title) return null
  return `/${title.replace(/\s+/g, '-').toLowerCase()}`
}
</script>

<template>
  <v-navigation-drawer
    v-model="isDrawerVisible"
    :temporary="mobile"
    :permanent="!mobile"
    width="250"
  >
    <v-list density="compact" nav>
      <v-list-item prepend-icon="mdi-home" title="Home" to="/dashboard" />

      <v-divider />

      <v-list-item
        v-for="([title, icon], i) in mainNav"
        :key="i"
        :prepend-icon="icon"
        :title="title"
        :to="generateRoute(title)"
      />

      <v-divider />

      <v-list-item
        prepend-icon="mdi-account"
        title="Account Settings"
        to="/account/settings"
      />
    </v-list>
  </v-navigation-drawer>
</template>

<style scoped>
.v-list-item {
  transition: transform 0.3s ease;
}
.v-list-item:hover {
  transform: scale(1.05);
}
</style>
