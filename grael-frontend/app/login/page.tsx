'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store'
import { authApi } from '@/lib/api'
import { defaultRouteForRole } from '@/components/layout/Sidebar'
import { BrandMark } from '@/components/brand/BrandIdentity'

const schema = z.object({
  username: z.string().min(1, 'Ingrese su usuario'),
  password: z.string().min(1, 'Ingrese su contraseña'),
})
type LoginForm = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const login  = useAuthStore((s) => s.login)
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await authApi.login(data.username, data.password)
      login(res.data.user, res.data.access_token)
      toast.success('Bienvenido a Expreso Machupicchu')
      router.replace(defaultRouteForRole(res.data.user?.rol))
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Credenciales incorrectas'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // Demo: login sin backend
  const demoLogin = () => {
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_DEMO !== 'true') return
    login({
      id: '1', nombre: 'JESUS SAMUEL', apellido: 'CUTISACA BUSTAMANTE',
      username: 'jesus.cutisaca', sede: 'CUSCO', rol: 'ADMIN_SEDE',
    }, 'demo-token-123')
    toast.success('Acceso demo activado')
    router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#082440] flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,176,0,0.22),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.10),transparent_24%),linear-gradient(135deg,#082440_0%,#0e3257_55%,#134274_100%)]" />
      <div className="absolute inset-0 opacity-20" style={{backgroundImage:'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize:'32px 32px'}} />

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1.15fr_0.85fr] rounded-[28px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.35)] border border-white/10">
        <div className="hidden lg:flex flex-col justify-between brand-card p-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 border border-white/10 text-[11px] uppercase tracking-[0.2em] text-white/85 font-semibold">
              <span className="w-2 h-2 rounded-full bg-gold-brand" />
              Plataforma Operativa
            </div>
            <div className="mt-6 flex items-start gap-4"><BrandMark light size="lg" />
              <h1 className="text-4xl font-black uppercase tracking-[0.065em] leading-tight text-white">
                Expreso<br/>Machupicchu
              </h1></div>
            <p className="mt-3 text-gold-brand text-sm font-bold tracking-[0.22em] uppercase">
              Encomiendas · Cargas · Courier · Mudanzas
            </p>
            <p className="mt-6 text-white/80 max-w-xl text-sm leading-6">
              Controla recepción, manifiestos, desembarque, inventario, caja diaria, repartos y entregas desde una sola plataforma con identidad visual alineada a Expreso Machupicchu.
            </p>
          </div>

          <div className="relative mb-6 h-24 overflow-hidden rounded-2xl border border-white/10 bg-white/5" aria-hidden="true">
            <svg viewBox="0 0 600 120" className="h-full w-full" preserveAspectRatio="xMidYMax slice"><path d="M0 117 106 35l67 52 122-82 113 95 67-42 125 59Z" fill="#d5eff9" opacity=".25"/><path d="M0 120 125 69l95 38 97-58 102 57 88-40 93 54Z" fill="#f3bc43" opacity=".3"/><path d="M20 110Q270 80 575 106" stroke="#fff" strokeWidth="4" strokeDasharray="11 14" fill="none" opacity=".5"/></svg>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              ['Cobertura', 'Rutas y sedes conectadas'],
              ['Operación', 'Recepción, reparto y POD'],
              ['Control', 'Caja diaria y reportes'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm">
                <p className="text-gold-brand text-[11px] font-black uppercase tracking-[0.18em]">{title}</p>
                <p className="text-white/80 text-xs mt-2 leading-5">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 lg:p-10 brand-watermark">
          <div className="lg:hidden mb-6">
            <p className="text-[12px] font-black uppercase tracking-[0.18em] text-navy-500">Expreso Machupicchu</p>
            <p className="text-[11px] text-gold-dark uppercase tracking-[0.14em] mt-1">Encomiendas · Cargas · Courier · Mudanzas</p>
          </div>

          <div className="mb-6">
            <div className="h-1.5 w-20 rounded-full brand-accent-line mb-4" />
            <h2 className="text-[28px] font-black text-navy-500 leading-none">Ingreso al sistema</h2>
            <p className="text-sm text-gray-500 mt-2">Panel administrativo y operativo para la gestión de sede.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">Usuario</label>
              <input
                {...register('username')}
                className="w-full px-4 py-3 border border-[#d8e4f0] rounded-xl text-sm bg-[#f8fbff]
                           focus:outline-none focus:border-gold-brand focus:ring-2 focus:ring-[#f4b000]/20 transition-all"
                placeholder="usuario@expresomachupicchu"
              />
              {errors.username && (
                <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">Contraseña</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="w-full px-4 py-3 pr-11 border border-[#d8e4f0] rounded-xl text-sm bg-[#f8fbff]
                             focus:outline-none focus:border-gold-brand focus:ring-2 focus:ring-[#f4b000]/20 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-500"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gold-brand text-navy-500 rounded-xl font-black text-sm transition-all hover:bg-gold-dark disabled:opacity-60 disabled:cursor-not-allowed mt-2 shadow-sm"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>

            {process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' && <button
              type="button"
              onClick={demoLogin}
              className="w-full py-2.5 text-xs text-navy-500 hover:text-navy-600 transition-colors border border-dashed border-[#d7e2ec] rounded-xl hover:border-gold-brand bg-[#fbfdff]"
            >
              Acceso Demo (sin backend)
            </button>}
          </form>

          <div className="mt-6 rounded-2xl bg-[#f8fbff] border border-[#dbe7f2] p-4 flex items-start gap-3">
            <BrandMark />
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.16em] text-navy-500">Expreso Machupicchu Cargo</p>
              <p className="text-[11px] text-gray-500 mt-1">Acceso restringido para personal autorizado. Todas las operaciones quedan registradas.</p>
            </div>
          </div>

          <div className="pt-4 text-center text-xs text-gray-400">
            © 2026 Expreso Machupicchu · Plataforma logística
          </div>
        </div>
      </div>
    </div>
  )

}