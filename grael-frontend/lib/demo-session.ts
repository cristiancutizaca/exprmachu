export const demoEnabled = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true'

export function isDemoSession(token?: string | null): boolean {
  return demoEnabled && Boolean(token?.startsWith('demo-'))
}
