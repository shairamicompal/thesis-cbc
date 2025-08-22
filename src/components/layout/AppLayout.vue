<script setup>
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
</template>
