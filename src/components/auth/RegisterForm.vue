<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AlertNotification from '@/components/common/AlertNotification.vue'
import { supabase } from '@/utils/supabase'
import {
  requiredValidator,
  emailValidator,
  passwordValidator,
  confirmedValidator,
} from '@/utils/validators'

// Prefer env; fallback to localhost for dev
// In Vite, set VITE_API_BASE=http://localhost:8000/api (frontend .env)
const API_BASE = import.meta?.env?.VITE_API_BASE || 'http://localhost:8000/api'

const router = useRouter()

const isPasswordVisible = ref(false)
const isPasswordConfirmationVisible = ref(false)
const refVForm = ref()

const formData = ref({
  firstname: '',
  lastname: '',
  email: '',
  password: '',
  password_confirmation: '',
})

const formActionDefault = {
  formProcess: false,
  formStatus: null,
  formErrorMessage: '',
  formSuccessMessage: '',
}
const formAction = ref({ ...formActionDefault })

// Safely parse JSON (prevents "<!DOCTYPE" crash on HTML error pages)
const safeJson = async (res) => {
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { raw: text } }
}

// Rules as functions so they react to latest values
const firstNameRules = [requiredValidator]
const lastNameRules  = [requiredValidator]
const emailRules     = [requiredValidator, emailValidator]
const passwordRules  = [requiredValidator, passwordValidator]
const confirmPasswordRules = [
  requiredValidator,
  (val) => confirmedValidator(val, formData.value.password),
  // Or basic version:
  // (val) => val === formData.value.password || 'Passwords do not match',
]

// Clear banners when user edits
watch(formData, () => {
  formAction.value.formErrorMessage = ''
  formAction.value.formSuccessMessage = ''
}, { deep: true })

const onSubmit = async () => {
  if (formAction.value.formProcess) return
  formAction.value = { ...formActionDefault, formProcess: true }

  try {
    const payload = {
      email: formData.value.email.trim(),
      password: formData.value.password,
      profile: {
        firstname: formData.value.firstname.trim(),
        lastname:  formData.value.lastname.trim(),
      },
    }

    // 1) Create user (server, using service role)
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await safeJson(response)
    console.log('Signup response:', response.status, result)

    if (!response.ok) {
      formAction.value.formStatus = response.status
      const looksLikeHtml = typeof result?.raw === 'string' && result.raw.startsWith('<')
      formAction.value.formErrorMessage =
        result?.error
          ? result.error
          : looksLikeHtml
            ? 'Server returned HTML (proxy/middleware issue). Use absolute URL or fix proxy.'
            : 'Signup failed. Please try again.'
      return
    }

    // 2) Auto-login (client)
    formAction.value.formSuccessMessage = 'Registration successful — signing you in...'
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    })
    if (loginErr) {
      formAction.value.formErrorMessage = `Account created but sign-in failed: ${loginErr.message}`
      formAction.value.formStatus = loginErr.status ?? 400
      return
    }

    // 3) Go to dashboard once session exists
    await router.replace('/dashboard')

    // Optional: reset after navigation
    refVForm.value?.reset()
    refVForm.value?.resetValidation()
  } catch (err) {
    formAction.value.formStatus = 0
    formAction.value.formErrorMessage =
      err?.message || 'Network error. Make sure the server is running on :8000.'
  } finally {
    formAction.value.formProcess = false
  }
}

const onFormSubmit = async (e) => {
  e.preventDefault()
  const { valid } = await refVForm.value?.validate()
  if (valid) onSubmit()
}
</script>

<template>
  <alert-notification
    v-if="formAction.formSuccessMessage || formAction.formErrorMessage"
    :form-success-message="formAction.formSuccessMessage"
    :form-error-message="formAction.formErrorMessage"
  />

  <v-form ref="refVForm" class="mt-5" @submit="onFormSubmit">
    <v-row dense class="text-blue-darken-1">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.firstname"
          prepend-inner-icon="mdi-account"
          label="Firstname"
          :rules="firstNameRules"
          autocomplete="given-name"
        />
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.lastname"
          prepend-inner-icon="mdi-account"
          label="Lastname"
          :rules="lastNameRules"
          autocomplete="family-name"
        />
      </v-col>

      <v-col cols="12">
        <v-text-field
          v-model="formData.email"
          prepend-inner-icon="mdi-email"
          label="Email"
          :rules="emailRules"
          autocomplete="email"
          inputmode="email"
        />
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.password"
          prepend-inner-icon="mdi-lock"
          label="Password"
          :type="isPasswordVisible ? 'text' : 'password'"
          :append-inner-icon="isPasswordVisible ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append-inner="isPasswordVisible = !isPasswordVisible"
          :rules="passwordRules"
          autocomplete="new-password"
        />
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.password_confirmation"
          prepend-inner-icon="mdi-lock"
          label="Confirm Password"
          :type="isPasswordConfirmationVisible ? 'text' : 'password'"
          :append-inner-icon="isPasswordConfirmationVisible ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append-inner="isPasswordConfirmationVisible = !isPasswordConfirmationVisible"
          :rules="confirmPasswordRules"
          autocomplete="new-password"
        />
      </v-col>
    </v-row>

    <v-btn
      class="bg-light-blue-darken-4 mt-2"
      type="submit"
      block
      prepend-icon="mdi-account-plus"
      :disabled="formAction.formProcess"
      :loading="formAction.formProcess"
    >
      REGISTER
    </v-btn>
  </v-form>
</template>

<style scoped>
.v-text-field :deep(input)::placeholder{ opacity:.8 }
</style>
