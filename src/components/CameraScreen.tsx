'use client'

import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { screenNameAtom, selectedCameraAtom, navigateToLandingAtom } from '../store/atoms'
import { useCamera } from '../hooks/useCamera'

function CameraScreen() {
  const screenName = useAtomValue(screenNameAtom)
  const [selectedCamera, setSelectedCamera] = useAtom(selectedCameraAtom)
  const navigateToLanding = useSetAtom(navigateToLandingAtom)
  
  const { videoRef, stream, error, isLoading, stopStream } = useCamera(selectedCamera)

  const handleEndMeeting = () => {
    console.log('🔴 User clicked End - stopping camera immediately')
    
    // Explicitly stop camera first
    stopStream()
    
    // Then navigate away (this will also trigger cleanup via selectedCamera = null)
    navigateToLanding()
  }

  // Dynamic button text based on camera state
  const frontButtonText = selectedCamera === null ? 'LOOK AT ME' : 'ME'
  const backButtonText = selectedCamera === null ? 'LOOK AT YOU' : 'YOU'

  const renderVideoContent = () => {
    if (error) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-red-400">
            <div className="text-3xl mb-2">⚠️</div>
            <p className="text-sm">Camera Error</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )
    }

    if (isLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-3xl mb-2">📹</div>
            <p>Starting camera...</p>
          </div>
        </div>
      )
    }

    if (selectedCamera && stream) {
      return (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            selectedCamera === 'front' ? 'scale-x-[-1]' : ''
          }`}
        />
      )
    }

    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-3xl mb-2">📷</div>
          <p>Select a camera to start</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Video Feed Area - SQUARE ASPECT RATIO for consistency */}
      <div className="flex-1 p-4 pb-0 flex items-center justify-center">
        <div className="relative w-full max-w-lg aspect-square bg-gray-900 border-2 border-gray-600 rounded-lg overflow-hidden">
          {/* Video content */}
          {renderVideoContent()}
          
          {/* Screen name overlay (bottom left of video) */}
          <div className="absolute bottom-0 left-0 bg-black bg-opacity-80 px-2 py-1 text-white text-sm font-medium">
            {screenName}
          </div>
        </div>
      </div>

      {/* Alert Zone - Fixed height to prevent layout shifts */}
      <div className="px-4 h-16 min-h-16 flex items-center justify-center flex-shrink-0">
        {/* Alert content will go here - currently empty */}
                  <div className="text-center text-gray-500 w-full">
            <p className="px-2">
              <span className="font-bold text-red-500 text-xs sm:text-sm md:text-base break-words">YOU ARE THE EMPLOYEE OF THE MONTH !!!</span>
            </p>
          </div>
      </div>    

      {/* Camera Selection Buttons */}
      <div className="p-4 pt-2">
        <div className="flex gap-4 mb-4 justify-center">
          <button
            onClick={() => setSelectedCamera('front')}
            className={`w-full max-w-xs p-4 text-lg font-bold rounded-lg border-2 cursor-pointer ${
              selectedCamera === 'front'
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-600 text-white hover:border-blue-500'
            }`}
          >
            {frontButtonText}
          </button>
          
          <button
            onClick={() => setSelectedCamera('back')}
            className={`w-full max-w-xs p-4 text-lg font-bold rounded-lg border-2 cursor-pointer ${
              selectedCamera === 'back'
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-600 text-white hover:border-blue-500'
            }`}
          >
            {backButtonText}
          </button>
        </div>

        {/* End button in bottom right */}
        <div className="flex justify-end">
          <button
            onClick={handleEndMeeting}
            className="bg-red-500 text-white px-6 py-2 rounded-full font-bold hover:bg-red-600 cursor-pointer"
          >
            End
          </button>
        </div>
      </div>
    </div>
  )
}

export default CameraScreen 