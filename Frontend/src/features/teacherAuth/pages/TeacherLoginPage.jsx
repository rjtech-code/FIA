import FiaLogo from '../../../components/branding/FiaLogo'
import TeacherLoginForm from '../components/TeacherLoginForm'
import { useLanguage } from '../../../hooks/useLanguage'

export default function TeacherLoginPage() {
  const { t } = useLanguage()

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-slate-900 px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl"
      />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="rounded-3xl border border-white/10 bg-white p-8 shadow-2xl shadow-slate-900/30 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <FiaLogo />
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
              {t('teacherAuth.title')}
            </h1>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">{t('teacherAuth.subtitle')}</p>
          </div>

          <div className="mt-8">
            <TeacherLoginForm />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-brand-200">{t('teacherAuth.footerNote')}</p>
      </div>
    </div>
  )
}
