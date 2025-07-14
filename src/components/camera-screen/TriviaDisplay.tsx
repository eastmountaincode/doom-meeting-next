'use client'

import { HiSparkles } from 'react-icons/hi2'
import { VideoTrack, type TrackReference } from '@livekit/components-react'

interface TriviaDisplayProps {
    question: string
    choices: string[]
    correctAnswer: number
    topicName: string
    localVideoTrack?: TrackReference | null
    selectedCamera?: 'front' | 'back' | null
}

export default function TriviaDisplay({ 
    question, 
    choices, 
    correctAnswer, 
    topicName,
    localVideoTrack,
    selectedCamera
}: TriviaDisplayProps) {
    
    const renderVideoContent = () => {
        if (localVideoTrack && localVideoTrack.publication) {
            return (
                <VideoTrack
                    trackRef={localVideoTrack}
                    className={`w-full h-full object-cover ${
                        selectedCamera === 'front' ? 'scale-x-[-1]' : ''
                    }`}
                />
            )
        }

        if (selectedCamera) {
            return (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-gray-400">
                        <p>Starting camera...</p>
                    </div>
                </div>
            )
        }

        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                    <p>Select a camera to start</p>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex justify-center z-50 p-4 overflow-y-auto">
            <div className="w-full max-w-4xl mx-auto flex flex-col py-4">
                {/* Video Feed Header */}
                <div className="w-full mb-4 flex justify-center">
                    <div className="relative w-64 h-64 bg-gray-900 border-2 border-gray-600 rounded-lg overflow-hidden">
                        {renderVideoContent()}

                    </div>
                </div>

                {/* Question */}
                <div className="bg-gray-800 rounded-xl p-4 mb-4 border-2 border-blue-500 shadow-lg">
                    <h2 className="text-lg md:text-xl font-semibold text-white text-center leading-relaxed">
                        {question}
                    </h2>
                </div>

                {/* Answer Choices */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {choices.map((choice, index) => (
                        <div
                            key={index}
                            className="p-3 rounded-lg border-2 bg-gray-700 border-gray-500 text-gray-100 hover:shadow-lg transition-all duration-300"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold bg-gray-600 text-gray-200 text-sm">
                                    {String.fromCharCode(65 + index)}
                                </div>
                                <span className="text-base font-medium">
                                    {choice.replace(/^[A-D]\)\s*/, '')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
} 