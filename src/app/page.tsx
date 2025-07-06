'use client'

import { useAtomValue } from 'jotai'
import { currentScreenAtom } from '../store'
import { useDebugBorders } from '../hooks/useDebugBorders'
import { useEffect } from 'react'
import LandingScreen from '../components/LandingScreen'
import CameraScreen from '../components/camera-screen'

export default function Home() {
  const currentScreen = useAtomValue(currentScreenAtom)
  
  // Initialize debug borders functionality
  useDebugBorders()

  // Apply no-scroll class to body for landing/camera screens
  useEffect(() => {
    document.body.classList.add('no-scroll-page')
    
    return () => {
      document.body.classList.remove('no-scroll-page')
    }
  }, [])

  return (
    <>
      {currentScreen === 'landing' && <LandingScreen />}
      {currentScreen === 'camera' && <CameraScreen />}
    </>
  )
}
