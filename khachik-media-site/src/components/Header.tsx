import { useEffect, useId, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useContact } from '../context/ContactContext'
import { useBasePath } from '../hooks/useBasePath'
import styles from './Header.module.css'

type Props = {
  variant?: 'glass' | 'solid'
  active?: 'films' | 'stills' | 'about' | null
  /**
   * Set when the header tops the contact screen: the red button closes it
   * (a phone has no Escape key) and so does following a link.
   */
  onClose?: () => void
}

const LINKS = [
  { id: 'films', label: 'Films' },
  { id: 'stills', label: 'Stills' },
  { id: 'about', label: 'About' },
] as const

export function Header({ variant = 'glass', active = null, onClose }: Props) {
  const { openContact } = useContact()
  const base = useBasePath()
  const menuId = useId()
  /** Phones fold the links and the button under a Menu toggle. */
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  function onLink() {
    setMenuOpen(false)
    onClose?.()
  }

  function onCta() {
    setMenuOpen(false)
    // Same Start a Project flow — Hindi CTA is just the quote-effect label.
    if (onClose) onClose()
    else openContact()
  }

  const className = [
    styles.header,
    variant === 'solid' ? styles.solid : styles.glass,
    onClose ? styles.closing : '',
    menuOpen ? styles.open : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <header className={className}>
      <NavLink to={base || '/'} className={styles.logo} end onClick={onLink}>
        <img src="/assets/header-logo.svg" alt="Khachik Media" width={146} height={50} />
      </NavLink>
      <div id={menuId} className={styles.menu}>
        <nav className={styles.nav}>
          {LINKS.map((link) => (
            <NavLink
              key={link.id}
              to={`${base}/${link.id}`}
              className={`${styles.navItem} ${active === link.id ? styles.active : ''}`}
              onClick={onLink}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className={styles.cta} onClick={onCta}>
          {onClose ? 'Close' : 'CAN WE WORK TOGETHER 👉👈'}
        </button>
      </div>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={() => setMenuOpen((v) => !v)}
      >
        {menuOpen ? 'Close' : 'Menu'}
      </button>
    </header>
  )
}
