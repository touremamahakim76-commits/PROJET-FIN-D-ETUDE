import react from '@vitejs/plugin-react'

export const viteConfig = {
  root: process.cwd(),
  configFile: false,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    open: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
}
