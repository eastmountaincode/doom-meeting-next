import { useState, useEffect, useRef } from 'react'
import { hslToHex, interpolateColors } from '../lib/colorUtils'

interface ColorSystemState {
  backgroundColor: string
  colorCycleActive: boolean
  colorCycleSaturation: number
  colorCycleLightness: number
  colorCycleSpeed: number
  colorCycleStartTime: number
  isTransitioning: boolean
  transitionStartColor: string
  transitionTargetColor: string
  transitionStartTime: number
}

interface ColorSystemActions {
  setBackgroundColor: (color: string) => void
  setColorCycleActive: (active: boolean) => void
  setColorCycleSaturation: (saturation: number) => void
  setColorCycleLightness: (lightness: number) => void
  setColorCycleSpeed: (speed: number) => void
  setColorCycleStartTime: (time: number) => void
  startColorTransition: (targetColor: string) => void
  getCurrentDisplayedColor: () => string
  sendColorUpdateToAdmin: (color: string) => Promise<void>
}

export function useColorSystem(): ColorSystemState & ColorSystemActions {
  const [backgroundColor, setBackgroundColor] = useState<string>('#000000')
  const [colorCycleActive, setColorCycleActive] = useState(false)
  const [colorCycleSaturation, setColorCycleSaturation] = useState(0)
  const [colorCycleLightness, setColorCycleLightness] = useState(100)
  const [colorCycleSpeed, setColorCycleSpeed] = useState(30)
  const [colorCycleStartTime, setColorCycleStartTime] = useState(0)
  
  // Color transition state
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionStartColor, setTransitionStartColor] = useState('#000000')
  const [transitionTargetColor, setTransitionTargetColor] = useState('#000000')
  const [transitionStartTime, setTransitionStartTime] = useState(0)
  const transitionDuration = 1000 // 1000ms transition (1 second)
  
  const colorCycleRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const currentDisplayedColorRef = useRef<string>('#000000')
  
  // Function to send current color back to admin
  const sendColorUpdateToAdmin = async (color: string) => {
    try {
      await fetch('/api/admin/trigger-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'DISPLAY_COLOR_UPDATE',
          backgroundColor: color,
        }),
      })
    } catch (error) {
      console.error('Failed to send color update to admin:', error)
    }
  }
  
  // Function to start color transition
  const startColorTransition = (targetColor: string) => {
    const currentColor = currentDisplayedColorRef.current
    console.log('Starting transition from:', currentColor, 'to:', targetColor)
    setTransitionStartColor(currentColor)
    setTransitionTargetColor(targetColor)
    setTransitionStartTime(Date.now())
    setIsTransitioning(true)
    setColorCycleActive(false)
    colorCycleRef.current = false
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
  }
  
  // Function to get current displayed color
  const getCurrentDisplayedColor = () => currentDisplayedColorRef.current
  
  // Color cycling animation
  useEffect(() => {
    if (!colorCycleActive || isTransitioning) {
      colorCycleRef.current = false
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      return
    }
    
    colorCycleRef.current = true
    const animate = () => {
      if (!colorCycleRef.current || isTransitioning) return
      const now = Date.now()
      const elapsed = now - colorCycleStartTime
      const hue = (elapsed / colorCycleSpeed) % 360
      const hexColor = hslToHex(hue, colorCycleSaturation, colorCycleLightness)
      setBackgroundColor(hexColor)
      currentDisplayedColorRef.current = hexColor
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animate()
    
    return () => {
      colorCycleRef.current = false
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [colorCycleActive, colorCycleSaturation, colorCycleLightness, colorCycleSpeed, colorCycleStartTime, isTransitioning])

  // Color transition animation
  useEffect(() => {
    if (!isTransitioning) return
    
    const animateTransition = () => {
      const now = Date.now()
      const elapsed = now - transitionStartTime
      const progress = Math.min(elapsed / transitionDuration, 1)
      
      // Use ease-in-out easing
      const easedProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2
      
      const currentColor = interpolateColors(transitionStartColor, transitionTargetColor, easedProgress)
      setBackgroundColor(currentColor)
      
      if (progress < 1) {
        requestAnimationFrame(animateTransition)
      } else {
        setIsTransitioning(false)
      }
    }
    
    animateTransition()
  }, [isTransitioning, transitionStartColor, transitionTargetColor, transitionStartTime, transitionDuration])

  // Track the actual displayed color whenever backgroundColor changes
  useEffect(() => {
    currentDisplayedColorRef.current = backgroundColor
  }, [backgroundColor])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  return {
    // State
    backgroundColor,
    colorCycleActive,
    colorCycleSaturation,
    colorCycleLightness,
    colorCycleSpeed,
    colorCycleStartTime,
    isTransitioning,
    transitionStartColor,
    transitionTargetColor,
    transitionStartTime,
    
    // Actions
    setBackgroundColor,
    setColorCycleActive,
    setColorCycleSaturation,
    setColorCycleLightness,
    setColorCycleSpeed,
    setColorCycleStartTime,
    startColorTransition,
    getCurrentDisplayedColor,
    sendColorUpdateToAdmin,
  }
} 