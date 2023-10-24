# waggledance.ai's Agent Protocol Implementation Notes

> `AP=Agent Protocol` <br /> context: [OpenAPI](/apps/nextjs/lib/AgentProtocol/openapi.json)

> `WD=waggledance.ai` <br /> context: [Prisma Schema]()
> (OpenAPI coming soon)

## AP↔WD Mappings

- AP:Task ~= WD:(Goal+Execution)
- AP:Step ~= WD:ExecutionNode
- AP:Artifact ~= WD:Execution

## AP↔WD Incongruencies

- Scoping

  - AP: `/ap/v1/agent/tasks` there is no way to reuse configuration, except by passing it to each task as `additional_input` and risking inability to interface without looking up each conforming agent's expectations for `additional_input`
  - AP: `workspace` is mentioned but only in the `relative_path` of `Artifact` -- there is no way to set it, currently (?)

  - WD: uses the `Goal` container to share some common configuration, such as the `Goal` prompt, (and planned:) certain types of persistent data, `Skill` access, etc.
  - WD: `namespace` (e.g. `xyz`, `xyz_1.1`, `zyx`) is used to scope memory access,
  - WD: `Skills` are planned to require certain user-configurable permissions. e.g. temporary code execution, requires human intervention, read-only, risk-based, etc.

- Parallelism:
  - WD: Parallelism is built in to the `ExecutionGraph`.
  - WD: When conforming to AP, parallelism is currently reduced to serial. 👎
  - AP: parallelism has to be implemented in another layer, or possibly(?) with `additional_input`

Opinions ([@jondwillis](https://github.com/jondwillis)):

- After some thought, additional_input should be discouraged as it will make each agent's API unique and difficult to interface with.

  - is there even a way around this?

- There is no way to create an agent, despite it being in the API route.

- Artifact is a poor abstraction, or at least needs to have a content-type

- Some kind of scoping or containerization may be beneficial. Again, `additional_input` would be the only way.

- The "any"/"object" typings feel bad. Why not formalize a schema, or return strings?

# Suggestions

- Make use of [OpenAPI extensions](https://swagger.io/docs/specification/openapi-extensions/) to
