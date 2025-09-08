<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavi from '@/components/layout/navigation/SideNavi.vue'
import { ref } from 'vue'
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()
const isDrawerVisible = ref(true)
</script>

<template>
  <AppLayout
    :is-with-app-bar-nav-icon="true"
    @is-drawer-visible="isDrawerVisible = !isDrawerVisible"
  >
    <!-- navigation slot -->
    <template #navigation>
      <SideNavi :is-drawer-visible="isDrawerVisible" />
    </template>

    <!-- content slot -->
    <template #content>
      <v-container fluid class="py-8 py-md-10">
        <v-row class="fill-height" align="center" justify="center">
          <v-col cols="12" sm="10" md="8" lg="7" xl="6">
            <v-card class="pa-5 pa-md-6 rounded-xl" elevation="4">
              <!-- Brand / title -->
              <div class="text-h5 text-md-h4 font-weight-bold mb-6 text-center">
                <span class="text-brown-darken-2">Hema</span
                ><span class="text-red-accent-3">Tuklas</span>
              </div>

              <!-- Responsive row: stack on mobile, side-by-side on lg -->
              <v-row align="center" justify="center" class="mb-6">
                <!-- Welcome message -->
                <v-col cols="12" lg="6" class="d-flex align-center">
                  <div class="text-body-2 text-medium-emphasis text-center text-lg-start">
                    “Welcome to HemaTuklas, your AI-powered guide for understanding your CBC
                    results. Gain clear insights and helpful explanations that empower you to make
                    informed decisions—because knowing more means living smarter.”
                  </div>
                </v-col>

                <!-- Image -->
                <v-col cols="12" lg="6">
                  <v-img
                    src="/images/illustration/ill1.png"
                    aspect-ratio="16/9"
                    class="rounded-lg"
                    cover
                  />
                </v-col>
              </v-row>

              <!-- Continue button -->
              <v-btn
                color="red-accent-3"
                class="text-none rounded-lg"
                size="large"
                block
                @click="$router.push({ name: 'cbc-upload' })"
              >
                Continue
                <v-icon icon="mdi-arrow-right" end />
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </template>
  </AppLayout>
</template>
