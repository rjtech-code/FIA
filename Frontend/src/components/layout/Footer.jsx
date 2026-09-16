import { useLanguage } from '../../hooks/useLanguage'

export default function Footer({ label }) {
  const { t } = useLanguage()
  const resolvedLabel = label ?? t('nav.adminPanelTitle')

  return (
    <footer className="relative overflow-hidden bg-brand-700">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-accent-400" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-4 py-5 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-medium text-white/90">{t('footer.copyright', { label: resolvedLabel })}</p>
        <p className="mt-0.5 text-xs text-brand-200">{t('footer.poweredBy')}</p>
      </div>
    </footer>
  )
}
