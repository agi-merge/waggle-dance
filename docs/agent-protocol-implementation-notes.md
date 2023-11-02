# waggledance.ai's Agent Protocol Implementation Notes

> `AP=Agent Protocol` <br /> context: [OpenAPI](/apps/nextjs/lib/AgentProtocol/openapi.json)

> `WD=waggledance.ai` <br /> context: [Prisma Schema](/packages/db/prisma/schema.prisma)
> (OpenAPI coming soon)

## AP↔WD Mappings

- AP:Task ~= WD:(Goal+Execution)
- AP:Step ~= WD:ExecutionNode
- AP:Artifact ~= WD:Result

## Problems

- Usage w/ Authentication?

```ts
GET /ap/v1/agent/tasks
// WD: returns executions, may return executions from other Goals (which are effectively other Agents)
```

AP: assumes there can only be one Agent in a system. Isolation would currently have to be done w/ `additional_input`

## AP↔WD Incongruencies

- Scoping

  - AP: `/ap/v1/agent/tasks` there is no way to reuse configuration, except by passing it to each task as `additional_input` and risking inability to interface without looking up each conforming agent's expectations for `additional_input`
  - AP: `workspace` is mentioned but only in the `relative_path` of `Artifact` -- there is no way to set it, currently (?)

  - WD: uses the `Goal` container to share some common configuration, such as the `Goal` prompt, (and planned:) certain types of persistent data, `Skill` access, etc.
  - WD: `namespace` (e.g. `xyz`, `xyz_1.1`, `zyx`) is used to scope memory access,
  - WD: `Skills` are planned to require certain user-configurable permissions. e.g. temporary code execution, requires human intervention, read-only, risk-based, etc.

- Parallelism:
  - WD: Parallelism is possible both by creating multiple `Execution` and also possible with the structure of `ExecutionGraph`.
  - WD: When conforming to AP, parallelism is currently reduced to serial. 👎
  - AP: parallelism has to be implemented in another layer, or possibly(?) with `additional_input`

Opinions ([@jondwillis](https://github.com/jondwillis)):

- After some thought, `additional_input` should be discouraged as it will make each agent's API unique and difficult to interface with.

  - is there even a way around this?

- I found it weird that there is no way to create an Agent, despite it being in the API route, and the name of the entire protocol!

- `Artifact` is a weak abstraction, or at least needs to have a content-type

- Some kind of scoping or containerization may be beneficial. Again, `additional_input` would be the only way.

- The "any"/"object" typings feel bad. Why not formalize/allow configuring a schema, or return strings?

# Suggestions

- Modify the conformance test.sh and local_test.sh to allow headers for setting auth tokens, cookies, etc.
- Make use of [OpenAPI extensions](https://swagger.io/docs/specification/openapi-extensions/) to remove additional_input which may be hard to find per-agent documentation for, and use.
