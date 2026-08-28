<script setup lang="ts">
import { computed, ref } from "vue";

const expanded = ref(false);
const descriptor = {
  application: "docs",
  runtime: "nuxt",
  generation: "nuxt3-h3v1",
} as const;
const label = computed(
  () => `${descriptor.application}:${descriptor.runtime}:${descriptor.generation}`,
);
</script>

<template>
  <section class="repro-runtime-card">
    <p><strong>docs 本地等价 UI 已进入 SSR 图</strong></p>
    <p>{{ label }}</p>
    <button type="button" @click="expanded = !expanded">
      {{ expanded ? "收起运行时说明" : "展开运行时说明" }}
    </button>
    <p v-if="expanded">
      此组件位于 docs 应用内部，用来保留交互与 SSR 探针，但不消费 @repro/ui workspace 包。
    </p>
  </section>
</template>
