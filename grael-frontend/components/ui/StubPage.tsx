import type { LucideIcon } from 'lucide-react'

interface StubPageProps {
  title: string
  Icon:  LucideIcon
  description?: string
}

export default function StubPage({ title, Icon, description }: StubPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 gap-4">
      <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center">
        <Icon size={40} className="text-gray-300" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-400 mb-1">{title}</h2>
        <p className="text-[13px] text-gray-300">
          {description || 'Módulo en construcción'}
        </p>
      </div>
      <div className="mt-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-600">
        🚧 Próximamente disponible
      </div>
    </div>
  )
}
