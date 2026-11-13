import { NavLink } from 'react-router-dom'
import { useContact } from '../context/ContactContext'
import { useBasePath } from '../hooks/useBasePath'
import styles from './Header.module.css'

type Props = {
  variant?: 'glass' | 'solid'
  active?: 'films' | 'stills' | 'about' | null
}

export function Header({ variant = 'glass', active = null }: Props) {
  const { openContact } = useContact()
  const base = useBasePath()

  function onCta() {
    const form = document.getElementById('contact-strip')
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    openContact()
  }

  return (
    <header className={`${styles.header} ${variant === 'solid' ? styles.solid : styles.glass}`}>
      <NavLink to={base || '/'} className={styles.logo} end>
        <img src="/assets/header-logo.svg" alt="Khachik Media" width={146} height={50} />
      </NavLink>
      <nav className={styles.nav}>
        <NavLink
          to={`${base}/films`}
          className={`${styles.navItem} ${active === 'films' ? styles.active : ''}`}
        >
          Films
        </NavLink>
        <NavLink
          to={`${base}/stills`}
          className={`${styles.navItem} ${active === 'stills' ? styles.active : ''}`}
        >
          Stills
        </NavLink>
        <NavLink
          to={`${base}/about`}
          className={`${styles.navItem} ${active === 'about' ? styles.active : ''}`}
        >
          About
        </NavLink>
      </nav>
      <button type="button" className={styles.cta} onClick={onCta}>
        Meri bhi video banado
      </button>
    </header>
  )
}
