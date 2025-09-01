<script setup>
import { supabase, formActionDefault } from '@/utils/supabase'
import { getAvatarText } from '@/utils/helpers'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// Router
const router = useRouter()

// Load Variables
const formAction = ref({
  ...formActionDefault
})

// User data
const userData = ref(null)

// Get current user on mount
onMounted(async () => {
  const { data, error } = await supabase.auth.getUser()
  if (!error && data?.user) {
    userData.value = {
      email: data.user.email,
      firstname: data.user.user_metadata?.firstname || '',
      lastname: data.user.user_metadata?.lastname || '',
      image_url: data.user.user_metadata?.avatar_url || null
    }
  }
})

// Logout Functionality
const onLogout = async () => {
  formAction.value = { ...formActionDefault, formProcess: true }

  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Error during logout:', error)
    return
  }

  formAction.value.formProcess = false

  // Redirect to homepage
  router.replace('/')
}
</script>

<template>
  <v-menu min-width="200px" rounded>
    <template #activator="{ props }">
      <v-btn icon v-bind="props">
        <!-- Avatar: show uploaded image if available, else initials -->
        <v-avatar
          v-if="userData && userData.image_url"
          :image="userData.image_url"
          color="red-darken-1"
          size="large"
        />
        <v-avatar v-else color="red-darken-1" size="large">
          <span class="text-h5">
            {{ getAvatarText(userData ? userData.firstname + ' ' + userData.lastname : '') }}
          </span>
        </v-avatar>
      </v-btn>
    </template>

    <v-card class="mt-1">
      <v-card-text>
        <v-list>
          <v-list-item
            :subtitle="userData ? userData.email : ''"
            :title="userData ? userData.firstname + ' ' + userData.lastname : ''"
          >
            <template #prepend>
              <v-avatar
                v-if="userData && userData.image_url"
                :image="userData.image_url"
                color="blue-darken-1"
                size="large"
              />
              <v-avatar v-else color="red-darken-1" size="large">
                <span class="text-h5">
                  {{ getAvatarText(userData ? userData.firstname + ' ' + userData.lastname : '') }}
                </span>
              </v-avatar>
            </template>
          </v-list-item>
        </v-list>

        <v-divider class="my-3"></v-divider>

        <v-btn prepend-icon="mdi-wrench" variant="plain" to="/account/settings">
          Account Settings
        </v-btn>

        <v-divider class="my-3"></v-divider>

        <v-btn
          prepend-icon="mdi-logout"
          variant="plain"
          @click="onLogout"
          :loading="formAction.formProcess"
          :disabled="formAction.formProcess"
        >
          Logout
        </v-btn>
      </v-card-text>
    </v-card>
  </v-menu>
</template>
