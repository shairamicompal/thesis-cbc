<script setup>
import {
  requiredValidator,
  emailValidator,
  passwordValidator,
  confirmedValidator,
} from '@/utils/validators'
import { ref } from 'vue'
import { supabase, formActionDefault } from '@/utils/supabase.js'
import AlertNotification from '@/components/common/AlertNotification.vue'

const isPasswordVisible = ref(false)
const isPasswordConfirmationVisible = ref(false)
const refVForm = ref()

const formDataDefault = {
  firstname: '',
  lastname: '',
  email: '',
  password: '',
  password_confirmation: '',
}

const formData = ref({
  ...formDataDefault,
})

const formAction = ref({
  ...formActionDefault,
})

const onSubmit = async () => {
  formAction.value = { ...formActionDefault }
  formAction.value.formProcess = true

  const { data, error } = await supabase.auth.signUp({
    email: formData.value.email,
    password: formData.value.password,
    options: {
      data: {
        firstname: formData.value.firstname,
        lastname: formData.value.lastname,
      },
    },
  })

  if (error) {
    console.log(error)
    formAction.value.formErrorMessage = error.message
    formAction.value.formStatus = error.status
  } else if (data) {
    console.log(data)
    formAction.value.formSuccessMessage = 'Registration successful!'
    // reset form
    refVForm.value.reset()
  }

  formAction.value.formProcess = false
}

const onFormSubmit = (e) => {
  e.preventDefault() // ✅ prevent page reload
  refVForm.value?.validate().then(({ valid }) => {
    if (valid) onSubmit()
  })
}
</script>

<template>
  <alert-notification
    v-if="formAction.formSuccessMessage || formAction.formErrorMessage"
    :form-success-message="formAction.formSuccessMessage"
    :form-error-message="formAction.formErrorMessage"
  ></alert-notification>

  <v-form ref="refVForm" class="mt-5" @submit="onFormSubmit">
    <v-row dense class="text-blue-darken-1">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.firstname"
          prepend-inner-icon="mdi-account"
          label="Firstname"
          :rules="[requiredValidator]"
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.lastname"
          prepend-inner-icon="mdi-account"
          label="Lastname"
          :rules="[requiredValidator]"
        ></v-text-field>
      </v-col>

      <v-col cols="12">
        <v-text-field
          v-model="formData.email"
          prepend-inner-icon="mdi-email"
          label="Email"
          :rules="[requiredValidator, emailValidator]"
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.password"
          prepend-inner-icon="mdi-lock"
          label="Password"
          :type="isPasswordVisible ? 'text' : 'password'"
          :append-inner-icon="isPasswordVisible ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append-inner="isPasswordVisible = !isPasswordVisible"
          :rules="[requiredValidator, passwordValidator]"
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.password_confirmation"
          prepend-inner-icon="mdi-lock"
          label="Confirm Password"
          :type="isPasswordConfirmationVisible ? 'text' : 'password'"
          :append-inner-icon="isPasswordConfirmationVisible ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append-inner="isPasswordConfirmationVisible = !isPasswordConfirmationVisible"
          :rules="[
            requiredValidator,
            confirmedValidator(formData.password_confirmation, formData.password),
          ]"
        ></v-text-field>
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
