'use client'

import { useAtomValue } from 'jotai'
import { currentScreenAtom } from '../store/atoms'
import { useDebugBorders } from '../hooks/useDebugBorders'
import LandingScreen from '../components/LandingScreen'
import CameraScreen from '../components/CameraScreen'

export default function Home() {
  const currentScreen = useAtomValue(currentScreenAtom)
  
  // Initialize debug borders functionality
  useDebugBorders()

  return (
    <>
      {currentScreen === 'landing' && <LandingScreen />}
      {currentScreen === 'camera' && <CameraScreen />}
    </>
  )
}
