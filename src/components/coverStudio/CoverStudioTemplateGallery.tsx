import { COVER_TEMPLATES } from '../../lib/coverStudio/templates.generated.ts'
import { focusRing } from '../shell/navItems.ts'

type CoverStudioTemplateGalleryProps = {
  onApply: (templateId: string) => void
}

const categories = [...new Set(COVER_TEMPLATES.map((t) => t.category))]

export function CoverStudioTemplateGallery({ onApply }: CoverStudioTemplateGalleryProps) {
  return (
    <section className="flex flex-col gap-3" data-testid="cover-template-gallery" aria-label="Templates">
      <h2 className="font-serif text-lg text-ink">Templates</h2>
      {categories.map((category) => (
        <div key={category} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted">{category}</h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COVER_TEMPLATES.filter((t) => t.category === category).map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => onApply(template.id)}
                  className={`flex min-h-11 w-full flex-col rounded-xl border border-line bg-bg p-2 text-left text-sm ${focusRing}`}
                >
                  <span
                    className="mb-1 aspect-[2/3] w-full rounded-lg border border-line/50"
                    style={{ backgroundColor: template.design.background.type === 'solid' ? template.design.background.color : '#3d2c24' }}
                    aria-hidden
                  />
                  <span className="truncate font-medium text-ink">{template.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
