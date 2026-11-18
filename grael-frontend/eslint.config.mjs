import nextVitals from 'eslint-config-next/core-web-vitals'

const config = [
  ...nextVitals,
  { ignores: ['.next/**', 'out/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts'] },
  {
    // El proyecto mantiene las reglas de hooks. Estos diagnósticos del compilador
    // se habilitan como avisos mientras se actualizan las pantallas preexistentes.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/incompatible-library': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
]
export default config
