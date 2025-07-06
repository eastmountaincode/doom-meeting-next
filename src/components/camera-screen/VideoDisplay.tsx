'use client'

interface VideoDisplayProps {
  screenName: string
  renderVideoContent: () => React.ReactNode
}

export default function VideoDisplay({ 
  screenName, 
  renderVideoContent 
}: VideoDisplayProps) {
  return (
    <div className="flex-1 p-1 sm:p-2 pb-0 flex items-center justify-center min-h-0">
      <div className="relative w-full max-w-xs sm:max-w-md aspect-square bg-gray-900 border-2 border-gray-600 rounded-lg overflow-hidden">
        {/* Video content */}
        {renderVideoContent()}
        
        {/* Screen name overlay (bottom left of video) */}
        <div className="absolute bottom-0 left-0 bg-black bg-opacity-80 px-2 py-1 text-white text-sm font-medium">
          {screenName}
        </div>
      </div>
    </div>
  )
} 