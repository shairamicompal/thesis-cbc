<script setup>
import { ref } from 'vue'

const isPasswordVisible = ref(false)
const isPasswordConfirmationVisible = ref(false)
</script>

<template>
  <v-form class="mt-5" fast-fail @submit.prevent>
    <v-row dense class="text-blue-darken-1">
      <v-col cols="12" md="6">
        <v-text-field 
        prepend-inner-icon="mdi-account"
        label="Firstname" 
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field 
        prepend-inner-icon="mdi-account"
        label="Lastname" 
        ></v-text-field>
      </v-col>

      <v-col cols="12">
        <v-text-field 
        prepend-inner-icon="mdi-email"
        label="Email"
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          prepend-inner-icon="mdi-lock"
          label="Password"
          :type="isPasswordVisible ? 'text' : 'password'"
          :append-inner-icon="isPasswordVisible ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append-inner="isPasswordVisible = !isPasswordVisible"
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          prepend-inner-icon="mdi-lock"
          label="Confirm Password"
          :type="isPasswordConfirmationVisible ? 'text' : 'password'"
          :append-inner-icon="isPasswordConfirmationVisible ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append-inner="isPasswordConfirmationVisible = !isPasswordConfirmationVisible"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-btn class="bg-light-blue-darken-4 mt-2" type="submit" block prepend-icon="mdi-account-plus"
      >REGISTER
    </v-btn>
  </v-form>
</template>
