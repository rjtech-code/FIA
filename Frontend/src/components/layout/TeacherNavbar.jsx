import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import FiaLogo from '../branding/FiaLogo'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import ChangePasswordModal from '../../features/teacherDashboard/components/ChangePasswordModal'
import { useTeacherAuth } from '../../hooks/useTeacherAuth'
import { useTeacherStatus } from '../../hooks/useTeacherStatus'
import { useLanguage } from '../../hooks/useLanguage'
import { TEACHER_ROUTES } from '../../utils/constants'

function CheckIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function LogoutIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function KeyIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="15" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.5 12.5L20 3m0 0h-4m4 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChangePasswordButton({ className = '', onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600
        transition-colors duration-150 ease-out
        hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700
        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
        ${className}`}
    >
      <KeyIcon />
      <span>{label}</span>
    </button>
  )
}

function MenuIcon({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function navLinkClassName({ isActive }) {
  return `inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-150 ease-out lg:px-5 ${
    isActive
      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
      : 'text-slate-500 hover:bg-brand-50 hover:text-brand-700'
  }`
}

function DashboardTab({ onClick, label }) {
  return (
    <NavLink to={TEACHER_ROUTES.DASHBOARD} onClick={onClick} className={navLinkClassName}>
      {label}
    </NavLink>
  )
}

function WorkflowTab({ step, status, onClick, completePreviousStepLabel }) {
  const unlocked = step.isUnlocked(status)
  const completed = step.isCompleted(status)

  if (!unlocked) {
    return (
      <span
        role="link"
        aria-disabled="true"
        tabIndex={-1}
        title={completePreviousStepLabel}
        className="group relative inline-flex h-10 cursor-not-allowed items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-semibold whitespace-nowrap text-slate-400 opacity-60 lg:px-5"
      >
        <LockIcon className="h-3.5 w-3.5 text-accent-600" />
        {step.label}
        <span className="pointer-events-none absolute top-full left-1/2 z-10 mt-2 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
          {completePreviousStepLabel}
        </span>
      </span>
    )
  }

  return (
    <NavLink to={step.to} onClick={onClick} className={navLinkClassName}>
      <span className="inline-flex items-center gap-1.5">
        {completed && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-white">
            <CheckIcon className="h-2.5 w-2.5" />
          </span>
        )}
        {step.label}
      </span>
    </NavLink>
  )
}

function LogoutButton({ className = '', onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-600
        transition-colors duration-150 ease-out
        hover:border-red-600 hover:bg-red-600 hover:text-white
        focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
        ${className}`}
    >
      <LogoutIcon />
      <span>{label}</span>
    </button>
  )
}

export default function TeacherNavbar() {
  const navigate = useNavigate()
  const { teacher, logout } = useTeacherAuth()
  const { status } = useTeacherStatus()
  const { t } = useLanguage()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)

  const workflowSteps = [
    {
      key: 'feedback',
      label: t('nav.teacherFeedback'),
      to: TEACHER_ROUTES.FEEDBACK,
      isUnlocked: () => true,
      isCompleted: (s) => s.teacherFeedbackCompleted,
    },
    {
      key: 'studentFeedback',
      label: t('nav.studentFeedback'),
      to: TEACHER_ROUTES.STUDENT_FEEDBACK,
      isUnlocked: (s) => s.teacherFeedbackCompleted,
      isCompleted: (s) => s.studentFeedbackCompleted,
    },
  ]

  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen])

  const closeDrawer = () => setIsDrawerOpen(false)

  const handleLogout = () => {
    logout()
    closeDrawer()
    navigate(TEACHER_ROUTES.LOGIN, { replace: true })
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-brand-100 bg-brand-50/70 shadow-sm shadow-slate-900/[0.03] backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8 xl:px-10">
          <Link to={TEACHER_ROUTES.DASHBOARD} className="flex min-w-0 items-center gap-3">
            <FiaLogo className="h-9 w-9 shrink-0 lg:h-10 lg:w-10" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-900">{t('nav.teacherPortalTitle')}</p>
              {teacher && <p className="truncate text-xs text-slate-400">{teacher.schoolName}</p>}
            </div>
          </Link>

          <div className="hidden items-center md:flex lg:gap-2">
            <nav className="flex items-center gap-1 rounded-2xl border border-brand-100/70 bg-white/60 p-1 lg:gap-1.5">
              <DashboardTab label={t('nav.dashboard')} />
              {workflowSteps.map((step) => (
                <WorkflowTab
                  key={step.key}
                  step={step}
                  status={status}
                  completePreviousStepLabel={t('nav.completePreviousStep')}
                />
              ))}
            </nav>

            <div className="mx-3 hidden h-8 w-px bg-brand-100 lg:block" aria-hidden="true" />

            <div className="flex items-center gap-2 pl-3 lg:gap-3 lg:pl-0">
              <LanguageSwitcher />
              <ChangePasswordButton onClick={() => setIsChangePasswordOpen(true)} label={t('nav.changePassword')} />
              <LogoutButton onClick={handleLogout} label={t('nav.logout')} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center justify-center rounded-xl p-2 text-slate-600 transition-colors duration-150 hover:bg-slate-100 md:hidden"
            aria-label={t('nav.openMenu')}
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      <div
        aria-hidden={!isDrawerOpen}
        onClick={closeDrawer}
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isDrawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('common.navigationMenu')}
        className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl shadow-slate-900/10 transition-transform duration-300 ease-out md:hidden ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <span className="text-sm font-semibold text-slate-900">{t('nav.menu')}</span>
          <button
            type="button"
            onClick={closeDrawer}
            className="inline-flex items-center justify-center rounded-xl p-2 text-slate-500 transition-colors duration-200 hover:bg-slate-100"
            aria-label={t('nav.closeMenu')}
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-4">
          <DashboardTab onClick={closeDrawer} label={t('nav.dashboard')} />
          {workflowSteps.map((step) => (
            <WorkflowTab
              key={step.key}
              step={step}
              status={status}
              onClick={closeDrawer}
              completePreviousStepLabel={t('nav.completePreviousStep')}
            />
          ))}
        </nav>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-4">
          <LanguageSwitcher className="w-full justify-center" />
          <ChangePasswordButton
            onClick={() => {
              closeDrawer()
              setIsChangePasswordOpen(true)
            }}
            label={t('nav.changePassword')}
            className="w-full"
          />
          <LogoutButton onClick={handleLogout} label={t('nav.logout')} className="w-full" />
        </div>
      </div>

      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
    </>
  )
}
