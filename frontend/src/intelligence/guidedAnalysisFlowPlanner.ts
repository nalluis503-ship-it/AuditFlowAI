export type GuidedAnalysisAction =
  | 'compare-datasets'
  | 'detect-duplicates'
  | 'validate-payments'
  | 'review-missing-records'
  | 'custom-analysis'

export type GuidedAnalysisFlowIntent = {
  action: GuidedAnalysisAction
  sourceFileIds: string[]
}

function detectUploadActionId(sourceFileIds: string[]) {
  const sourceText = sourceFileIds.join(' ').toLowerCase()

  if (sourceText.includes('.csv')) return 'upload-csv-file'
  if (sourceText.includes('.pdf')) return 'upload-pdf-document'

  return 'upload-excel-file'
}

function isPaymentContext(sourceFileIds: string[]) {
  const sourceText = sourceFileIds.join(' ').toLowerCase()

  return sourceText.includes('pago') || sourceText.includes('egreso')
}

export function getGuidedAnalysisActionIds(intent: GuidedAnalysisFlowIntent) {
  const uploadActionId = detectUploadActionId(intent.sourceFileIds)
  const duplicateActionId = isPaymentContext(intent.sourceFileIds)
    ? 'find-payment-duplicates'
    : 'find-exact-duplicates'

  const actionIdsByAction: Record<GuidedAnalysisAction, string[]> = {
    'compare-datasets': [
      uploadActionId,
      'profile-dataset',
      'join-by-key',
      'create-finding',
    ],
    'detect-duplicates': [
      uploadActionId,
      'profile-dataset',
      duplicateActionId,
      'create-finding',
    ],
    'validate-payments': [
      uploadActionId,
      'profile-dataset',
      'validate-payments-against-contracts',
      'create-finding',
    ],
    'review-missing-records': [
      uploadActionId,
      'profile-dataset',
      'find-unmatched-records',
      'create-finding',
    ],
    'custom-analysis': [
      uploadActionId,
      'profile-dataset',
      'create-finding',
    ],
  }

  return actionIdsByAction[intent.action]
}
