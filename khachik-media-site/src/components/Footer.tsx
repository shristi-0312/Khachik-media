import { Link } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { useContact } from '../context/ContactContext'
import { useBasePath } from '../hooks/useBasePath'
import { FrameCorners } from './FrameCorners'
import styles from './Footer.module.css'

export function Footer() {
  const { openContact } = useContact()
  const base = useBasePath()

  function onContact(e: MouseEvent) {
    e.preventDefault()
    const form = document.getElementById('contact-strip')
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    openContact()
  }

  return (
    <div className={styles.shell}>
      <footer className={styles.footer}>
        <FrameCorners showEdges edgeOffset={400} />
        <Link to={base || '/'} className={styles.logoPanel}>
          <img
            className={styles.logo}
            src="/assets/footer-logo.svg"
            alt="Khachik Media"
            width={336}
            height={112}
          />
        </Link>
        <p className={styles.copyright}>Khachik Media © 2026</p>
        <div className={styles.columns}>
          <div className={styles.col}>
            <p className={styles.heading}>[Company]</p>
            <div className={styles.links}>
              <Link to={`${base}/films`}>Films</Link>
              <Link to={`${base}/stills`}>Stills</Link>
              <Link to={`${base}/about`}>About</Link>
              <a href="#contact-strip" onClick={onContact}>
                Contact
              </a>
            </div>
          </div>
          <div className={`${styles.col} ${styles.support}`}>
            <p className={styles.heading}>[Support]</p>
            <div className={styles.links}>
              <a href="#terms">Terms &amp; Conditions</a>
              <a href="#privacy">Privacy Policy</a>
            </div>
          </div>
          <div className={styles.col}>
            <p className={styles.heading}>[Contact]</p>
            <div className={styles.links}>
              <a href="mailto:info@khachikmedia.com">info@khachikmedia.com</a>
              <a href="mailto:shivansh@khachikmedia.com">shivansh@khachikmedia.com</a>
            </div>
          </div>
          <div className={styles.col}>
            <p className={styles.heading}>[Follow]</p>
            <div className={styles.links}>
              <a href="https://instagram.com" target="_blank" rel="noreferrer">
                Instagram
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer">
                Youtube
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
