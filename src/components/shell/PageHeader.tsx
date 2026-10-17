import { useEffect } from 'react'

export function PageHeader({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} · Voxly`
  }, [title])

  return <h1 className="text-4xl text-ink">{title}</h1>
}
