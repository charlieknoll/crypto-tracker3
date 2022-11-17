<template>
  <div style="min-width: 220px; display: inline-block" class="q-mr-sm">
    <!-- Change :value to :model-value and @change to @update:model-value -->
    <q-select
      virtual-scroll-slice-size="10"
      transition-duration="100"
      filled
      clearable
      use-chips
      multiple
      stack-label
      :model-value="modelValue"
      :options="options"
      @update:model-value="$emit('update:modelValue', $event)"
      v-bind="$attrs" />
  </div>
</template>
<script setup>
const props = defineProps({
  modelValue: {
    required: true,
  },
  options: {
    type: [Array],
    default: () => [],
  },
});
const emit = defineEmits(['update:modelValue']);
</script>
