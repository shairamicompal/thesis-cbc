<script setup>
import AlertNotification from '@/components/common/AlertNotification.vue'
import { formActionDefault, supabase } from '@/utils/supabase'
import { requiredValidator, emailValidator } from '@/utils/validators'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const refVForm = ref()
const isPasswordVisible = ref(false)

const formData = ref({ email: '', password: '' })
const formAction = ref({ ...formActionDefault })

watch(formData, () => {
  formAction.value.formErrorMessage = ''
  formAction.value.formSuccessMessage = ''
}, { deep: true })

const onSubmit = async () => {
  formAction.value = { ...formActionDefault, formProcess: true }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.value.email.trim(),
      password: formData.value.password
    })

    if (error) {
      formAction.value.formErrorMessage = error.message
      return
    }

    // ✅ show short success message before redirect
    formAction.value.formSuccessMessage = 'Login successful! Redirecting...'
    setTimeout(() => router.replace('/dashboard'), 800)
  } catch (err) {
    formAction.value.formErrorMessage = err?.message || 'Network error.'
  } finally {
    formAction.value.formProcess = false
  }
}

const onFormSubmit = async () => {
  const { valid } = await refVForm.value?.validate()
  if (valid) onSubmit()
}
</script>

<template>
  <AlertNotification
    :form-success-message="formAction.formSuccessMessage"
    :form-error-message="formAction.formErrorMessage"
  />

  <v-form ref="refVForm" class="mt-5" @submit.prevent="onFormSubmit">
    <v-row dense class="text-blue-darken-1">
      <v-col cols="12">
        <v-text-field
          v-model="formData.email"
          label="Email"
          prepend-inner-icon="mdi-email-outline"
          :rules="[requiredValidator, emailValidator]"
        />
      </v-col>

      <v-col cols="12">
        <v-text-field
          v-model="formData.password"
          label="Password"
          prepend-inner-icon="mdi-lock-outline"
          :type="isPasswordVisible ? 'text' : 'password'"
          :append-inner-icon="isPasswordVisible ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="isPasswordVisible = !isPasswordVisible"
          :rules="[requiredValidator]"
        />
      </v-col>
    </v-row>

    <v-btn
      class="bg-light-blue-darken-4 mt-2"
      type="submit"
      block
      prepend-icon="mdi-login"
      :disabled="formAction.formProcess"
      :loading="formAction.formProcess"
    >
      Login
    </v-btn>
  </v-form>
</template>
