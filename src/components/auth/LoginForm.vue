<script setup>
import { ref } from 'vue'

const isPasswordVisible = ref(false)
</script>

<template>
  <v-form fast-fail @submit.prevent>
    <v-row>
      <v-col cols="12">
        <v-text-field label="Email" prepend-inner-icon="mdi-email"></v-text-field>
      </v-col>

      <v-col cols="12">
        <v-text-field
          prepend-inner-icon="mdi-lock"
          label="Password"
          :type="isPasswordVisible ? 'text' : 'password'"
          :append-inner-icon="isPasswordVisible ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append-inner="isPasswordVisible = !isPasswordVisible"
        ></v-text-field>
      </v-col>
    </v-row>
    <v-btn class="bg-light-blue-darken-4 mt-2" type="submit" block prepend-icon="mdi-login"
      >LOGIN</v-btn
    >
  </v-form>
</template>
