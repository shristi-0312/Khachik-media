import { NavLink } from 'react-router-dom'
import { useContact } from '../context/ContactContext'
import { useBasePath } from '../hooks/useBasePath'
import styles from './Header.module.css'

type Props = {
  variant?: 'glass' | 'solid'
  active?: 'projects' | 'about' | null
}

export function Header({ variant = 'glass', active = null }: Props) {
  const { openContact } = useContact()
  const base = useBasePath()

  return (
    <header className={`${styles.header} ${variant === 'solid' ? styles.solid : styles.glass}`}>
      <NavLink to={base || '/'} className={styles.logo} end>
        KHACHIK MEDIA
      </NavLink>
      <nav className={styles.nav}>
        <NavLink
          to={`${base}/projects`}
          className={`${styles.navItem} ${active === 'projects' ? styles.active : ''}`}
        >
          Projects
        </NavLink>
        <NavLink
          to={`${base}/about`}
          className={`${styles.navItem} ${active === 'about' ? styles.active : ''}`}
        >
          About
        </NavLink>
      </nav>
      <button type="button" className={styles.cta} onClick={openContact}>
        Start a project
      </button>
    </header>
  )
}
