export default function ProgressBar({ percent = 0, showLabel = true, size = 'md' }) {
  const clamped = Math.max(0, Math.min(100, percent))

  return (
    <div className={`progress-wrap progress-${size}`}>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
      {showLabel && <span className="progress-label">{clamped}%</span>}
    </div>
  )
}
