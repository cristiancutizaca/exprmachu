export function isSecretConfigKey(key: unknown): boolean {
  if (typeof key !== 'string') return false
  const normalized = key.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return /(^|[^a-z0-9])(sunat|reniec|sol)([^a-z0-9]|$)/.test(normalized)
    || /password|passwd|contrasena|secret|token|api[^a-z0-9]*key|clave[^a-z0-9]*(privada|sol)|private[^a-z0-9]*key|certificad|passphrase|-----begin/.test(normalized)
}

export function isPrivateKeyMaterial(value: string): boolean {
  return /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)
}
