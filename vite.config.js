import { defineConfig, transformWithOxc } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 8 uses Rolldown/oxc, which disables JSX parsing in `.js` files.
// This pre-transform plugin runs oxc with the JSX loader on our `.js`
// source files so components can use the `.js` extension.
const transformJsxInJs = () => ({
  name: 'transform-jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    if (!id.includes('/src/') || !/\.js(\?.*)?$/.test(id)) {
      return null
    }
    return await transformWithOxc(code, id, { lang: 'jsx' })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), transformJsxInJs()],
})
