import { useEffect, useState } from 'react'

// Tracks whether the page has scrolled past a small threshold — drives the
// sticky navbar's transition from its flush top-of-page look into the
// inset/floating scrolled style. The threshold (not >0) avoids flickering
// from 1px scroll-bounce/rubber-banding right at the top.
export function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(() => window.scrollY > threshold)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > threshold)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return scrolled
}
