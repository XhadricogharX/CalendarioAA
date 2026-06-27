import {
  PROVINCES,
  PROVINCE_ORDER,
  CATEGORIES,
  CATEGORY_ORDER,
  type ProvinceFilter,
  type CategoryFilter,
} from '../lib/types'
import { IconMapPin, IconList, IconGrid } from './icons'

export type CalendarView = 'month' | 'list'

interface FilterBarProps {
  province: ProvinceFilter
  onProvinceChange: (p: ProvinceFilter) => void
  category: CategoryFilter
  onCategoryChange: (c: CategoryFilter) => void
  view: CalendarView
  onViewChange: (v: CalendarView) => void
}

const selectClass =
  'cursor-pointer rounded-full border border-hairline bg-page px-4 py-2 text-sm font-semibold text-title transition-colors hover:border-forest/40 focus:border-mint-600 focus:outline-none focus:ring-2 focus:ring-mint/40'

export function FilterBar({
  province,
  onProvinceChange,
  category,
  onCategoryChange,
  view,
  onViewChange,
}: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5 border-b border-hairline pb-4">
      <span className="flex items-center gap-1.5 text-sm font-semibold text-content/65">
        <IconMapPin className="h-4 w-4 text-mint-600" />
        Eventos
      </span>

      <select
        aria-label="Filtrar por provincia"
        value={province}
        onChange={(e) => onProvinceChange(e.target.value as ProvinceFilter)}
        className={selectClass}
      >
        <option value="all">Todas las provincias</option>
        {PROVINCE_ORDER.map((p) => (
          <option key={p} value={p}>
            {PROVINCES[p]}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrar por tipo de evento"
        value={category}
        onChange={(e) => onCategoryChange(e.target.value as CategoryFilter)}
        className={selectClass}
      >
        <option value="all">Todos los tipos</option>
        {CATEGORY_ORDER.map((c) => (
          <option key={c} value={c}>
            {CATEGORIES[c].label}
          </option>
        ))}
      </select>

      {/* Conmutador Mes / Lista */}
      <div className="ml-auto inline-flex rounded-full border border-hairline p-0.5">
        <ViewButton
          active={view === 'month'}
          onClick={() => onViewChange('month')}
          label="Vista de mes"
        >
          <IconGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Mes</span>
        </ViewButton>
        <ViewButton
          active={view === 'list'}
          onClick={() => onViewChange('list')}
          label="Vista de lista"
        >
          <IconList className="h-4 w-4" />
          <span className="hidden sm:inline">Lista</span>
        </ViewButton>
      </div>
    </div>
  )
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? 'bg-forest text-cream'
          : 'text-content/70 hover:text-title'
      }`}
    >
      {children}
    </button>
  )
}
