import { CONTENT } from '../data/content'

export function Header() {
  return (
    <header className="hdr">
      <div className="hdr__block hdr__block--left">
        <div className="hdr__row">
          {CONTENT.navLeft.map((label) => (
            <button key={label} className="hdr__nav" type="button">
              {label}
            </button>
          ))}
        </div>
        <div className="hdr__mascot" aria-hidden="true">
          <Mascot />
        </div>
      </div>

      <div className="hdr__cell hdr__cell--tag">
        <span className="hdr__tagline">{CONTENT.taglineLeft}</span>
      </div>

      <div className="hdr__cell hdr__cell--logo">
        <h1 className="hdr__logo">
          <span className="hdr__logo-sans">{CONTENT.brand}</span>{' '}
          <span className="hdr__logo-serif">{CONTENT.brandItalic}</span>
        </h1>
      </div>

      <div className="hdr__cell hdr__cell--tag">
        <span className="hdr__tagline">{CONTENT.taglineRight}</span>
      </div>

      <div className="hdr__block hdr__block--right">
        <div className="hdr__row">
          {CONTENT.navRight.map((label) => (
            <a key={label} className="hdr__nav" href="#">
              {label}
            </a>
          ))}
        </div>
        <div className="hdr__cta-cell">
          <a className="hdr__cta" href="#">
            {CONTENT.cta}
          </a>
        </div>
      </div>
    </header>
  )
}

/** Tiny placeholder mascot – a waving flame. Replace with your own SVG/PNG. */
function Mascot() {
  return (
    <svg viewBox="0 0 48 56" width="40" height="46" fill="none">
      <path
        d="M24 4c3 8 12 12 12 24a12 12 0 1 1-24 0c0-5 2-8 4-11 1 5 3 7 6 7 0-8-1-14 2-20Z"
        fill="#ff3831"
      />
      <path d="M24 20c2 4 6 6 6 11a6 6 0 1 1-12 0c0-3 1-5 2-7 .6 2.4 1.6 3.5 3 3.5 0-3-.4-5 1-7.5Z" fill="#ffd23f" />
      <circle cx="20" cy="31" r="1.6" fill="#181616" />
      <circle cx="27" cy="31" r="1.6" fill="#181616" />
      <path d="M36 30c4-2 6-6 6-10" stroke="#ff3831" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 46v6M30 46v6" stroke="#ff3831" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
