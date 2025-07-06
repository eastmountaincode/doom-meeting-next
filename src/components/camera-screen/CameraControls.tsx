'use client'

interface CameraControlsProps {
  selectedCamera: 'front' | 'back' | null
  onCameraSwitch: (facingMode: 'front' | 'back') => void
  onEndMeeting: () => void
}

export default function CameraControls({ 
  selectedCamera, 
  onCameraSwitch, 
  onEndMeeting 
}: CameraControlsProps) {
  // Dynamic button text based on camera state
  const frontButtonText = selectedCamera === null ? 'LOOK AT ME' : 'ME'
  const backButtonText = selectedCamera === null ? 'LOOK AT YOU' : 'YOU'

  return (
    <div className="pt-2 sm:pt-3 space-y-2 sm:space-y-3">
      <div className="flex gap-2 sm:gap-3 justify-center">
        <button
          onClick={() => onCameraSwitch('front')}
          className={`w-full max-w-xs py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base font-bold rounded-lg border-2 cursor-pointer ${
            selectedCamera === 'front'
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'bg-gray-800 border-gray-600 text-white hover:border-blue-500'
          }`}
        >
          {frontButtonText}
        </button>
        
        <button
          onClick={() => onCameraSwitch('back')}
          className={`w-full max-w-xs py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base font-bold rounded-lg border-2 cursor-pointer ${
            selectedCamera === 'back'
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'bg-gray-800 border-gray-600 text-white hover:border-blue-500'
          }`}
        >
          {backButtonText}
        </button>
      </div>

      {/* End button */}
      <div className="flex justify-end pt-1 sm:pt-2">
        <button
          onClick={onEndMeeting}
          className="bg-red-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold hover:bg-red-600 cursor-pointer text-sm sm:text-base"
        >
          End
        </button>
      </div>
    </div>
  )
} 