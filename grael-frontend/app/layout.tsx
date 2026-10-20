import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title:       'GRAEL - Sistema de Gestión Logística',
  description: 'Administración de sede GRAEL',
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
              background: '#1c3a5c',
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
