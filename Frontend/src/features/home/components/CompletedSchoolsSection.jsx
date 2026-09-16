import { useMemo } from 'react'
import Spinner from '../../../components/ui/Spinner'
import ErrorState from '../../../components/ui/ErrorState'
import SummaryCard from '../../../components/ui/SummaryCard'
import DashboardTable from '../../../components/table/DashboardTable'
import { useSchoolRecords } from '../../../hooks/useSchoolRecords'
import { useLanguage } from '../../../hooks/useLanguage'
import { computeCompletedRows } from '../../../data/schoolRecords.derive'
import { computeCompletedSchoolsSummary } from '../utils/dashboardStats'

export default function CompletedSchoolsSection() {
  const { schools, isLoading, error, refetch } = useSchoolRecords()
  const { t } = useLanguage()
  const rows = useMemo(() => computeCompletedRows(schools), [schools])
  const summary = useMemo(() => computeCompletedSchoolsSummary(rows), [rows])

  const columns = [
    {
      key: 'school',
      label: t('home.completed.columns.school'),
      sortable: true,
      wrap: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{row.school}</span>
        </div>
      ),
    },
    { key: 'district', label: t('home.completed.columns.district'), sortable: true },
    { key: 'tour', label: t('home.completed.columns.tour'), wrap: true },
    { key: 'grade', label: t('home.completed.columns.grade') },
    { key: 'month', label: t('home.completed.columns.month') },
    { key: 'target', label: t('home.completed.columns.target'), render: (row) => row.target.toLocaleString() },
    {
      key: 'responses',
      label: t('home.completed.columns.responses'),
      render: (row) => row.responses.toLocaleString(),
    },
    { key: 'avgCsat', label: t('home.completed.columns.avgCsat'), render: (row) => row.avgCsat.toFixed(1) },
    { key: 'nps', label: t('home.completed.columns.nps'), render: (row) => `${row.nps}%` },
  ]

  return (
    <section className="animate-fade-in-up rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/5 sm:p-8">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-completed-50 text-completed-600"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path d="m8 12.5 2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">{t('home.completed.title')}</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{t('home.completed.description')}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-slate-400" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          {/* "Target Students" card removed from this section per product
              request — computeCompletedSchoolsSummary()'s totalTarget value
              is intentionally left untouched below since it's harmless,
              unused dead weight rather than something worth risking a
              wider refactor to remove. */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard accent label={t('home.completed.completedSchools')} value={summary.completedSchools} />
            <SummaryCard label={t('home.completed.totalResponses')} value={summary.totalResponses.toLocaleString()} />
            <SummaryCard label={t('home.completed.averageCsat')} value={summary.avgCsat.toFixed(1)} />
            <SummaryCard label={t('home.completed.averageNps')} value={`${summary.avgNps}%`} />
          </div>

          <div className="mt-6">
            <DashboardTable
              columns={columns}
              data={rows}
              searchKeys={['school', 'district']}
              searchPlaceholder={t('home.completed.searchPlaceholder')}
              emptyMessage={rows.length === 0 ? t('home.completed.emptyAll') : t('home.completed.emptySearch')}
              fluid
            />
          </div>
        </>
      )}
    </section>
  )
}
