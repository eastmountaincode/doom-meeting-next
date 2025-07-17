'use client'

import { VideoTrack, type TrackReference } from '@livekit/components-react'
import { useState, useEffect } from 'react'
import type Pusher from 'pusher-js'

interface TriviaDisplayProps {
    question: string
    choices: string[]
    correctAnswer: number
    topicName: string
    localVideoTrack?: TrackReference | null
    selectedCamera?: 'front' | 'back' | null
    onAnswerSelected?: (selectedIndex: number, isCorrect: boolean) => void
    participantId?: string
}

export default function TriviaDisplay({ 
    question, 
    choices, 
    correctAnswer,
    localVideoTrack,
    selectedCamera,
    onAnswerSelected,
    participantId
}: TriviaDisplayProps) {
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
    const [showFeedback, setShowFeedback] = useState(false)
    const [isCorrect, setIsCorrect] = useState(false)
    const [answerRevealed, setAnswerRevealed] = useState(false)
    
    // Listen for reveal answer events
    useEffect(() => {
        let pusher: Pusher | null = null
        let channel: ReturnType<Pusher['subscribe']> | null = null

        const connectToPusher = async () => {
            try {
                const PusherConstructor = (await import('pusher-js')).default
                pusher = new PusherConstructor(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
                    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
                })
                
                channel = pusher.subscribe('display-channel')
                
                // Listen for reveal answer event
                channel.bind('trivia-reveal-answer', (data: { eventType: string }) => {
                    console.log('TriviaDisplay received trivia-reveal-answer:', data)
                    if (data.eventType === 'TRIVIA_QUESTION') {
                        setAnswerRevealed(true)
                    }
                })
                
            } catch (error) {
                console.error('Failed to initialize Pusher in TriviaDisplay:', error)
            }
        }

        connectToPusher()

        return () => {
            if (channel) {
                channel.unbind_all()
                pusher?.unsubscribe('display-channel')
            }
            if (pusher) {
                pusher.disconnect()
            }
        }
    }, [])
    
    const handleAnswerSelect = async (answerIndex: number) => {
        if (selectedAnswer !== null) return // Prevent multiple selections
        
        const correct = answerIndex === correctAnswer
        setSelectedAnswer(answerIndex)
        setIsCorrect(correct)
        setShowFeedback(true)
        
        // Submit answer to server
        try {
            const actualParticipantId = participantId || localStorage.getItem('participantId') || `participant_${Date.now()}`
            
            const response = await fetch('/api/admin/trivia-answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'submit-answer',
                    participantId: actualParticipantId,
                    selectedAnswer: answerIndex,
                }),
            })
            
            const result = await response.json()
            
            if (result.success) {
                console.log('Answer submitted successfully:', result)
            } else {
                console.error('Failed to submit answer:', result.error)
            }
        } catch (error) {
            console.error('Error submitting answer:', error)
        }
        
        // Notify parent component
        onAnswerSelected?.(answerIndex, correct)
        
        // No auto-return - user stays on this screen until admin stops trivia
    }
    
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
                    {choices.map((choice, index) => {
                        const isSelected = selectedAnswer === index
                        const isCorrectAnswer = index === correctAnswer
                        const shouldShowAsCorrect = showFeedback && answerRevealed && isCorrectAnswer
                        const shouldShowAsWrong = showFeedback && answerRevealed && isSelected && !isCorrectAnswer
                        const shouldShowAsSelected = isSelected && !answerRevealed
                        
                        return (
                            <button
                                key={index}
                                onClick={() => handleAnswerSelect(index)}
                                disabled={selectedAnswer !== null}
                                className={`p-3 rounded-lg border-2 transition-all duration-300 ${
                                    shouldShowAsCorrect 
                                        ? 'bg-green-600 border-green-400 text-white' 
                                        : shouldShowAsWrong 
                                        ? 'bg-red-600 border-red-400 text-white' 
                                        : shouldShowAsSelected
                                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                                        : selectedAnswer === null 
                                        ? 'bg-gray-700 border-gray-500 text-gray-100 hover:bg-gray-600 hover:border-gray-400 hover:shadow-lg cursor-pointer' 
                                        : 'bg-gray-800 border-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm ${
                                        shouldShowAsCorrect 
                                            ? 'bg-green-400 text-green-900' 
                                            : shouldShowAsWrong 
                                            ? 'bg-red-400 text-red-900' 
                                            : shouldShowAsSelected
                                            ? 'bg-blue-400 text-blue-900'
                                            : 'bg-gray-600 text-gray-200'
                                    }`}>
                                        {shouldShowAsCorrect ? '✓' : shouldShowAsWrong ? '✗' : String.fromCharCode(65 + index)}
                                    </div>
                                    <span className="text-base font-medium">
                                        {choice.replace(/^[A-D]\)\s*/, '')}
                                    </span>
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Feedback Message */}
                {showFeedback && (
                    <div className="text-center mt-4">
                        {answerRevealed ? (
                            <>
                                <div className={`text-xl font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                    {isCorrect ? '🎉 Correct!' : '❌ Wrong Answer'}
                                </div>
                                {!isCorrect && (
                                    <div className="text-gray-300 mt-2">
                                        The correct answer was: <span className="font-semibold text-green-400">
                                            {String.fromCharCode(65 + correctAnswer)}) {choices[correctAnswer].replace(/^[A-D]\)\s*/, '')}
                                        </span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="text-lg font-medium text-blue-400">
                                    📝 Answer Submitted
                                </div>
                            </>
                        )}
                    </div>
                                 )}
             </div>
         </div>
    )
} 