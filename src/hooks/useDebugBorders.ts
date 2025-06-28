import { useEffect } from 'react'

export function useDebugBorders() {
  const toggleDebugBorders = () => {
    document.body.classList.toggle('debug-borders')
  }

  // Keyboard shortcut: Ctrl/Cmd + B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        toggleDebugBorders()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return { toggleDebugBorders }
} 