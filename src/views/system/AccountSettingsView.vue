<!-- src/views/AccountSettingsView.vue -->
<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavi from '@/components/layout/navigation/SideNavi.vue'
import BottomNavi from '@/components/layout/navigation/BottomNavi.vue'

import PasswordForm from '@/components/system/account-settings/PasswordForm.vue'
import PictureForm from '@/components/system/account-settings/PictureForm.vue'
import ProfileForm from '@/components/system/account-settings/ProfileForm.vue'

import { useAuthUserStore } from '@/stores/authUser'
import { ref } from 'vue'
import { useDisplay } from 'vuetify'

const authStore = useAuthUserStore()
const { mobile } = useDisplay()

const isDrawerVisible = ref(true)
</script>

<template>
  <AppLayout
    :is-with-app-bar-nav-icon="!mobile"        
    @is-drawer-visible="isDrawerVisible = !isDrawerVisible"
  >
    <!-- Left drawer for desktop/tablet -->
    <template #navigation>
      <SideNavi v-if="!mobile" :is-drawer-visible="isDrawerVisible" />
    </template>

    <!-- Page content -->
    <template #content>
      <v-container>
        <v-card class="mb-5">
          <template #title>
            <span class="text-h6 font-weight-bold">
              <v-breadcrumbs :items="['Account', 'Settings']">
                <template #prepend>
                  <v-icon icon="mdi-wrench" size="small" class="me-1" />
                </template>
              </v-breadcrumbs>
            </span>
          </template>

          <template #subtitle>
            <p class="ms-4 text-wrap">
              Edit profile information, update profile picture and change password.
            </p>
          </template>
        </v-card>

        <v-row>
          <v-col cols="12" lg="4">
            <v-card>
              <v-card-text>
                <v-img
                  width="50%"
                  class="mx-auto rounded-circle"
                  color="grey-lighten-2"
                  aspect-ratio="1"
                  :src="authStore.userData.image_url || '/images/img-profile.png'"
                  alt="Profile Picture"
                  cover
                />
                <h3 class="d-flex align-center justify-center mt-5">
                  <v-icon class="me-2" icon="mdi-account-badge" />
                  {{ authStore.userRole }}
                </h3>
                <v-divider class="my-5" />
                <div class="text-center">
                  <h4 class="my-2">
                    <b>Fullname:</b>
                    {{ authStore.userData.firstname + ' ' + authStore.userData.lastname }}
                  </h4>
                  <h4 class="my-2"><b>Email:</b> {{ authStore.userData.email }}</h4>
                  <h4 class="my-2"><b>Contact No.:</b> {{ authStore.userData.phone }}</h4>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="8">
            <v-card class="mb-5" title="Profile Picture">
              <v-card-text><PictureForm /></v-card-text>
            </v-card>

            <v-card class="mb-5" title="Profile Information">
              <v-card-text><ProfileForm /></v-card-text>
            </v-card>

            <v-card class="mb-5" title="Change Password">
              <v-card-text><PasswordForm /></v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </template>

    <!-- Bottom tabs for mobile -->
    <template #bottom>
      <BottomNavi v-if="mobile" />
    </template>
  </AppLayout>
</template>
