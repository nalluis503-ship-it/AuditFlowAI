import { useMemo, useState, type ChangeEvent } from 'react'
import './GuidedDataStage.css'

type DataStageSourceType = 'excel' | 'csv' | 'sql-dump' | 'document' | 'unknown'

type DataColumnRole =
  | 'identifier'
  | 'provider'
  | 'contract'
  | 'amount'
  | 'date'
  | 'status'
  | 'description'
  | 'unknown'

type DataColumnProfile = {
  name: string
  detectedType: string
  possibleRole: DataColumnRole
  confidence: number
}

type DataFileProfile = {
  id: string
  name: string
  extension: string
  sourceType: DataStageSourceType
  rowEstimate: number
  tableEstimate: number
  columns: DataColumnProfile[]
  alerts: string[]
  suggestedActions: string[]
}

export type GuidedDataStageAnalysisIntent = {
  action:
    | 'compare-datasets'
    | 'detect-duplicates'
    | 'validate-payments'
    | 'review-missing-records'
    | 'custom-analysis'
  sourceFileIds: string[]
}

type GuidedDataStageProps = {
  onCreateAnalysisFlow?: (intent: GuidedDataStageAnalysisIntent) => void
}

function getFileExtension(fileName: string) {
  const segments = fileName.toLowerCase().split('.')
  return segments.length > 1 ? segments.at(-1) ?? '' : ''
}

function detectSourceType(extension: string): DataStageSourceType {
  if (['xlsx', 'xls'].includes(extension)) return 'excel'
  if (extension === 'csv') return 'csv'
  if (extension === 'sql') return 'sql-dump'
  if (['pdf', 'doc', 'docx'].includes(extension)) return 'document'

  return 'unknown'
}

function inferColumnsFromName(fileName: string, sourceType: DataStageSourceType): DataColumnProfile[] {
  const normalizedName = fileName.toLowerCase()

  if (normalizedName.includes('pago') || normalizedName.includes('egreso')) {
    return [
      { name: 'folio_pago', detectedType: 'identificador', possibleRole: 'identifier', confidence: 92 },
      { name: 'proveedor', detectedType: 'texto', possibleRole: 'provider', confidence: 88 },
      { name: 'rfc', detectedType: 'texto', possibleRole: 'provider', confidence: 84 },
      { name: 'contrato', detectedType: 'texto', possibleRole: 'contract', confidence: 79 },
      { name: 'monto_pagado', detectedType: 'moneda', possibleRole: 'amount', confidence: 91 },
      { name: 'fecha_pago', detectedType: 'fecha', possibleRole: 'date', confidence: 86 },
    ]
  }

  if (normalizedName.includes('contrato')) {
    return [
      { name: 'numero_contrato', detectedType: 'identificador', possibleRole: 'contract', confidence: 93 },
      { name: 'proveedor', detectedType: 'texto', possibleRole: 'provider', confidence: 86 },
      { name: 'rfc_proveedor', detectedType: 'texto', possibleRole: 'provider', confidence: 82 },
      { name: 'monto_autorizado', detectedType: 'moneda', possibleRole: 'amount', confidence: 89 },
      { name: 'fecha_inicio', detectedType: 'fecha', possibleRole: 'date', confidence: 80 },
      { name: 'estatus', detectedType: 'texto', possibleRole: 'status', confidence: 72 },
    ]
  }

  if (sourceType === 'sql-dump') {
    return [
      { name: 'id_registro', detectedType: 'identificador', possibleRole: 'identifier', confidence: 78 },
      { name: 'tabla_origen', detectedType: 'texto', possibleRole: 'description', confidence: 67 },
      { name: 'fecha_movimiento', detectedType: 'fecha', possibleRole: 'date', confidence: 74 },
      { name: 'importe', detectedType: 'moneda', possibleRole: 'amount', confidence: 70 },
      { name: 'referencia', detectedType: 'texto', possibleRole: 'identifier', confidence: 66 },
    ]
  }

  return [
    { name: 'folio', detectedType: 'identificador', possibleRole: 'identifier', confidence: 68 },
    { name: 'descripcion', detectedType: 'texto', possibleRole: 'description', confidence: 62 },
    { name: 'fecha', detectedType: 'fecha', possibleRole: 'date', confidence: 60 },
    { name: 'monto', detectedType: 'moneda', possibleRole: 'amount', confidence: 58 },
  ]
}

function buildAlerts(columns: DataColumnProfile[], sourceType: DataStageSourceType) {
  const alerts: string[] = []

  if (sourceType === 'sql-dump') {
    alerts.push('Archivo SQL tratado como exportación de datos; no requiere comandos del auditor.')
  }

  if (columns.some((column) => column.possibleRole === 'amount')) {
    alerts.push('Se detectaron posibles columnas de importes para validación.')
  }

  if (columns.some((column) => column.possibleRole === 'contract')) {
    alerts.push('Se detectaron campos que podrían servir para cruce contra contratos.')
  }

  if (alerts.length === 0) {
    alerts.push('Estructura lista para revisión inicial.')
  }

  return alerts
}

function buildSuggestedActions(columns: DataColumnProfile[]) {
  const actions = ['Perfilar columnas y tipos de datos']

  if (columns.some((column) => column.possibleRole === 'amount')) {
    actions.push('Comparar importes')
  }

  if (columns.some((column) => column.possibleRole === 'contract')) {
    actions.push('Validar contra contratos')
  }

  if (columns.some((column) => column.possibleRole === 'identifier')) {
    actions.push('Buscar duplicados')
  }

  actions.push('Crear análisis personalizado')

  return actions
}

function createProfileFromFile(file: File, index: number): DataFileProfile {
  const extension = getFileExtension(file.name)
  const sourceType = detectSourceType(extension)
  const columns = inferColumnsFromName(file.name, sourceType)

  return {
    id: `${file.name}-${file.size}-${index}`,
    name: file.name,
    extension: extension || 'sin extensión',
    sourceType,
    rowEstimate: Math.max(120, Math.round(file.size / 128)),
    tableEstimate: sourceType === 'sql-dump' ? 2 : 1,
    columns,
    alerts: buildAlerts(columns, sourceType),
    suggestedActions: buildSuggestedActions(columns),
  }
}

function getSourceTypeLabel(sourceType: DataStageSourceType) {
  const labels: Record<DataStageSourceType, string> = {
    excel: 'Excel',
    csv: 'CSV',
    'sql-dump': 'SQL exportado',
    document: 'Documento',
    unknown: 'Archivo',
  }

  return labels[sourceType]
}

function getRoleLabel(role: DataColumnRole) {
  const labels: Record<DataColumnRole, string> = {
    identifier: 'Clave / folio',
    provider: 'Proveedor',
    contract: 'Contrato',
    amount: 'Importe',
    date: 'Fecha',
    status: 'Estatus',
    description: 'Descripción',
    unknown: 'Sin clasificar',
  }

  return labels[role]
}

export default function GuidedDataStage({ onCreateAnalysisFlow }: GuidedDataStageProps) {
  const [profiles, setProfiles] = useState<DataFileProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0]

  const sharedColumnRoles = useMemo(() => {
    const roleCount = new Map<DataColumnRole, number>()

    profiles.forEach((profile) => {
      const roles = new Set(profile.columns.map((column) => column.possibleRole))
      roles.forEach((role) => roleCount.set(role, (roleCount.get(role) ?? 0) + 1))
    })

    return [...roleCount.entries()]
      .filter(([role, count]) => role !== 'unknown' && count >= 2)
      .map(([role]) => role)
  }, [profiles])

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    const nextProfiles = files.map(createProfileFromFile)

    setProfiles(nextProfiles)
    setSelectedProfileId(nextProfiles[0]?.id ?? null)
  }

  const createFlow = (action: GuidedDataStageAnalysisIntent['action']) => {
    onCreateAnalysisFlow?.({
      action,
      sourceFileIds: profiles.map((profile) => profile.id),
    })
  }

  return (
    <section className="guided-data-stage" aria-label="Mesa inteligente de análisis de datos">
      <div className="guided-stage-backdrop" />

      <header className="guided-stage-hero">
        <div>
          <span className="guided-stage-kicker">Mesa inteligente de auditoría</span>
          <h2>Sube tus bases y deja que AuditFlow te diga qué contienen</h2>
          <p>
            Primero revisamos estructura, columnas, posibles campos de cruce y riesgos iniciales.
            Después decides qué análisis quieres ejecutar.
          </p>
        </div>

        <label className="guided-stage-upload">
          <input
            type="file"
            multiple
            accept=".xlsx,.xls,.csv,.sql,.pdf,.doc,.docx"
            onChange={handleFilesSelected}
          />
          <strong>Subir bases o evidencia</strong>
          <span>Excel, CSV, SQL exportado, PDF o Word</span>
        </label>
      </header>

      {profiles.length === 0 ? (
        <div className="guided-stage-empty">
          <div className="guided-stage-orbit">
            <span />
            <span />
            <span />
          </div>

          <div>
            <strong>Esperando archivos</strong>
            <p>
              Sube una o más bases. AuditFlow las mostrará como objetos de análisis para que el
              auditor no tenga que iniciar desde comandos o herramientas técnicas.
            </p>
          </div>
        </div>
      ) : (
        <div className="guided-stage-workspace">
          <div className="guided-stage-files">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className={`guided-file-card ${profile.id === selectedProfile?.id ? 'active' : ''}`}
                onClick={() => setSelectedProfileId(profile.id)}
              >
                <span className="guided-file-type">{getSourceTypeLabel(profile.sourceType)}</span>
                <strong>{profile.name}</strong>
                <small>
                  {profile.rowEstimate.toLocaleString()} registros estimados · {profile.columns.length}{' '}
                  columnas
                </small>

                <div className="guided-file-columns">
                  {profile.columns.slice(0, 4).map((column) => (
                    <span key={`${profile.id}-${column.name}`}>{column.name}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div className="guided-stage-detail">
            {selectedProfile && (
              <>
                <div className="guided-detail-header">
                  <div>
                    <span>{getSourceTypeLabel(selectedProfile.sourceType)}</span>
                    <h3>{selectedProfile.name}</h3>
                  </div>

                  <div className="guided-detail-metrics">
                    <strong>{selectedProfile.rowEstimate.toLocaleString()}</strong>
                    <small>registros estimados</small>
                  </div>
                </div>

                <div className="guided-detail-grid">
                  <article>
                    <h4>Columnas detectadas</h4>

                    <div className="guided-column-list">
                      {selectedProfile.columns.map((column) => (
                        <div key={`${selectedProfile.id}-${column.name}`} className="guided-column-row">
                          <div>
                            <strong>{column.name}</strong>
                            <small>{column.detectedType}</small>
                          </div>

                          <span>{getRoleLabel(column.possibleRole)}</span>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article>
                    <h4>Lectura inteligente</h4>

                    <ul className="guided-alert-list">
                      {selectedProfile.alerts.map((alert) => (
                        <li key={alert}>{alert}</li>
                      ))}
                    </ul>

                    {sharedColumnRoles.length > 0 && (
                      <div className="guided-relationship-box">
                        <strong>Relaciones sugeridas</strong>
                        <p>
                          Detecté campos compatibles entre archivos:{' '}
                          {sharedColumnRoles.map(getRoleLabel).join(', ')}.
                        </p>
                      </div>
                    )}
                  </article>
                </div>

                <div className="guided-actions-panel">
                  <div>
                    <span>Siguiente paso</span>
                    <strong>Elige qué quieres revisar con estas bases</strong>
                  </div>

                  <div className="guided-action-buttons">
                    <button type="button" onClick={() => createFlow('compare-datasets')}>
                      Comparar bases
                    </button>
                    <button type="button" onClick={() => createFlow('detect-duplicates')}>
                      Buscar duplicados
                    </button>
                    <button type="button" onClick={() => createFlow('validate-payments')}>
                      Validar pagos
                    </button>
                    <button type="button" onClick={() => createFlow('custom-analysis')}>
                      Pedir análisis personalizado
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
