<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import { useDisplay } from 'vuetify'

const { mobile} = useDisplay()
</script>

<template>
  <AppLayout>
    <template #content>
      <v-row>
        <v-col cols="12" md="6" class="mx-auto">
          <v-card class="mx-auto" elevation="24">
            <v-card-title>
              <v-img
                src="/images/logo-favicon.png"
                :width="mobile ? '50%' : '25%'"
                class="mx-auto"
              ></v-img>
              <h3 class="font-weight-black text-center">HemaTuklas</h3>
              <!-- <h4 class="text-center">login</h4> -->

              <v-divider class="my-4"></v-divider>
            </v-card-title>

            <v-card-text class="bg-surface-light pt-4">
              <v-form fast-fail @submit.prevent>
                <v-text-field label="Email" variant="outlined"></v-text-field>

                <v-text-field label="Password" variant="outlined" type="password"></v-text-field>

                <v-btn class="bg-light-blue-darken-4" type="submit" block prepend-icon="mdi-login"
                  >LOGIN</v-btn
                >
              </v-form>

              <v-divider class="my-4"></v-divider>

              <h5 class="text-center">
                Don't have an account?
                <RouterLink to="/register" class="text-red-lighten-1">Click here to Register</RouterLink>
              </h5>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </AppLayout>
</template>
