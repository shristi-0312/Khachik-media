import { Link } from 'react-router-dom'
import { useContact } from '../context/ContactContext'
import { useBasePath } from '../hooks/useBasePath'
import styles from './Footer.module.css'

export function Footer() {
  const { openContact } = useContact()
  const base = useBasePath()

  return (
    <footer className={styles.footer}>
      <Link to={base || '/'} className={styles.logo}>
        KHACHIK MEDIA
      </Link>
      <nav className={styles.nav}>
        <Link to={`${base}/projects`} className={styles.navItem}>
          Projects
        </Link>
        <Link to={`${base}/about`} className={styles.navItem}>
          About
        </Link>
      </nav>
      <div className={styles.socials}>
        <a
          className={styles.social}
          href="https://instagram.com"
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram"
        >
          <img src="/assets/social-instagram.svg" alt="" width={16} height={16} />
        </a>
        <a
          className={styles.social}
          href="https://x.com"
          target="_blank"
          rel="noreferrer"
          aria-label="X"
        >
          <img src="/assets/social-x.svg" alt="" width={16} height={16} />
        </a>
        <a
          className={styles.social}
          href="https://youtube.com"
          target="_blank"
          rel="noreferrer"
          aria-label="YouTube"
        >
          <img src="/assets/social-youtube.svg" alt="" width={16} height={16} />
        </a>
      </div>
      <button type="button" className={styles.cta} onClick={openContact}>
        Start a project
      </button>
    </footer>
  )
}
