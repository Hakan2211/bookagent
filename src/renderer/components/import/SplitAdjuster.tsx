import React from 'react'
import { useTranslation } from 'react-i18next'

// Placeholder for post-MVP visual split adjustment
// In MVP, users can only rename chapters, not adjust boundaries
export function SplitAdjuster() {
  const { t } = useTranslation('import')
  return (
    <div className="p-5 text-center text-sm text-[var(--text-tertiary)]">
      {t('import:splitAdjusterNote')}
    </div>
  )
}
