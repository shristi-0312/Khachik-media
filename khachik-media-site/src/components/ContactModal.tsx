import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { submitContact } from '../api/client'
import { TESTIMONIALS } from '../data/content'
import { useContact } from '../context/ContactContext'
import { Header } from './Header'
import styles from './ContactModal.module.css'

export function ContactModal() {
  const { open, closeContact } = useContact()
  const location = useLocation()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [agreed, setAgreed] = useState(true)
  const [index, setIndex] = useState(0)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    closeContact()
  }, [location.pathname, closeContact])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContact()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, closeContact])

  if (!open) return null

  const t = TESTIMONIALS[index % TESTIMONIALS.length]

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!agreed || sending) return
    setSending(true)
    setError('')
    try {
      await submitContact({
        name,
        phone,
        message,
        source: 'contact-modal',
      })
      setName('')
      setPhone('')
      setMessage('')
      closeContact()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.shell}>
        <Header />
        <div className={styles.card}>
          <div className={styles.left}>
            <div className={styles.leftInner}>
              <div className={styles.copyBlock}>
                <h2 className={styles.headline}>
                  Big Idea? You know
                  <br />
                  where to find us.
                </h2>
                <p className={styles.sub}>
                  Schedule an introductory call to discuss your next idea and
                  learn more about how can we help with the project.
                </p>
              </div>
              <div className={styles.testimonial}>
                <div className={styles.testimonialInner}>
                  <img src="/assets/quote.svg" alt="" width={42} height={42} />
                  <p className={styles.quote}>{t.quote}</p>
                  <div className={styles.attribution}>
                    <div>{t.name}</div>
                    <div className={styles.role}>{t.role}</div>
                  </div>
                </div>
                <div className={styles.testimonialNav}>
                  <button
                    type="button"
                    onClick={() =>
                      setIndex(
                        (i) =>
                          (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length,
                      )
                    }
                    aria-label="Previous testimonial"
                  >
                    <img
                      src="/assets/nav-prev.svg"
                      alt=""
                      width={32}
                      height={32}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setIndex((i) => (i + 1) % TESTIMONIALS.length)
                    }
                    aria-label="Next testimonial"
                  >
                    <img
                      src="/assets/nav-next.svg"
                      alt=""
                      width={32}
                      height={32}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.field}>
              <span>Full Name*</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vala Dhruvraj Sinh"
                required
              />
            </label>
            <label className={styles.field}>
              <span>Phone Number*</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="6352878787"
                required
              />
            </label>
            <label className={styles.field}>
              <span>Your Big Idea (Optional)</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message"
                rows={5}
              />
            </label>
            <button type="submit" className={styles.submit} disabled={sending || !agreed}>
              <img
                src="/assets/btn-chevron-left.svg"
                alt=""
                width={6}
                height={11}
              />
              <span>CAN WE WORK TOGETHER 👉👈</span>
              <span className={styles.chevronRight}>
                <img
                  src="/assets/btn-chevron-right.svg"
                  alt=""
                  width={6}
                  height={11}
                />
              </span>
            </button>
            {error ? (
              <p className={styles.statusError} role="alert">
                {error}
              </p>
            ) : null}
            <label className={styles.consent}>
              <button
                type="button"
                className={`${styles.checkbox} ${agreed ? styles.checked : ''}`}
                onClick={() => setAgreed((v) => !v)}
                aria-pressed={agreed}
              >
                {agreed ? (
                  <img src="/assets/check.svg" alt="" width={20} height={20} />
                ) : null}
              </button>
              <span>
                By submitting this form, I agree to the{' '}
                <strong>Privacy Policy</strong>
              </span>
            </label>
          </form>
        </div>
      </div>
    </div>
  )
}
