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
    defaultValues: { username: 'jesus.cutisaca', password: '' },
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await authApi.login(data.username, data.password)
      login(res.data.user, res.data.access_token)
      toast.success('Bienvenido al sistema GRAEL')
      router.push('/recepcion')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Credenciales incorrectas'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // Demo: login sin backend
  const demoLogin = () => {
    login({
      id: '1', nombre: 'JESUS SAMUEL', apellido: 'CUTISACA BUSTAMANTE',
      username: 'jesus.cutisaca', sede: 'CUSCO', rol: 'ADMIN_SEDE',
    }, 'demo-token-123')
    toast.success('Acceso demo activado')
    router.push('/recepcion')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-500 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-64 h-64 border border-white rounded-full" />
        <div className="absolute bottom-20 right-20 w-96 h-96 border border-white rounded-full" />
        <div className="absolute top-1/2 left-1/4 w-32 h-32 border border-white rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Card */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-navy-500 px-8 py-6 text-center">
            <div className="text-3xl font-bold italic text-white tracking-wider">
              GR<span className="text-sky-light">AE</span>L
              <sup className="text-sky-light text-sm not-italic">›</sup>
            </div>
            <p className="text-white/60 text-xs mt-1 tracking-widest uppercase">
              Sistema de Gestión Logística
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Usuario</label>
              <input
                {...register('username')}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:border-sky-brand focus:ring-2 focus:ring-sky-brand/20
                           transition-all"
                placeholder="usuario@grael"
              />
              {errors.username && (
                <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:border-sky-brand focus:ring-2 focus:ring-sky-brand/20
                             transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy-500
                         text-white rounded-lg font-medium text-sm transition-all
                         hover:bg-navy-600 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>

            {/* Demo button */}
            <button
              type="button"
              onClick={demoLogin}
              className="w-full py-2 text-xs text-gray-400 hover:text-navy-500 transition-colors
                         border border-dashed border-gray-200 rounded-lg hover:border-navy-300"
            >
              Acceso Demo (sin backend)
            </button>
          </form>

          <div className="px-8 pb-4 text-center text-xs text-gray-400">
            © 2026 grael.pe — v1.0.0
          </div>
        </div>
      </div>
    </div>
  )
}
