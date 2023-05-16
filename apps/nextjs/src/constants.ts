export const app = {
  name: "🐝💃.ai",
  description: "Automate complex tasks with swarms of LLMs",
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? "04.20.23-alpha",
  localStorageKeys: {
    goal: "AGI:MERGE:GOAL:STORE",
  },
  routes: {
    home: "/",
    refine: "/add-documents",
    configure: "/waggle-dance",
    done: "/waggle-dance", // TODO: think this needs its own route to go with its breadcrumb
  }
};
