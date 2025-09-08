import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export const useAuthUserStore = defineStore('authUser', () => {
  // States
  const userData = ref(null)

  // Getters
  // Computed Properties; Use for getting the state but not modifying its reactive state
  const userRole = computed(() => {
    return userData.value?.is_admin ? 'Administrator' : 'User'
  })

  // Reset State Action
  function $reset() {
    userData.value = null
  }

  // Actions
  // Retrieve User Information
  async function getUserInformation() {
    const {
      data: {
        user: { id, email, user_metadata }
      }
    } = await supabase.auth.getUser()

    // Set the retrieved information to state
    userData.value = { id, email, ...user_metadata }
  }

  // Update User Information
  async function updateUserInformation(updatedData) {
    const {
      data: {
        user: { id, email, user_metadata }
      },
      error
    } = await supabase.auth.updateUser({
      data: {
        ...updatedData
      }
    })

       // Check if it has error;
       if (error) {
        return { success: false, error }
      }
      // If no error set updatedData to userData state
      else if (user_metadata) {
        userData.value = { id, email, ...user_metadata }
        return { success: true, data: userData.value }
      }
    }

  // Update User Profile Image
  async function updateUserImage(file) {
    const { data, error } = await supabase.storage
      .from('thesis-cbc')
      .upload('avatars/' + userData.value.id + '-avatar.png', file, {
        cacheControl: '3600',
        upsert: true
      })

    // Check if it has error
    if (error) {
      return { error }
    }
    // If no error set data to userData state with the image_url
    else if (data) {
      // Retrieve Image Public Url
      const { data: imageData } = supabase.storage.from('thesis-cbc').getPublicUrl(data.path)
      return await updateUserInformation({ ...userData.value, image_url: imageData.publicUrl })
    }
  }

  return {
    userData,
    userRole,
    $reset,
    getUserInformation,
    updateUserInformation,
    updateUserImage
  }
})