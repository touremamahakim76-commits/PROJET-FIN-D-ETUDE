import { createServer } from 'vite'
import { viteConfig } from './vite-shared.mjs'

const server = await createServer(viteConfig)
await server.listen()
server.printUrls()
