import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces'
import '@fontsource/lora/400.css'
import '@fontsource/lora/700.css'
import '@fontsource/opendyslexic/400.css'
import '@fontsource/opendyslexic/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GlobalErrorBoundary } from './components/shell/GlobalErrorBoundary.tsx'
import { isSupabaseConfigured } from './lib/supabaseClient.ts'
import ConfigurationErrorPage from './pages/ConfigurationErrorPage.tsx'

const root = createRoot(document.getElementById('root')!)

root.render(
  <StrictMode>
    <GlobalErrorBoundary>
      {isSupabaseConfigured ? <App /> : <ConfigurationErrorPage />}
    </GlobalErrorBoundary>
  </StrictMode>,
)
