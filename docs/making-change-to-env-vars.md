# Adding/Removing/Changing Environment Variables

`env.mjs` is the primary source of truth.

You may try running the helper script, which automates updating the files below (except `env.mjs`)

```bash
pnpm env:code:sync
```

If you are making changes, you will need to make sure all of the following have been updated:

- [Dockerfile](../Dockerfile)
- [env.mjs](../apps/nextjs/src/env.mjs) - server, client, runtimeEnv
- [.env.example](../.env.example) - example for local development
- [turbo.json](../turbo.json)
- [README.md](../README.md) - Vercel Deploy Button, only needed if changing required environment variables

Any contributions that provide automations or improvements to this process are welcome!
