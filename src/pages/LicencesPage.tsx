import { Link } from 'react-router-dom'
import { focusRing } from '../components/shell/navItems.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function LicencesPage() {
  useDocumentTitle('Font licences')

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-3xl text-ink">Font licences</h1>
      <p className="text-sm text-muted">
        Voxly self-hosts the reading and interface fonts below. This page lists their licences and required notices.
      </p>

      <section className="rounded-xl border border-line bg-bg p-4">
        <h2 className="font-serif text-lg text-ink">Fraunces</h2>
        <p className="mt-2 text-sm text-ink">
          Copyright 2018–2021 The Fraunces Project Authors (https://github.com/undercasetype/Fraunces)
        </p>
        <p className="mt-2 text-sm text-ink">
          Licensed under the SIL Open Font License, Version 1.1. This Font Software is distributed on an “AS IS” basis,
          without warranties or conditions of any kind, either express or implied. See the SIL Open Font License for the
          specific language, permissions and limitations governing use.
        </p>
      </section>

      <section className="rounded-xl border border-line bg-bg p-4">
        <h2 className="font-serif text-lg text-ink">Lora</h2>
        <p className="mt-2 text-sm text-ink">Copyright 2011 The Lora Project Authors (https://github.com/cyrealtype/Lora)</p>
        <p className="mt-2 text-sm text-ink">Licensed under the SIL Open Font License, Version 1.1.</p>
      </section>

      <section className="rounded-xl border border-line bg-bg p-4">
        <h2 className="font-serif text-lg text-ink">Inter</h2>
        <p className="mt-2 text-sm text-ink">Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter)</p>
        <p className="mt-2 text-sm text-ink">Licensed under the SIL Open Font License, Version 1.1.</p>
      </section>

      <section className="rounded-xl border border-line bg-bg p-4">
        <h2 className="font-serif text-lg text-ink">OpenDyslexic</h2>
        <p className="mt-2 text-sm text-ink">
          Copyright (c) 2012 by Abelardo Gonzalez. Based on Bitstream Vera Sans Copyright (c) 2003 by Bitstream, Inc.
        </p>
        <p className="mt-2 text-sm text-ink">
          OpenDyslexic is available under the Bitstream Vera License and Creative Commons Attribution 3.0 Unported (CC BY
          3.0). You may use, study, modify, and redistribute the font under those terms. Attribution: OpenDyslexic by
          Abelardo Gonzalez — opendyslexic.org.
        </p>
      </section>

      <p className="text-sm text-muted">
        <Link to="/login" className={`font-medium text-coral ${focusRing}`}>
          Back
        </Link>
      </p>
    </div>
  )
}
