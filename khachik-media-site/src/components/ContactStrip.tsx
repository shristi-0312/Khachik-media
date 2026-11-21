import { useState, type FormEvent } from 'react'
import { submitContact } from '../api/client'
import styles from './ContactStrip.module.css'

export function ContactStrip() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [idea, setIdea] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (sending) return
    setSending(true)
    setError('')
    try {
      await submitContact({
        name,
        phone,
        message: idea,
        source: 'contact-strip',
      })
      setName('')
      setPhone('')
      setIdea('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <form id="contact-strip" className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>Full Name*</span>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Vala Dhruvraj Sinh"
          required
          disabled={sending}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Phone Number*</span>
        <input
          className={`${styles.input} ${styles.inputPhone}`}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="6352878787"
          required
          disabled={sending}
        />
      </label>
      <label className={`${styles.field} ${styles.idea}`}>
        <span className={styles.label}>Your Big Idea (Optional)</span>
        <input
          className={styles.input}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Type your message"
          disabled={sending}
        />
      </label>
      <button type="submit" className={styles.submit} disabled={sending}>
        <img src="/assets/btn-chevron-left.svg" alt="" width={6} height={11} />
        <span>CAN WE WORK TOGETHER 👉👈</span>
        <span className={styles.chevronRight}>
          <img src="/assets/btn-chevron-right.svg" alt="" width={6} height={11} />
        </span>
      </button>
      {error ? (
        <p className={styles.statusError} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
