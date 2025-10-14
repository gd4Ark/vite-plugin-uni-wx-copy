<template>
  <button class="app-btn-v2" @click="onClick">
    <slot>按钮</slot>
  </button>
</template>

<script setup lang="ts">
import { defineEmits } from 'vue'

const emit = defineEmits(['click'])

function onClick(e: Event) {
  emit('click', e)
}
</script>

<style scoped>
.app-btn-v2 {
  padding: 12rpx 40rpx;
  background: #007aff;
  color: #fff;
  border: none;
  border-radius: 16rpx;
  font-size: 32rpx;
}
</style>
