<h1 align="center">Waggle🐝💃Dance</h1>

**Waggle Dance** is an experimental concurrent LLM agent goal solver powered by [Langchain.js](https://github.com/hwchase17/langchainjs). It is a [MIT-licensed](/LICENSE) T3, Next.js, monorepo.
<div align="center">

![License](https://img.shields.io/badge/license-MIT-green)
![CI](https://github.com/agi-merge/waggle-dance/actions/workflows/ci.yml/badge.svg?event=push)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fagi-merge%2Fwaggle-dance&env=OPENAI_API_KEY&project-name=waggle-dance&repository-name=waggle-dance)
</div>

<div align="center">

[![Join our Discord server!](https://invidget.switchblade.xyz/Rud2fR3hAX)](http://discord.gg/2FB8wDG)


https://github.com/agi-merge/waggle-dance/assets/906671/1f868edc-0ada-4576-9798-95dbbae6ffb2
</div>


## Table of Contents

- [Overview](#-overview)
- [Use Case Milestones](#-use-case-milestones)
- [Core Files/Folders](#-core-filesfolders)
- [Contribute and Help](#contribute-and-help)
- [How to Run](#%EF%B8%8F-how-to-run)
- [Linting](#-linting)
- [CICD](#%EF%B8%8F-cicd)
- [Contribute](#contribute)
- [Benchmarks](#-benchmarks)
- [Helpful Docs](#helpful-docs)
- [Citations](#citations)
- [Special Thanks](#special-thanks)
- [Open Core](#open-core)

# Main Features

- Highly concurrent execution graph. Some sub-tasks are not dependent, and can be run concurrently.
- Adversarial agents that review results
- [Free Public deployment](https://waggledance.ai)
- Agent data connections, e.g. GitHub, Google Drive, Databases, etc.
- Vector database for long-term memory
- Tools, e.g. Zapier, Web Search, Code-improvement, etc.\*
- Templates and sharing\*

## 📍 Roadmap

- Tree of thought
- See more: [Project Roadmap](https://github.com/orgs/agi-merge/projects/1/views/1)

## 🪦 Use Case Milestones

As of June 6, 2023, these are not yet achieved.

- Create a statistically likely to be successful Hacker News post title suggestion. Determine the most successful types of Show HN titles in the last three months, with a special focus on AI produts.
- Upload [x format document] report of multi-family housing in the [y metro] area, citing reliable sources and
- Convert [x simple library] from [y language] to [z language]
- Develop and create a pull request for [x feature] to the project at [y git url]

## 🛠️ Contribute and help

To help the project you can:

- [insert HN, indiehackers, twitter, gh, discord, sponsor].
- If you have technological skills and want to contribute to development, have a look at the open issues. If you are new you can have a look at the good-first-issue and help-wanted labels.
- If you don't have technological skills you can still help improving documentation or add examples or share your user-stories with our community, any help and contribution is welcome!

## 🏃 Running Locally and Developing

Waggle Dance can be deployed using Docker or manually using Node.js. Configuration of `.env` vars is required.

### Docker

`docker-compose build && docker-compose up`

### Dependencies

- [Node JS LTS](https://nodejs.org/en)
- [pnpm](https://pnpm.io/installation)
- Turbo - `pnpm add turbo --global` or use `npx turbo` in place of `turbo` below.

### Run Development build

```bash
turbo dev
```

### ⚙️ Environment

- Copy `.env.example` to `.env` and configure the environment variables.

### 🐘 Primary Database

The T3 stack includes Prisma. Currently we are using Postgres. The database is used as the source-of-truth of the state of an app deployment. E.g. sessions, accounts, any saved goals/results, etc.

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
turbo dev
```

## 📂 Core Files/Folders

- `./packages/db/prisma`: [Database](#database) schema and migrations.
- `./apps/nextjs/src`: Next.js app source code.
- `./apps/nextjs/pages/api`: Next.js API routes.
- `./packages/chain/src`: Model chain business logic and backend services.

## 🦑 Linting

Make sure you install the recommended extensions in the solution, particularly `es-lint`.

Linting is run on each build and can fail builds.

To get a full list of linting errors run:

```bash
turbo lint
```

Some of these may be able to be auto-fixed with:

```bash
turbo lint:fix
```

for the rest, you will need to open the associated file and fix the errors yourself. Limit `ts-ignore` for extreme cases.

As a best practice, run `turbo lint` before starting a feature and after finishing a feature and fix any errors before sending a `PR`.

## 📚 Helpful Docs

- [See all markdown included in the project for more specifics!](https://github.com/search?q=repo%3Aagi-merge%2Fwaggle-dance+path%3A*.md&type=code)

#### Some resources to help you get oriented to the concepts used .

- [GPT best practices](https://platform.openai.com/docs/guides/gpt-best-practices)
- [Jerry Liu (LLama Index) on state & history of Agentic AI, context management](https://podcasts.apple.com/us/podcast/the-twiml-ai-podcast-formerly-this-week-in-machine/id1116303051?i=1000612216800)
- [Join the discord](https://discord.gg/Rud2fR3hAX)
- [Using AI Agents to Solve Complex Problems](https://haystack.deepset.ai/blog/introducing-haystack-agents)
- [Examples of Prompt Based Apps](https://chatgpt-prompt-apps.com/)
- [Another Example of a Prompt Based App](https://github.com/Significant-Gravitas/Auto-GPT)
- [Python Notebook/Cookbook for Tinkering/Exploring](https://github.com/openai/openai-cookbook/blob/main/apps/chatbot-kickstarter/powering_your_products_with_chatgpt_and_your_data.ipynb)
- [Constitutional AI in RLHF](https://astralcodexten.substack.com/p/constitutional-ai-rlhf-on-steroids)
- [Understand different types of memory and vector database techniques](https://www.pinecone.io/learn/hnsw/)

## 🎖️ Citations

- https://github.com/AGI-Edgerunners/Plan-and-Solve-Prompting
- https://github.com/ysymyth/tree-of-thought-llm
- Everything in Helpful Docs above

## 🤗 Special Thanks

- Maintainers and Contributors of Langchain.js
- Maintainers and Contributors of AutoGPT, AgentGPT
- big-AGI
- more...

## 🌺 Open Core

The applications, packages, libraries, and the entire monorepo are freely available under the MIT license. The development process is open, and everyone is welcome to join. In the future, we may choose to develop extensions that are licensed for commercial use.
