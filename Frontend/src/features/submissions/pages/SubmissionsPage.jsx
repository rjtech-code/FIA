import { useMemo } from 'react'
import SummaryCard from '../../../components/ui/SummaryCard'
import Spinner from '../../../components/ui/Spinner'
import ErrorState from '../../../components/ui/ErrorState'
import DashboardTable from '../../../components/table/DashboardTable'
import TypeBadge from '../../../components/ui/TypeBadge'
import GradeSummaryCard from '../components/GradeSummaryCard'
import { useSchoolRecords } from '../../../hooks/useSchoolRecords'
import { useLanguage } from '../../../hooks/useLanguage'
import { getAllSubmissionRows, computeSubmissionsSummary } from '../utils/mergeSubmissions'
import { computeGradeSummaryCards } from '../../../data/schoolRecords.derive'

function formatTime(iso) {
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`
}

export default function SubmissionsPage() {
  const { schools, isLoading, error, refetch } = useSchoolRecords()
  const { t } = useLanguage()
  const rows = useMemo(() => getAllSubmissionRows(schools), [schools])
  const summary = useMemo(() => computeSubmissionsSummary(rows), [rows])
  const gradeCards = useMemo(() => computeGradeSummaryCards(schools), [schools])

  const columns = [
    { key: 'type', label: t('submissions.columns.type'), render: (row) => <TypeBadge type={row.type} /> },
    { key: 'school', label: t('submissions.columns.school'), sortable: true },
    { key: 'tour', label: t('submissions.columns.tour') },
    { key: 'grade', label: t('submissions.columns.grade') },
    { key: 'month', label: t('submissions.columns.month') },
    {
      key: 'time',
      label: t('submissions.columns.time'),
      sortable: true,
      render: (row) => formatTime(row.time),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t('submissions.title')}</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-slate-400" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryCard accent label={t('submissions.totalStudentFeedback')} value={summary.totalStudentFeedback} />
            <SummaryCard label={t('submissions.teacherResponses')} value={summary.teacherResponses} />
            <SummaryCard label={t('submissions.avgCsat')} value={summary.avgCsat.toFixed(2)} />
          </div>

          <div className="mt-6 animate-fade-in-up rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/5 sm:p-8">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
              {t('submissions.feedbackByGrade')}
            </p>
            {gradeCards.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M4 19.5V6a2 2 0 0 1 2-2h9l5 5v10.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <p className="text-sm text-slate-400">{t('submissions.noGradeData')}</p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {gradeCards.map((card) => (
                  <GradeSummaryCard key={card.grade} card={card} />
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 animate-fade-in-up rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/5 sm:p-8">
            <DashboardTable
              columns={columns}
              data={rows}
              searchKeys={['school', 'tour']}
              searchPlaceholder={t('submissions.searchPlaceholder')}
              emptyMessage={t('submissions.emptyAll')}
            />
          </div>
        </>
      )}
    </div>
  )
}
