import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold font-ui transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-white',
        secondary: 'border-transparent bg-brand-card text-white',
        borrador: 'border-brand-border bg-brand-border/30 text-brand-muted',
        pendiente: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
        activo: 'border-green-500/50 bg-green-500/10 text-green-400',
        rechazado: 'border-red-500/50 bg-red-500/10 text-red-400',
        finalizado: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
        pagado: 'border-green-500/50 bg-green-500/10 text-green-400',
        cancelado: 'border-red-500/50 bg-red-500/10 text-red-400',
        outline: 'text-foreground border-brand-border',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
