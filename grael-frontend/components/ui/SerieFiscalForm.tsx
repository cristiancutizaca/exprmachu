'use client'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button, FormField, Input, Select } from '@/components/ui'
import { catalogosV2Api, comprobantesApi, guiasApi } from '@/lib/api'
import { mensajeApi } from '@/lib/archivos'
import toast from 'react-hot-toast'

export default function SerieFiscalForm({ kind }: { kind: 'GRE' | 'CPE' }) {
  const [sites, setSites] = useState<Array<{id: string; nombre: string}>>([])
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    if (!enabled) return
    catalogosV2Api.sedes().then(({ data }) => setSites(Array.isArray(data) ? data : data.data || []))
      .catch(error => toast.error(mensajeApi(error, 'No se pudo cargar sedes')))
  }, [enabled])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const params = new FormData(form)
    const data = { sedeId: params.get('site'), serie: String(params.get('series')).toUpperCase(), ultimoCorrelativo: Number(params.get('last')) }
    setBusy(true)
    try {
      if (kind === 'GRE') await guiasApi.serie({ ...data, tipoGuia: params.get('type') })
      else await comprobantesApi.serie({ ...data, tipo: params.get('type'), codigoEstablecimiento: params.get('local') })
      form.reset()
      toast.success('Serie registrada')
    } catch (error) { toast.error(mensajeApi(error, 'No se pudo registrar la serie')) }
    finally { setBusy(false) }
  }

  return <details className="rounded-xl border border-slate-200 bg-white px-4 py-3" onToggle={event => setEnabled(event.currentTarget.open)}>
    <summary className="cursor-pointer font-semibold text-navy-500">Registrar serie tributaria</summary>
    {enabled && <form onSubmit={save} className="mt-3 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
      <FormField label="Sede"><Select aria-label="Sede" name="site" required>
        <option value="">Seleccione sede</option>
        {sites.map(site => <option value={site.id} key={site.id}>{site.nombre}</option>)}
      </Select></FormField>
      <FormField label="Tipo"><Select aria-label="Tipo de serie" name="type">
        {kind === 'GRE' ? <><option value="31">Transportista</option><option value="09">Remitente</option></> : <><option value="01">Factura</option><option value="03">Boleta</option></>}
      </Select></FormField>
      <FormField label="Serie"><Input aria-label="Serie" name="series" required minLength={4} maxLength={4}/></FormField>
      <FormField label="Último correlativo usado"><Input aria-label="Último correlativo usado" name="last" required type="number" min="0" max="99999998"/></FormField>
      {kind === 'CPE' && <FormField label="Establecimiento SUNAT"><Input aria-label="Establecimiento SUNAT" name="local" required pattern="[0-9]{4}" maxLength={4}/></FormField>}
      <Button type="submit" loading={busy}>Registrar serie</Button>
    </form>}
  </details>
}
