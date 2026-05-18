import { preview } from 'vite'
import { viteConfig } from './vite-shared.mjs'

const server = await preview(viteConfig)
server.printUrls()
