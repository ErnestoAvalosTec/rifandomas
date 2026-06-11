'use client'

import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectFilterProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (values: string[]) => void
  allLabel: string
  className?: string
}

// Listbox de selección múltiple. selected vacío = "todos" (sin filtro).
export function MultiSelectFilter({ options, selected, onChange, allLabel, className }: MultiSelectFilterProps) {
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  let label: string = allLabel
  if (selected.length === 1) {
    label = options.find((o) => o.value === selected[0])?.label ?? allLabel
  } else if (selected.length > 1) {
    label = `${selected.length} seleccionados`
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui transition-colors cursor-pointer max-w-[200px]',
            selected.length > 0 ? 'bg-primary text-white' : 'bg-brand-card border border-brand-border text-brand-muted hover:text-white',
            className
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto min-w-[200px]">
        <DropdownMenuCheckboxItem
          checked={selected.length === 0}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={() => onChange([])}
        >
          {allLabel}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.value}
            checked={selected.includes(opt.value)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle(opt.value)}
          >
            <span className="truncate">{opt.label}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
