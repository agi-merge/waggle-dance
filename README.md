# Waggle🐝💃Dance

## 📖 Overview

Waggle Dance is a Large Language Model (LLM) Agent swarm AGI problem solver that uses a directed acyclic graph concurrent execution model so it can run many LLMs at once, all coordinating to solve a potentially complex problem.

## 🪦 Use Case Milestones

- TBD
- Converting [x simple library] from [y language] to [z language]
- From my mom lol: "I asked the question: Using viennapres.org website, create an Android app to function as the website does. Got a detailed step by step description of what needed to be done (this definitely eliminates a huge part of business analysts jobs). But I can't do most of what needs to be done!"
- Podcast transcription. Give it the name of the podcast and optionally episode and it just... does it.

## 📂 Core Files/Folders

- `./packages/db/prisma`: [Database](#database) schema and migrations.
- `./apps/nextjs/src`: Next.js app source code.
- `./apps/nextjs/pages/api`: Next.js API routes.
- `./packages/chain/src`: Model chain business logic and backend services.

## Contribute and help

To help the project you can:

- [insert HN, indiehackers, twitter, gh, discord, sponsor].
- If you have technological skills and want to contribute to development, have a look at the open issues. If you are new you can have a look at the good-first-issue and help-wanted labels.
- If you don't have technological skills you can still help improving documentation or add examples or share your user-stories with our community, any help and contribution is welcome!

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

## 🦑 Linting

Make sure you install the recommended extensions in the solution, particularly `es-lint`.

Linting is run on each build and can fail builds.

To get a full list of linting errors run:

```bash
pnpm lint
```

Some of these may be able to be auto-fixed with:

```bash
pnpm lint:fix
```

for the rest, you will need to open the associated file and fix the errors yourself. Limit `ts-ignore` for extreme cases.

As a best practice, run `pnpm lint` before starting a feature and after finishing a feature and fix any errors before sending a `PR`.

### Side Note

#### Memory Usage

You might find that your `VS Code` editor is running slow and potentially missing linting errors and or saving files slowly. This is likely an indicator that you need to increase the max allowable memory for the `VS Code TS Server`.

Update your workspace settings with something like:

```
"typescript.tsserver.maxTsServerMemory": 6144
```

For example. The default value is 3072.

[Thanks Andre](https://www.youtube.com/watch?v=xgcLDX7sdV0&ab_channel=Andr%C3%A9Casal).

Some [context](https://github.com/t3-oss/create-t3-turbo/issues/277).

#### Project Wide Problems

Enable the following in `.vscode/settings.json` in order to get project wide problem analytics outside of running `pnpm lint`:

```
"typescript.tsserver.experimental.enableProjectDiagnostics": true
```

## 🏗️ CICD

Commits/PRs to the `main` branch will trigger Vercel deploys.

TODO: If desired, figure out a scheme to provide access to vercel builds (not sure if they have a curated/low-access way to do that) and add a helpful link here. Else, keep the keys ot the castle and remove this note.

## Contribute

Contributions are always welcome! Please read the [contribution guidelines](./CONTRIBUTING.md) first.

## 📝 Notes

### Helpful Docs

- [See all markdown included in the project for more specifics!](https://github.com/search?q=repo%3Aagi-merge%2Fwaggle-dance+path%3A*.md&type=code)
  Some resources to help you get oriented to the concepts used in the solution.

- [Jerry Liu (LLama Index) on state & history of Agentic AI, context management](https://podcasts.apple.com/us/podcast/the-twiml-ai-podcast-formerly-this-week-in-machine/id1116303051?i=1000612216800)
- [Join the discord](https://discord.gg/Rud2fR3hAX)
- [Using AI Agents to Solve Complex Problems](https://haystack.deepset.ai/blog/introducing-haystack-agents)
- [Examples of Prompt Based Apps](https://chatgpt-prompt-apps.com/)
- [Another Example of a Prompt Based App](https://github.com/Significant-Gravitas/Auto-GPT)
- [Python Notebook/Cookbook for Tinkering/Exploring](https://github.com/openai/openai-cookbook/blob/main/apps/chatbot-kickstarter/powering_your_products_with_chatgpt_and_your_data.ipynb)
- [LangChain Docs - This lib is the main wrapper around Open AI for this app](https://js.langchain.com/docs/)
- [Constitional AI in RLHF](https://astralcodexten.substack.com/p/constitutional-ai-rlhf-on-steroids)
- [Understand different types of memory and vector database techniques](https://www.pinecone.io/learn/hnsw/)

## Citations

-

## Special Thanks

-
