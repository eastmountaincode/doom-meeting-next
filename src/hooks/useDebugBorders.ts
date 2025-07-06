import { useEffect } from 'react'

// Toggle this to true/false to control default debug border state
const DEBUG_BORDERS_DEFAULT_ON = false

export function useDebugBorders() {
  const toggleDebugBorders = () => {
    document.body.classList.toggle('debug-borders')
  }

  // Enable debug borders by default on mount if flag is true
  useEffect(() => {
    if (DEBUG_BORDERS_DEFAULT_ON) {
      document.body.classList.add('debug-borders')
    } else {
      document.body.classList.remove('debug-borders')
    }
    // Cleanup: remove debug borders when component unmounts
    return () => {
      document.body.classList.remove('debug-borders')
    }
  }, [])

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