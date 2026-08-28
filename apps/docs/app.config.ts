const repositoryUrl = "https://github.com/ruan-cat/shadcn-docs-nuxt-production-repro";

export default defineAppConfig({
  shadcnDocs: {
    site: {
      name: "shadcn-docs-nuxt 生产复现实验室",
      description: "在生产级 pnpm monorepo 中复现 Nuxt Content、Nitro、H3、workspace 与部署边界故障。",
    },
    theme: {
      customizable: true,
      color: "stone",
      radius: 0.5,
    },
    header: {
      title: "生产复现实验室",
      showTitle: true,
      darkModeToggle: true,
      links: [
        {
          icon: "lucide:github",
          to: repositoryUrl,
          target: "_blank",
        },
      ],
    },
    aside: {
      useLevel: true,
      collapse: false,
    },
    main: {
      breadCrumb: true,
      showTitle: true,
    },
    footer: {
      credits: "所有结论均要求 control、单变量和运行时证据。",
    },
    toc: {
      enable: true,
      title: "本页目录",
    },
    search: {
      enable: true,
      inAside: false,
    },
  },
});
