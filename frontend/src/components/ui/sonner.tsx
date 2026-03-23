import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'hsl(0 0% 100%)',
          border: '1px solid hsl(35 35% 82%)',
          color: 'hsl(30 16% 25%)',
        },
      }}
    />
  )
}
