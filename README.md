# 🐝 💃 Waggle Dance

## 📖 Overview

Waggle Dance is a GPT-4 agent swarm AGI problem solver that uses a directed acyclic graph concurrent execution model so it can run up to 64 instances of GPT-4 all coordinating to solve a complex problem.

## 📂 Core Files/Folders

- `./packages/db/prisma`: Database schema and migrations.
- `./apps/nextjs/src`: Next.js app source code.
- `./apps/nextjs/pages/api`: Next.js API routes.
- `./packages/chain/src`: Model chain business logic and backend services.

## 🏃 How to Run

### Dependencies

- [Node JS LTS](https://nodejs.org/en)
- [pnpm](https://pnpm.io/installation)

### Install

```bash
pnpm i
```

### Configure

- Copy `.env.example` to `.env` and configure the environment variables.

### Database

```bash
pnpm db:generate
pnpm db:push
```

- `db:generate` creates the local typings and DB info from the schema.prisma file (`./packages/db/prisma/schema.prisma`).
- `db:push` pushes the schema to the database provider (PostgreSQL by default).
- Run these commands on first install and whenever you make changes to the schema.

### Run Development

```bash
pnpm dev
```

## 🏗️ CICD

TODO: Add CICD/Build instructions.

## 📝 Notes

### Helpful Docs

Some resources to help you get oriented to the concepts used in the solution.

- [Using AI Agents to Solve Complex Problems](https://haystack.deepset.ai/blog/introducing-haystack-agents)
- [Examples of Prompt Based Apps](https://chatgpt-prompt-apps.com/)
- [Another Example of a Prompt Based App](https://github.com/Significant-Gravitas/Auto-GPT)
- [Python Notebook/Cookbook for Tinkering/Exploring](https://github.com/openai/openai-cookbook/blob/main/apps/chatbot-kickstarter/powering_your_products_with_chatgpt_and_your_data.ipynb)
- [Balamb Docs - See Why It's Useful Section](https://www.npmjs.com/package/balamb)
- [LangChain Docs - This lib is the main wrapper around Open AI for this app](https://js.langchain.com/docs/)

### CM Thoughts

- Maybe move WaggleDanceMachine into a `features` folder
- Create a centralized `models` folder with shared types - can have centralized for whole app as well as those specific to a feature (like WaggleDanceMachine)

```
src
├── components
├── models
├── features
│   ├── waggle-dance-machine
│   │   ├── components
│   │   ├── models
```
