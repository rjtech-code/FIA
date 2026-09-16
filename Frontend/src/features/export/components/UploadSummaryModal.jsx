import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import DashboardTable from '../../../components/table/DashboardTable'
import { downloadUploadReport } from '../utils/uploadReport'
import { useLanguage } from '../../../hooks/useLanguage'

function StatusPill({ status, t }) {
  const STATUS_PILL = {
    registered: { label: t('export.summaryModal.statusLabels.registered'), className: 'bg-completed-50 text-completed-700 border-completed-200' },
    duplicate: { label: t('export.summaryModal.statusLabels.duplicate'), className: 'bg-red-50 text-red-700 border-red-200' },
    'invalid-udise': { label: t('export.summaryModal.statusLabels.invalidUdise'), className: 'bg-amber-50 text-amber-700 border-amber-200' },
    invalid: { label: t('export.summaryModal.statusLabels.invalid'), className: 'bg-orange-50 text-orange-700 border-orange-200' },
  }
  const pill = STATUS_PILL[status] || { label: status, className: 'bg-slate-100 text-slate-500 border-slate-200' }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${pill.className}`}
    >
      {pill.label}
    </span>
  )
}

function StatCard({ icon, label, value, accentClassName }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm shadow-slate-900/5 ${accentClassName}`}>
      <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase">
        <span aria-hidden="true">{icon}</span>
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  )
}

function CloseIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Full-page overlay (not the shared centered `Modal`): the result set can be
// long, and the Close action needs to stay fixed at the bottom of the
// viewport regardless of scroll position. Splitting the scrollable content
// region from a separate `fixed` action bar — rather than putting both
// inside one `overflow-y-auto` box like `Modal` does — is what keeps Close
// from scrolling away with the table.
export default function UploadSummaryModal({ isOpen, onClose, summary }) {
  const { t } = useLanguage()
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const filters = [
    { key: 'all', label: t('export.summaryModal.filters.all') },
    { key: 'registered', label: t('export.summaryModal.filters.registered') },
    { key: 'duplicate', label: t('export.summaryModal.filters.duplicate') },
    { key: 'invalid-udise', label: t('export.summaryModal.filters.invalidUdise') },
    { key: 'invalid', label: t('export.summaryModal.filters.invalid') },
  ]

  const columns = [
    { key: 'status', label: t('export.summaryModal.columns.status'), render: (row) => <StatusPill status={row.status} t={t} /> },
    { key: 'udise', label: t('export.summaryModal.columns.udise') },
    { key: 'schoolName', label: t('export.summaryModal.columns.schoolName'), wrap: true },
    { key: 'district', label: t('export.summaryModal.columns.district') },
    { key: 'state', label: t('export.summaryModal.columns.state') },
    { key: 'message', label: t('export.summaryModal.columns.message'), wrap: true, wrapWidthClassName: 'w-48' },
  ]

  const filteredResults = useMemo(() => {
    if (!summary) return []
    if (activeFilter === 'all') return summary.results
    return summary.results.filter((row) => row.status === activeFilter)
  }, [summary, activeFilter])

  if (!isOpen || !summary) return null

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-6xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {t('export.summaryModal.title')}
              </h3>
              <p className="mt-1.5 text-sm text-slate-500">{t('export.summaryModal.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="hidden shrink-0 items-center justify-center rounded-xl p-2 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 sm:inline-flex"
              aria-label={t('common.close')}
            >
              <CloseIcon />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              icon="📄"
              label={t('export.summaryModal.totalRecords')}
              value={summary.total}
              accentClassName="border-slate-200"
            />
            <StatCard
              icon="✅"
              label={t('export.summaryModal.successfullyRegistered')}
              value={summary.success}
              accentClassName="border-t-4 border-t-completed-500 border-slate-200"
            />
            <StatCard
              icon="❌"
              label={t('export.summaryModal.alreadyRegistered')}
              value={summary.duplicates}
              accentClassName="border-t-4 border-t-red-400 border-slate-200"
            />
            <StatCard
              icon="⚠"
              label={t('export.summaryModal.invalidUdiseRows')}
              value={summary.invalidUdise ?? 0}
              accentClassName="border-t-4 border-t-accent-400 border-slate-200"
            />
            <StatCard
              icon="⚠"
              label={t('export.summaryModal.invalidRows')}
              value={summary.invalid}
              accentClassName="border-t-4 border-t-orange-400 border-slate-200"
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ease-out ${
                    activeFilter === filter.key
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => downloadUploadReport(summary.results)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700
                transition-all duration-200 ease-out hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              {t('export.summaryModal.downloadReport')}
            </button>
          </div>

          <div className="mt-4">
            <DashboardTable
              columns={columns}
              data={filteredResults}
              searchKeys={['schoolName', 'udise', 'district']}
              searchPlaceholder={t('export.summaryModal.searchPlaceholder')}
              emptyMessage={t('export.summaryModal.emptyFilter')}
              fluid
            />
          </div>
        </div>
      </div>

      {/* Deliberately outside the scrolling container above (not just
          `sticky`) so it stays pinned to the viewport bottom no matter how
          long the results table gets — the one hard requirement for this
          screen. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-md justify-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white
              transition-all duration-200 ease-out
              hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-900/20 hover:-translate-y-0.5
              active:translate-y-0 active:shadow-none
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
