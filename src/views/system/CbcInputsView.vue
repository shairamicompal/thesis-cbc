<script setup>
import AppLayout from '@/components/layout/AppLayout.vue'
import SideNavi from '@/components/layout/navigation/SideNavi.vue'
import BottomNavi from '@/components/layout/navigation/BottomNavi.vue'
import { ref } from 'vue'
import { useDisplay } from 'vuetify'
// import DataInputs from '@/components/system/interpreter/DataInputs.vue'

const { mobile } = useDisplay()
const isDrawerVisible = ref(true)
</script>

<template>
  <AppLayout
    :is-with-app-bar-nav-icon="!mobile"
    @is-drawer-visible="isDrawerVisible = !isDrawerVisible"
  >
    <!-- navigation slot -->
    <template #navigation>
      <SideNavi v-if="!mobile" :is-drawer-visible="isDrawerVisible" />
    </template>

    <!-- content slot -->
    <template #content>
      <v-container>
           <v-card class="mb-5">
          <template #title>
            <span class="text-h6 font-weight-bold">
              <v-breadcrumbs :items="['CBC', 'Inputs']">
                <template #prepend>
                  <v-icon icon="mdi mdi-file-account-outline" size="small" class="me-1" />
                </template>
              </v-breadcrumbs>
            </span>
          </template>

          <template #subtitle>
            <p class="ms-4 text-wrap">
              Enter your CBC values below — review the status overview, then analyze with AI.
            </p>
          </template>
        </v-card>
        <v-row>
            <!-- <v-col cols="12" lg="12">
                <v-card class="mb-5" title="Data Inputs">
              <v-card-text><DataInputs/></v-card-text>
            </v-card>
            </v-col> -->
        </v-row>
      </v-container>
    </template>

    <!-- bottom slot (mobile only) -->
    <template #bottom>
      <BottomNavi v-if="mobile" />
    </template>
  </AppLayout>
</template>
