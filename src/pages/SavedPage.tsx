import { Navigate } from 'react-router-dom'

/** Saved lives under Library tab. */
export default function SavedPage() {
  return <Navigate to="/library?tab=saved" replace />
}
