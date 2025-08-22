<script setup>
import { requiredValidator, emailValidator} from '@/utils/validators'
import { ref } from 'vue'

const isPasswordVisible = ref(false)
const refVForm = ref()

const formDataDefault = {
  email: '', 
  password: '',
}

const formData = ref({
  ...formDataDefault
})

const onSubmit = () => {
  // alert(formData.value.email)
}

const onFormSubmit = () => {
  refVForm.value?.validate().then(({ valid }) => {
    if (valid) 
    onSubmit()
  })
}
</script>

<template>
  <v-form class="mt-5" ref="refVForm" @submit="onFormSubmit">
    <v-row dense class="text-blue-darken-1">
      <v-col cols="12">
        <v-text-field 
        v-model="formData.email"
        label="Email" 
        prepend-inner-icon="mdi-email"
        :rules="[requiredValidator, emailValidator]"
        ></v-text-field>
      </v-col>

      <v-col cols="12">
        <v-text-field
          v-model="formData.password"
          prepend-inner-icon="mdi-lock"
          label="Password"
          :type="isPasswordVisible ? 'text' : 'password'"
          :append-inner-icon="isPasswordVisible ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append-inner="isPasswordVisible = !isPasswordVisible"
          :rules="[requiredValidator]"
        ></v-text-field>
      </v-col>
    </v-row>
    <v-btn class="bg-light-blue-darken-4 mt-2" type="submit" block prepend-icon="mdi-login"
      >LOGIN</v-btn
    >
  </v-form>
</template>
