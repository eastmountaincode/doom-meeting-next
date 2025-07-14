'use client'

import { useState, useEffect } from 'react'
import { HiQuestionMarkCircle, HiPlay, HiStop } from 'react-icons/hi2'
import triviaData from '../../../../data/triviaQuestions.json'

interface TriviaControlsProps {
    triggerEvent: (eventType: string, options?: Record<string, unknown>) => Promise<void>
    isTriggering: boolean
    activeEvent: string | null
    startEvent: (eventType: string, options?: Record<string, unknown>) => Promise<void>
    stopEvent: () => Promise<void>
}

interface TriviaQuestion {
    id: string
    question: string
    choices: string[]
    correctAnswer: number
}

interface TriviaTopicData {
    name: string
    questions: TriviaQuestion[]
}

export default function TriviaControls({ 
    isTriggering, 
    activeEvent, 
    startEvent, 
    stopEvent 
}: TriviaControlsProps) {
    const [selectedTopic, setSelectedTopic] = useState<string>('')
    const [selectedQuestionId, setSelectedQuestionId] = useState<string>('')
    const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null)

    const topics = Object.keys(triviaData) as Array<keyof typeof triviaData>
    const topicData = selectedTopic ? triviaData[selectedTopic as keyof typeof triviaData] as TriviaTopicData : null

    // Update current question when selection changes
    useEffect(() => {
        if (topicData && selectedQuestionId) {
            const question = topicData.questions.find(q => q.id === selectedQuestionId)
            setCurrentQuestion(question || null)
        } else {
            setCurrentQuestion(null)
        }
    }, [selectedTopic, selectedQuestionId, topicData])

    const handleTopicChange = (topic: string) => {
        setSelectedTopic(topic)
        setSelectedQuestionId('')
        setCurrentQuestion(null)
    }

    const handleQuestionChange = (questionId: string) => {
        setSelectedQuestionId(questionId)
    }

    const handleStartTrivia = async () => {
        if (!currentQuestion) return

        await startEvent('TRIVIA_QUESTION', {
            question: currentQuestion.question,
            choices: currentQuestion.choices,
            correctAnswer: currentQuestion.correctAnswer,
            topicName: topicData?.name || 'Unknown Topic'
        })
    }

    const handleStopTrivia = async () => {
        await stopEvent()
    }

    const getCorrectAnswerLetter = (index: number) => {
        return String.fromCharCode(65 + index) // A, B, C, D
    }

    return (
        <div className="space-y-4">
            <h4 className="text-md font-semibold text-white flex items-center gap-2">
                <HiQuestionMarkCircle className="text-lg" /> Trivia Questions
            </h4>

            <div className="p-4 bg-gray-700 rounded-lg space-y-4">
                {/* Topic Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Select Topic:</label>
                    <select
                        value={selectedTopic}
                        onChange={(e) => handleTopicChange(e.target.value)}
                        className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">-- Choose a topic --</option>
                        {topics.map(topicKey => {
                            const topicInfo = triviaData[topicKey] as TriviaTopicData
                            return (
                                <option key={topicKey} value={topicKey}>
                                    {topicInfo.name}
                                </option>
                            )
                        })}
                    </select>
                </div>

                {/* Question Selection */}
                {topicData && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Select Question:</label>
                        <select
                            value={selectedQuestionId}
                            onChange={(e) => handleQuestionChange(e.target.value)}
                            className="w-full p-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">-- Choose a question --</option>
                            {topicData.questions.map((question, index) => (
                                <option key={question.id} value={question.id}>
                                    {index + 1}. {question.question.substring(0, 50)}...
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Question Preview */}
                {currentQuestion && (
                    <div className="p-4 bg-gray-600 rounded-lg space-y-3">
                        <div className="text-sm font-medium text-gray-300">Question Preview:</div>
                        
                        <div className="text-white font-medium">
                            {currentQuestion.question}
                        </div>

                        <div className="space-y-1">
                            {currentQuestion.choices.map((choice, index) => (
                                <div 
                                    key={index} 
                                    className={`text-sm p-2 rounded ${
                                        index === currentQuestion.correctAnswer 
                                            ? 'bg-green-800 text-green-200' 
                                            : 'bg-gray-700 text-gray-300'
                                    }`}
                                >
                                    {choice}
                                    {index === currentQuestion.correctAnswer && (
                                        <span className="ml-2 font-bold text-green-400">✓ Correct</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="text-sm text-gray-400">
                            <strong>Correct Answer:</strong> {getCorrectAnswerLetter(currentQuestion.correctAnswer)}
                        </div>
                    </div>
                )}

                {/* Control Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleStartTrivia}
                        disabled={isTriggering || !currentQuestion || activeEvent === 'TRIVIA_QUESTION'}
                        className={`cursor-pointer flex items-center gap-2 px-4 py-2 text-sm rounded font-medium transition-colors ${
                            activeEvent === 'TRIVIA_QUESTION'
                                ? 'bg-green-600 text-white cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        } disabled:opacity-50`}
                    >
                        <HiPlay className="text-sm" />
                        {activeEvent === 'TRIVIA_QUESTION' ? 'Question Active' : 'Start Trivia'}
                    </button>
                    
                    {activeEvent === 'TRIVIA_QUESTION' && (
                        <button
                            onClick={handleStopTrivia}
                            disabled={isTriggering}
                            className="cursor-pointer flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50"
                        >
                            <HiStop className="text-sm" />
                            Stop Trivia
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
} 