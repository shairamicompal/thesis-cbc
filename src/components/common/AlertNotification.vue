<script setup>
 const props = defineProps(['formSuccessMessage', 'formErrorMessage'])

</script>

<template>
     <v-alert
    v-if="props.formSuccessMessage" 
    :text="props.formSuccessMessage" 
    title="Success!"
    type="success" 
    variant="tonal" 
    density="compact" 
    border="start" 
    closable
  ></v-alert>

  <v-alert
    v-if="props.formErrorMessage" 
    :text="props.formErrorMessage" 
    title="Ooops!"
    type="error" 
    density="compact" 
    border="start" 
    closable
    class="mt-2"
  ></v-alert>

</template>