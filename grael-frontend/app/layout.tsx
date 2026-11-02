import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title:       'Expreso Machupicchu - Plataforma de Gestión Logística',
  description: 'Administración operativa de Expreso Machupicchu',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0e3257',
              color: '#fff',
              fontSize: '13px',
              borderRadius: '6px',
            },
            duration: 3000,
          }}
        />
      </body>
    </html>
  )
}
