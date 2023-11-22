<h1 align="center">🐝💃 waggledance.ai <img src="https://img.shields.io/badge/preview-%20" /></h1>

<div align="center"

[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
![CI](https://github.com/agi-merge/waggle-dance/actions/workflows/ci.yml/badge.svg?event=push)
[![CodeQL](https://github.com/agi-merge/waggle-dance/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/agi-merge/waggle-dance/actions/workflows/github-code-scanning/codeql)
<br/>
<br/>
[![Join Discord Server](https://dcbadge.vercel.app/api/server/ttt9YmhQU6?style=flat)](https://discord.gg/ttt9YmhQU6)
[![GitHub Repo stars](https://img.shields.io/github/stars/agi-merge/waggle-dance?style=social)](https://github.com/agi-merge/waggle-dance)

</div>

<p align="center">
  <a href="#-highlighted-features">🦚Features</a> |
  <a href="#-roadmap">📍Roadmap</a> |
  <a href="#%EF%B8%8F-contribute-and-help">🛠️Contribute</a> |
  <a href="#-running-locally-and-development">🏃Run Locally</a> |
  <a href="#-open-core">🌺Open Core</a>
</p>

## Quick Start

- [![Cloud Preview](https://img.shields.io/badge/PREVIEW-waggledance.ai-blue?style=flat&logo=world&logoColor=white)](https://waggledance.ai) Try the cloud preview ↗
- <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fagi-merge%2Fwaggle-dance&env=NEXTAUTH_URL,OPENAI_API_KEY,WEAVIATE_HOST,WEAVIATE_API_KEY,WEAVIATE_SCHEME,LONG_TERM_MEMORY_INDEX_NAME,KV_URL,KV_REST_API_URL,KV_REST_API_TOKEN,KV_REST_API_READ_ONLY_TOKEN,POSTGRES_PRISMA_URL,POSTGRES_URL_NON_POOLING,EDGE_CONFIG,VECTOR_NAMESPACE_SALT,LONG_TERM_MEMORY_INDEX_NAME,EDGE_CONFIG,BLOB_READ_WRITE_TOKEN,ALLOW_API_CLIENTS&project-name=waggle-dance&repository-name=waggle-dance" alt="Deploy with Vercel"><img src="https://vercel.com/button" height="20" /></a> Deploy to Vercel
- [Build and run from source](#-running-locally-and-development)
- [Join the Discord](https://discord.gg/ttt9YmhQU6)
- ⭐️ Help with algorithm: star this repo

**waggledance.ai** is an experimental application focused on achieving user-specified goals. It provides a friendly but opinionated user interface for building agent-based systems. The project focuses on explainability, observability, concurrent generation, and exploration. Currently in pre-alpha, the development philosophy prefers experimentation over stability as goal-solving and Agent systems are rapidly evolving.

waggledance.ai takes a goal and passes it to a **Planner Agent** which streams an execution graph for sub-tasks. Each sub-task is executed as concurrently as possible by **Execution Agents**. To reduce poor results and hallucinations, sub-results are reviewed by **Criticism Agents**. Eventually, the **Human in the loop (you!)** will be able to chat with individual Agents and provide course-corrections if needed.

It was originally inspired by [Auto-GPT](https://github.com/Significant-Gravitas/Auto-GPT), and has concurrency features similar to those found in [gpt-researcher](https://github.com/assafelovic/gpt-researcher). Therefore, core tenets of the project include _speed_, _accuracy_, _observability_, and _simplicity_. Additionally, many other agentic systems are written in Python, so this project acts as a small counter-balance, and is accessible to the large number of Javascript developers.

An (unstable) API is also available via [tRPC](packages/api/src/root.ts) as well an API [implemented within Next.js](apps/nextjs/src/pages/api). The client-side is mostly responsible for orchestrating and rendering the agent executions, while the API and server-side executes the agents and stores the results. This architecture is likely to be adjusted in the future.

<p align="center">

<picture>
    <source srcset="https://github.com/agi-merge/waggle-dance/assets/906671/3380a442-05d9-48be-920f-21e9e6d8ce41" type="video/mp4">
    <source srcset="https://github.com/agi-merge/waggle-dance/assets/906671/62693a32-8a46-4a8e-ab1e-3c178fbe0dcf" type="image/gif">
    <img src="apps/nextjs/public/apple-touch-icon.png" alt="bar">
</picture>

</p>
</div>

# 🦚 Highlighted Features

- LLMs go brrr… waggledance.ai starts by planning a highly concurrent execution graph. Some sub-task branches are not dependent, and can run concurrently.
- Adversarial agents that review results.
- Vector database for long-term memory.
- Explainable results and responsive UI: Graph visualizer, sub-task (agent) results, agent logs and events.

## 🥞 Tech Stack

[Typescript](https://www.typescriptlang.org/) ﹒ [Langchain.js](https://github.com/langchain/langchain) ﹒ [T3](https://github.com/t3/t3js) ﹒ [Prisma](https://www.prisma.io/) ﹒ [tRPC](https://trpc.io/) ﹒ [Weaviate](https://www.semi.technology/developers/weaviate/current/) ﹒ [Postgres](https://www.postgresql.org/) ﹒ [OpenAI API](https://openai.com/) ﹒ [MUI Joy](https://mui.com/)

## 📍 Roadmap

[Live Project Roadmap Board](https://github.com/orgs/agi-merge/projects/1/views/1) ﹒ <a href="#%EF%B8%8F-contribute-and-help">🛠️Contribute</a>

Basically, anything and everything goes! Though [multi-agent systems have a long and storied past](https://www.turing.ac.uk/research/interest-groups/multi-agent-systems), this project is all about marrying the past techniques with the latest research.

## 📈 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=agi-merge/waggle-dance&type=Date)](https://star-history.com/#agi-merge/waggle-dance&Date)

## 🏃 Running Locally and Development

waggledance.ai can be deployed locally using Docker or manually using Node.js. Configuration of `.env` vars is required.

### Docker

`docker-compose up --build`

### Dependencies

- Required: [Node JS LTS](https://nodejs.org/en) ≧ v18.17.0 (LTS recommended)
- [pnpm](https://pnpm.io/installation) is used in examples but `npm` or `yarn` may work as well.
- Recommended: Turbo - `pnpm add turbo --global` or use `pnpx turbo` in place of `turbo` below.

### ⚙️ Configure Your Environment

- Copy `.env.example` to `.env` and configure the environment variables. For help, please [reach out on Discord](https://discord.gg/ttt9YmhQU6). See [env-schema.mjs](https://github.com/agi-merge/waggle-dance/blob/main/apps/nextjs/src/env-schema.mjs) for explicit requirements.

### 🐘 Setting up Postgres

Refer to [.env.example](https://github.com/agi-merge/waggle-dance/tree/main/.env.example) and [env-schema.mjs](https://github.com/agi-merge/waggle-dance/tree/main/apps/nextjs/env-schema.mjs) for the required environment variables.
Currently only Postgres via Prisma is supported. You can use a local Postgres instance (it is recommended to use Docker) or a cloud provider such as [Supabase](https://supabase.com).

Once you have set up, secured, and configured your Postgres, run the following commands:

```bash
pnpm db:generate
pnpm db:push
```

- `db:generate` creates the local typings and DB info from the schema.prisma file (`./packages/db/prisma/schema.prisma`).
- `db:push` pushes the schema to the database provider (PostgreSQL by default).
- Run these commands on first install and whenever you make changes to the schema.

### Run Development

```bash
turbo dev
# or
pnpm dev
```

This project was forked from [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo) [To find out more, you can check the boilerplate documentation](/docs/t3-boilerplate.md)

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

And the version that the CI runs:

```bash
SKIP_ENV_VALIDATION=true NODE_ENV=production  turbo build
```

For the rest, you will need to open the associated file and fix the errors yourself. Limit `ts-ignore` for extreme cases.

As a best practice, run `turbo lint` before starting a feature and after finishing a feature and fix any errors before sending a `PR`.

## 🛠️ Contribute and help

- Devs: [CONTRIBUTING.md](CONTRIBUTING.md)
- Star the Project!
- Join the [Discord](https://discord.gg/ttt9YmhQU6)!
- If you are not technical, you can still help improving documentation or add examples or share your user-stories with our community; any help or contribution is welcome!

## Contributors

<a href="https://github.com/agi-merge/waggle-dance/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=agi-merge/waggle-dance&max=100&columns=5" />
</a>

## 📚 Helpful Docs

- [See all markdown included in the project for more specifics!](https://github.com/search?q=repo%3Aagi-merge%2Fwaggle-dance+path%3A*.md&type=code)

#### Reading List

- [GPT best practices](https://platform.openai.com/docs/guides/gpt-best-practices)
- [Jerry Liu (LLama Index) on state & history of Agentic AI, context management](https://podcasts.apple.com/us/podcast/the-twiml-ai-podcast-formerly-this-week-in-machine/id1116303051?i=1000612216800)
- [Join the discord](https://discord.gg/ttt9YmhQU6)
- [Using AI Agents to Solve Complex Problems](https://haystack.deepset.ai/blog/introducing-haystack-agents)
- [Examples of Prompt Based Apps](https://chatgpt-prompt-apps.com/)
- [Another Example of a Prompt Based App](https://github.com/Significant-Gravitas/Auto-GPT)
- [Python Notebook/Cookbook for Tinkering/Exploring](https://github.com/openai/openai-cookbook/blob/main/apps/chatbot-kickstarter/powering_your_products_with_chatgpt_and_your_data.ipynb)
- [Constitutional AI in RLHF](https://astralcodexten.substack.com/p/constitutional-ai-rlhf-on-steroids)
- [Understand different types of memory and vector database techniques](https://www.pinecone.io/learn/hnsw/)
- [Interaction Nets](https://readonly.link/articles/https://cdn.inet.cic.run/docs/articles/programming-with-interaction-nets.md)

## 🎖️ Citations

- https://github.com/AGI-Edgerunners/Plan-and-Solve-Prompting
- https://github.com/ysymyth/tree-of-thought-llm
- Everything in Helpful Docs above

## 🤗 Special Thanks

- Maintainers and Contributors of LangChain.js
- Maintainers and Contributors of AutoGPT, AgentGPT, SuperAGI, gpt-researcher, lemon-agent
- [E2B](https://e2b.dev)
- [Agent Protocol](https://agentprotocol.ai) from AI Engineer Foundation
- [big-AGI](https://big-agi.com)
- more...

## 🌺 Open Core

The applications, packages, libraries, and the entire monorepo are freely available under the MIT license. The development process is open, and everyone is welcome to join. In the future, we may choose to develop extensions that are licensed for commercial use.
