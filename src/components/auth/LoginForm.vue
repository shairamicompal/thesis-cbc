<template>
  <v-form fast-fail @submit.prevent>
    <v-text-field label="Email" variant="outlined"></v-text-field>

    <v-text-field label="Password" variant="outlined" type="password"></v-text-field>

    <v-btn class="bg-light-blue-darken-4" type="submit" block prepend-icon="mdi-login">LOGIN</v-btn>
  </v-form>
</template>
