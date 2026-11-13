import { useState, type FormEvent } from 'react'
import styles from './ContactStrip.module.css'

export function ContactStrip() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [idea, setIdea] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
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
        />
      </label>
      <label className={`${styles.field} ${styles.idea}`}>
        <span className={styles.label}>Your Big Idea (Optional)</span>
        <input
          className={styles.input}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Type your message"
        />
      </label>
      <button type="submit" className={styles.submit}>
        <img src="/assets/btn-chevron-left.svg" alt="" width={6} height={11} />
        <span>Meri bhi video banadao</span>
        <span className={styles.chevronRight}>
          <img src="/assets/btn-chevron-right.svg" alt="" width={6} height={11} />
        </span>
      </button>
    </form>
  )
}
