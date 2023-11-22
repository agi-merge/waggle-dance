# Adding/Removing/Changing Environment Variables

If you are making changes, you will need to make sure all of the following have been updated:

- [Dockerfile](../Dockerfile)
- [env.mjs](../apps/nextjs/src/env.mjs) - server, client, runtimeEnv
- [.env.example](../.env.example) - example for local development
- [turbo.json](../turbo.json)
- [README.md](../README.md) - Vercel Deploy Button, only needed if changing required environment variables

Any contributions that provide automations or improvements to this process are welcome!