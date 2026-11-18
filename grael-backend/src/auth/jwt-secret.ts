export function jwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || ['CAMBIAR_ESTO', 'change-me'].includes(secret) || process.env.NODE_ENV === 'production' && Buffer.byteLength(secret) < 32) {
    throw new Error('Configure JWT_SECRET con un secreto de servidor de al menos 32 bytes en producción')
  }
  return secret
}
