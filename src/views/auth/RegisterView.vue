<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'

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
              
                <RegisterForm></RegisterForm>

              <v-divider class="my-4"></v-divider>

              <h5 class="text-center">
                Already have an account?
                <RouterLink to="/" class="text-red-lighten-1">Click here to Login</RouterLink>
              </h5>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </AppLayout>
</template>
