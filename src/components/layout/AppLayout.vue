<!-- <script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const theme = ref(localStorage.getItem('theme') ?? 'light')

function onClick() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
}
</script>

<template>
  <v-responsive>
    <v-app :theme="theme">
      <v-app-bar
        class="px-3"
        :color="theme === 'light' ? 'blue-lighten-3' : 'blue-darken-1'"
        border
      >
        <v-spacer></v-spacer>

        <v-btn
          :icon="theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          variant="elevated"
          slim
          @click="onClick"
        ></v-btn>
      </v-app-bar>

      <v-main>
          <slot name="content"></slot>
      </v-main>

      <v-footer
        class="font-weight-bold"
        :color="theme === 'light' ? 'red-darken-4' : 'red-darken-1'"
        border
        app
      >
      <div>
        Copyright © 2025 -
          <span class="ml-1">
            <v-icon class="mr-1">mdi-bottle-tonic-plus</v-icon>
            HemaTuklas 
          </span>
           | All Rights Reserved
      </div>
      </v-footer>
    </v-app>
  </v-responsive>
</template> -->


<script setup>
import { isAuthenticated } from '@/utils/supabase'
import ProfileHeaderNavigation from './ProfileHeaderNavigation.vue'
// import { useAuthUserStore } from '@/stores/authUser'
import { onMounted, ref } from 'vue'
import { useDisplay } from 'vuetify'

const props = defineProps(['isWithAppBarNavIcon'])

const emit = defineEmits(['isDrawerVisible'])

// Utilize predefined vue functions
const { xs, sm, mobile } = useDisplay()

// // Use Pinia Store
// const authStore = useAuthUserStore()


// Load Variables 
const isLoggedIn = ref(false)
const theme = ref(localStorage.getItem('theme') ?? 'light')

//  Toggle Theme
const onToggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
}

// Get Authentication status from supabase
const getLoggedStatus = async () => {
  isLoggedIn.value = await isAuthenticated()
}

// Load Functions during component rendering
onMounted(() => {
  getLoggedStatus()
})
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
        >
        </v-app-bar-nav-icon>

        <!-- <v-app-bar-title>
          <v-img src="/images/pawtrack-logo.png" :width="xs ? '100%' : sm ? '40%' : '9%'"></v-img>
        </v-app-bar-title> -->

        <v-spacer></v-spacer>

        <v-btn
        class="me-2"
          :icon="theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          variant="elevated"
          slim
          @click="onToggleTheme"
        ></v-btn>

        <ProfileHeaderNavigation v-if="isLoggedIn"></ProfileHeaderNavigation>
      </v-app-bar>

      <slot name="navigation"></slot>
      
      <v-main>
        <slot name="content"></slot>
      </v-main>

      <v-footer
        class="font-weight-bold"
        :class="mobile ? 'text-caption' : ''"
        :color="theme === 'light' ? 'red-darken-4' : 'red-darken-1'"
        border
        app
      >
        <div :class="mobile ? 'w-100 text-center' : ''">
          Copyright © 2025 -
          <span class="ml-1">
            <v-icon class="mr-1">mdi-bottle-tonic-plus</v-icon>
            HemaTuklas 
          </span>
           | All Rights Reserved
        </div>
      </v-footer>
    </v-app>
  </v-responsive>
</template>