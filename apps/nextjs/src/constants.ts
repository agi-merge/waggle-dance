// app/nextjs/src/constants.ts

export const app = {
  name: "waggledance.ai",
  description: "Automate complex tasks with swarms of LLMs",
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? "05.24.23-alpha",
  localStorageKeys: {
    goal: "AGI:MERGE:GOAL:STORE",
    preferences: "AGI:MERGE:PREFERENCES:STORE",
    waggleDance: "AGI:MERGE:WAGGLE:DANCE:STORE",
  },
  routes: {
    home: "/",
    goal: (id: string): string => { return `/goal/${id}` },
    refine: "/add-documents",
    donate: "https://www.patreon.com/agimerge",
  }
};
