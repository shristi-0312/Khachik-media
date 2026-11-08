interface Props {
  items: string[]
}

export function Ticker({ items }: Props) {
  const line = items.map((t) => t.toUpperCase()).join('  •  ') + '  •  '
  return (
    <div className="ticker" aria-label="News ticker">
      <div className="ticker__track">
        <span className="ticker__text">{line}</span>
        <span className="ticker__text" aria-hidden="true">
          {line}
        </span>
      </div>
    </div>
  )
}
