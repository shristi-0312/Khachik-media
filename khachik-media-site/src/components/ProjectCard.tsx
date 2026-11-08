import { Link } from 'react-router-dom'
import type { Project } from '../data/content'
import { useBasePath } from '../hooks/useBasePath'
import styles from './ProjectCard.module.css'

type Props = {
  project: Project
  layout: 'horizontal' | 'vertical'
  tone?: 'gray' | 'red'
  showPlay?: boolean
}

export function ProjectCard({
  project,
  layout,
  tone = 'gray',
  showPlay = false,
}: Props) {
  const base = useBasePath()

  return (
    <Link
      to={`${base}/projects/${project.slug}`}
      className={`${styles.card} ${layout === 'vertical' ? styles.vertical : styles.horizontal}`}
    >
      <div
        className={`${styles.media} ${tone === 'red' ? styles.red : styles.gray}`}
      >
        {showPlay ? (
          <div className={styles.play}>
            <img src="/assets/play.svg" alt="" width={22} height={24} />
          </div>
        ) : null}
      </div>
      <div className={styles.meta}>
        <span className={styles.title}>{project.title}</span>
        <span className={styles.date}>{project.date}</span>
      </div>
    </Link>
  )
}
