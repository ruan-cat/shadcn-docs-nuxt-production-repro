<script setup lang="ts">
import { computed } from "vue";
import { useToggle } from "@vueuse/core";
import { ElButton, ElCard, ElSpace, ElTag, ElText } from "element-plus";

const [expanded, toggleExpanded] = useToggle(false);
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
  <ElCard shadow="never" class="repro-runtime-card">
    <ElSpace direction="vertical" alignment="start">
      <ElTag type="success">workspace UI 已进入 SSR 图</ElTag>
      <ElText>{{ label }}</ElText>
      <ElButton size="small" @click="toggleExpanded()">
        {{ expanded ? "收起运行时说明" : "展开运行时说明" }}
      </ElButton>
      <ElText v-if="expanded">
        此组件来自独立 workspace 包，并直接消费 Element Plus 与 VueUse。
      </ElText>
    </ElSpace>
  </ElCard>
</template>
