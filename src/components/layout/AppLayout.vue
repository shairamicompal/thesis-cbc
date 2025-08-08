<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const theme = ref('light')

function onClick() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}
</script>

<template>
  <v-responsive class="border rounded">
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
        <v-container>
          <slot name="content"></slot>
        </v-container>
      </v-main>

      <v-footer :color="theme === 'light' ? 'red-darken-4' : 'red-darken-1'" border app
        >2024 - Hematuklas</v-footer
      >
    </v-app>
  </v-responsive>
</template>
