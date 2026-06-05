'use client'

import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-brand-card group-[.toaster]:text-white group-[.toaster]:border-brand-border group-[.toaster]:shadow-2xl',
          description: 'group-[.toast]:text-brand-muted',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-white',
          cancelButton: 'group-[.toast]:bg-brand-border group-[.toast]:text-brand-muted',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
