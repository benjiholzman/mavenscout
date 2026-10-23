import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run dev:lan` serves over HTTPS on the local network (self-signed
// certificate) so a phone can open the app: browsers allow the microphone and
// crypto.subtle (used by the testimonial code check) only on secure origins.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'lan' ? [basicSsl()] : [])],
}))
