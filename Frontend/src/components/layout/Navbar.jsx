import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import FiaLogo from '../branding/FiaLogo'
import Spinner from '../ui/Spinner'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useScrolled } from '../../hooks/useScrolled'
import { ROUTES } from '../../utils/constants'

// Desktop header sits on a solid teal bar — nav links need light/white text.
function navLinkClassName({ isActive }) {
  return `inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-150 ease-out lg:px-5 ${
    isActive
      ? 'bg-accent-400 text-brand-900 shadow-md shadow-brand-950/20'
      : 'text-brand-100 hover:bg-white/10 hover:text-white'
  }`
}

// Mobile drawer is a white panel — same active/hover language, dark-on-light.
function drawerNavLinkClassName({ isActive }) {
  return `rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150 ease-out ${
    isActive ? 'bg-accent-400 text-brand-900 shadow-sm' : 'text-slate-500 hover:bg-brand-50 hover:text-brand-700'
  }`
}

function LogoutIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MenuIcon({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LogoutButton({ className = '', onClick, isLoggingOut, label, loggingOutLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoggingOut}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-100 bg-white/95 px-4 text-sm font-semibold text-red-600
        transition-colors duration-150 ease-out
        hover:border-red-600 hover:bg-red-600 hover:text-white
        disabled:cursor-not-allowed disabled:opacity-60
        focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700
        ${className}`}
    >
      {isLoggingOut ? <Spinner className="h-4 w-4" /> : <LogoutIcon />}
      <span>{isLoggingOut ? loggingOutLabel : label}</span>
    </button>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { t } = useLanguage()
  const scrolled = useScrolled()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const navLinks = [
    { label: t('nav.dashboard'), to: ROUTES.HOME },
    { label: t('nav.allSubmissions'), to: ROUTES.SUBMISSIONS },
    { label: t('nav.exportData'), to: ROUTES.EXPORT },
    { label: t('nav.targets'), to: ROUTES.TARGETS },
  ]

  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen])

  const closeDrawer = () => setIsDrawerOpen(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
      closeDrawer()
      navigate(ROUTES.LOGIN, { replace: true })
    }
  }

  return (
    <>
      <header
        className={`sticky z-40 transition-all duration-300 ease-out ${
          scrolled
            ? 'top-[5px] mx-[5px] rounded-2xl bg-brand-700/90 shadow-lg shadow-slate-900/20 backdrop-blur-md'
            : 'top-0 mx-0 rounded-none bg-brand-700 shadow-sm shadow-slate-900/10'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8 xl:px-10">
          <Link to={ROUTES.HOME} className="flex min-w-0 items-center gap-3">
            <FiaLogo className="h-9 w-9 shrink-0 lg:h-10 lg:w-10" />
            <span className="truncate text-sm font-semibold tracking-tight text-white sm:text-base">
              {t('nav.adminPanelTitle')}
            </span>
          </Link>

          <div className="hidden items-center md:flex lg:gap-2">
            <nav className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/10 p-1 lg:gap-1.5">
              {navLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={navLinkClassName}>
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="mx-3 hidden h-8 w-px bg-white/15 lg:block" aria-hidden="true" />

            <div className="flex items-center gap-2 pl-3 lg:gap-3 lg:pl-0">
              <LanguageSwitcher />
              <LogoutButton
                onClick={handleLogout}
                isLoggingOut={isLoggingOut}
                label={t('nav.logout')}
                loggingOutLabel={t('nav.loggingOut')}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center justify-center rounded-xl p-2 text-white/90 transition-colors duration-150 hover:bg-white/10 md:hidden"
            aria-label={t('nav.openMenu')}
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      {/* Rendered as a sibling of <header>, not a descendant — backdrop-blur on
          the header creates a containing block for fixed children, which would
          otherwise clip these to the header's own height instead of the viewport. */}
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
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={closeDrawer} className={drawerNavLinkClassName}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-4">
          <LanguageSwitcher className="w-full justify-center" />
          <LogoutButton
            onClick={handleLogout}
            isLoggingOut={isLoggingOut}
            label={t('nav.logout')}
            loggingOutLabel={t('nav.loggingOut')}
            className="w-full"
          />
        </div>
      </div>
    </>
  )
}
