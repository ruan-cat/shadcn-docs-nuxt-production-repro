<script setup lang="ts">
import { computed } from "vue";
import { useToggle } from "@vueuse/core";
import { ElButton, ElCard, ElSpace, ElTag, ElText } from "element-plus";
import { createRuntimeDescriptor, formatRuntimeDescriptor } from "@repro/shared-core";

const [expanded, toggleExpanded] = useToggle(false);
const descriptor = createRuntimeDescriptor("docs", "nuxt", "nuxt3-h3v1");
const label = computed(() => formatRuntimeDescriptor(descriptor));
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
        此组件来自独立 workspace 包，并直接消费 Element Plus、VueUse 与共享核心包。
      </ElText>
    </ElSpace>
  </ElCard>
</template>
