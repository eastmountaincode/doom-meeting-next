import { useState, useEffect } from 'react'

export function useCanvasSize() {
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 480 })
  
  useEffect(() => {
    const updateSize = () => {
      const maxWidth = window.innerWidth // Full viewport width
      const maxHeight = window.innerHeight // Full viewport height
      
      setCanvasSize({ 
        width: Math.round(maxWidth), 
        height: Math.round(maxHeight) 
      })
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])
  
  return canvasSize
} 