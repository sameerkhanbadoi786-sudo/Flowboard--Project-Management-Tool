import { useTilt } from '../hooks/useTilt.js'

// Wraps any element (div, Link, button) with cursor-tracking 3D tilt.
// Usage: <TiltCard as={Link} to="/x" className="project-card">...</TiltCard>
export default function TiltCard({ as: Component = 'div', className = '', style, tilt, children, ...rest }) {
  const { ref, onMouseMove, onMouseLeave } = useTilt(tilt)

  return (
    <Component
      ref={ref}
      className={`tilt-3d ${className}`}
      style={style}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      {...rest}
    >
      {children}
    </Component>
  )
}
