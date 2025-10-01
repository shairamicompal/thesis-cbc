<!-- src/layout/AppLayout.vue -->
<script setup>
import { isAuthenticated } from '@/utils/supabase'
import ProfileHeaderNavigation from './ProfileHeaderNavigation.vue'
import { onMounted, ref } from 'vue'
import { useDisplay } from 'vuetify'

const props = defineProps(['isWithAppBarNavIcon'])
const emit = defineEmits(['isDrawerVisible'])

const { xs, sm, mobile } = useDisplay()

const isLoggedIn = ref(false)
const theme = ref(localStorage.getItem('theme') ?? 'light')

const onToggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
}
const getLoggedStatus = async () => {
  isLoggedIn.value = await isAuthenticated()
}
onMounted(() => { getLoggedStatus() })
</script>

<template>
  <v-responsive>
    <v-app :theme="theme">
      <v-app-bar
        class="px-3"
        :color="theme === 'light' ? 'blue-lighten-3' : 'blue-darken-1'"
        border
      >
        <v-app-bar-nav-icon
          v-if="props.isWithAppBarNavIcon"
          icon="mdi-menu"
          :theme="theme"
          @click="emit('isDrawerVisible')"
        />
        <v-spacer />
        <v-btn
          class="me-2"
          :icon="theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          variant="elevated"
          slim
          @click="onToggleTheme"
        />
        <ProfileHeaderNavigation v-if="isLoggedIn" />
      </v-app-bar>

      <!-- Side / Drawer slot (desktop/tablet) -->
      <slot name="navigation"></slot>

      <v-main>
        <slot name="content"></slot>
      </v-main>

      <!-- 🔻 NEW: Bottom Navigation slot (mobile) -->
      <slot name="bottom"></slot>
    </v-app>
  </v-responsive>
</template>
