import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isSupabaseConfigured } from './lib/supabaseClient.ts'
import ConfigurationErrorPage from './pages/ConfigurationErrorPage.tsx'

const root = createRoot(document.getElementById('root')!)

root.render(
  <StrictMode>
    {isSupabaseConfigured ? <App /> : <ConfigurationErrorPage />}
  </StrictMode>,
)
