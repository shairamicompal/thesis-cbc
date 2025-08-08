<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router';

const theme = ref('light')

function onClick() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}
</script>

<template>
  <v-responsive class="border rounded">
    <v-app :theme="theme">
      <v-app-bar class="px-3" color="blue-lighten-3">
        <v-spacer></v-spacer>

        <v-btn
          :prepend-icon="theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          text="Toggle Theme"
          slim
          @click="onClick"
        ></v-btn>
      </v-app-bar>

      <v-main>
        <v-container>
          <v-row>
            <v-col cols="12" md="6" class="mx-auto">
              <v-card class="mx-auto" prepend-icon="mdi-account-plus" subtitle="Register your account" elevation="24">
                <template v-slot:title>
                  <span class="font-weight-black">Hematuklas</span>
                </template>

                <v-card-text class="bg-surface-light pt-4">
                  <v-form fast-fail @submit.prevent>
                    <v-text-field
                      label="Firstname"
                      variant="outlined"
                    ></v-text-field>

                    <v-text-field
                      label="Lastname"
                      variant="outlined"
                    ></v-text-field>

                    <v-text-field
                      label="Email"
                      variant="outlined"
                    ></v-text-field>

                    <v-text-field
                      label="Password"
                      variant="outlined"
                      type="password"
                    ></v-text-field>

                    <v-text-field
                      label="Password Confirmation"
                      variant="outlined"
                      type="password"
                    ></v-text-field>

                    <v-btn type="submit" block prepend-icon="mdi-account-plus">REGISTER</v-btn>
                  </v-form>

                  <v-divider class="my-4"></v-divider>

                  <h5 class="text-center">Already have an account? <RouterLink to="/" class="text-primary">Click here to Login</RouterLink></h5>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-main>

      <v-footer color="red-darken-3" border app class="text-center">2024 - Hematuklas</v-footer>
    </v-app>
  </v-responsive>
</template>