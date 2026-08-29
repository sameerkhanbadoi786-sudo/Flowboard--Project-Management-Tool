import { useEffect, useRef, useState } from 'react'
import { FiDownload, FiFileText, FiFile } from 'react-icons/fi'
import '../styles/ExportMenu.css'

export default function ExportMenu({ label = 'Export', onExportPDF, onExportDocx, disabled }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const run = async (fn) => {
    setBusy(true)
    setOpen(false)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="export-menu-wrap" ref={ref}>
      <button
        type="button"
        className="btn btn-secondary export-menu-btn"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || busy}
      >
        <FiDownload /> {busy ? 'Exporting…' : label}
      </button>
      {open && (
        <div className="export-menu-panel">
          <button type="button" className="export-menu-item" onClick={() => run(onExportPDF)}>
            <FiFileText size={14} /> Export as PDF
          </button>
          <button type="button" className="export-menu-item" onClick={() => run(onExportDocx)}>
            <FiFile size={14} /> Export as Word (.docx)
          </button>
        </div>
      )}
    </div>
  )
}
