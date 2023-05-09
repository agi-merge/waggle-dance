# Waggle🐝💃Dance

## 📖 Overview

Waggle Dance is a Large Language Model (LLM) Agent swarm AGI problem solver that uses a directed acyclic graph concurrent execution model so it can run many LLMs at once, all coordinating to solve a potentially complex problem.

## Use Case Milestones

- TBD
- Converting [x simple library] from [y language] to [z language]
- From my mom lol: "I asked the question: Using viennapres.org website, create an Android app to function as the website does. Got a detailed step by step description of what needed to be done (this definitely eliminates a huge part of business analysts jobs). But I can't do most of what needs to be done!"

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

### ⚙️ Environment

- Copy `.env.example` to `.env` and configure the environment variables.

### 🐘 Primary Database

Prisma adds a layer of abstraction over a database. The database is used as the source-of-truth of the state of an app deployment. E.g. sessions, accounts, any saved chains/results, etc.

Note that this is different than the user's uploaded documents, however it may store metadata about the documents.

```bash
pnpm db:generate
pnpm db:push
```

- `db:generate` creates the local typings and DB info from the schema.prisma file (`./packages/db/prisma/schema.prisma`).
- `db:push` pushes the schema to the database provider (PostgreSQL by default).
- Run these commands on first install and whenever you make changes to the schema.

### Run Development

This is a t3 stack. [You can check the boilerplate documentation](/docs/create-t3-boilerplate.md)
```bash
pnpm dev
```

## 🏗️ CICD

TODO: Add CICD/Build instructions.

## 📝 Notes

### Helpful Docs

Some resources to help you get oriented to the concepts used in the solution.

- [Jerry Liu (LLama Index) on state & history of Agentic AI, context management](https://podcasts.apple.com/us/podcast/the-twiml-ai-podcast-formerly-this-week-in-machine/id1116303051?i=1000612216800)
- [Join the discord](https://discord.gg/Rud2fR3hAX)
- [Using AI Agents to Solve Complex Problems](https://haystack.deepset.ai/blog/introducing-haystack-agents)
- [Examples of Prompt Based Apps](https://chatgpt-prompt-apps.com/)
- [Another Example of a Prompt Based App](https://github.com/Significant-Gravitas/Auto-GPT)
- [Python Notebook/Cookbook for Tinkering/Exploring](https://github.com/openai/openai-cookbook/blob/main/apps/chatbot-kickstarter/powering_your_products_with_chatgpt_and_your_data.ipynb)
- [Balamb Docs - See Why It's Useful Section](https://www.npmjs.com/package/balamb)
- [LangChain Docs - This lib is the main wrapper around Open AI for this app](https://js.langchain.com/docs/)
- [Constitional AI in RLHF](https://astralcodexten.substack.com/p/constitutional-ai-rlhf-on-steroids)
- [Understand different types of memory and vector database techniques](https://www.pinecone.io/learn/hnsw/)

## Citations

-

## Special Thanks

-
