<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue';
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()
</script>

<template>
  <AppLayout :is-with-app-bar-nav-icon="false">
    <template #content>
      <v-container fluid>
        <v-row>
          <!-- Left Column for Desktop (hidden on mobile) -->
          <v-col cols="12" lg="8" class="bg-surface-light h-screen" v-if="!mobile">
            <!-- <v-img
              src="/images/banner-pt.png"
              class="fill-height"
              alt="Background Image"
              cover
            ></v-img> -->
          </v-col>

          <!-- Right Column for Login Form -->
          <v-col cols="12" lg="4" :class="mobile ? '' : 'pt-16'">
            <v-card class="mx-auto" elevation="0" max-width="600">
              <!-- Card Title with Logo -->
              <v-card-title class="text-center">
                <v-img
                  class="mx-auto mb-10"
                  src="/images/logo-favicon.png"
                  :width="mobile ? '75%' : '35%'"
                ></v-img>
                <p>Registration</p>
              </v-card-title>

              <v-card-text>

                <v-divider class="my-3"></v-divider>

                <RegisterForm></RegisterForm>

                <v-divider class="my-3"></v-divider>

                <!-- Register Link -->
                <h4 class="text-center">
                  Already have account?
                  <router-link class="text-red-darken-3 font-weight-black" to="/">
                    Click here to Login
                  </router-link>
                </h4>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </template>
  </AppLayout>
</template>