'use client'

interface TriviaOverlayProps {
    show: boolean
    question: string
    choices: string[]
    topicName: string
    canvasSize: { width: number; height: number }
    answerStats?: {
        totalAnswers: number
        correctAnswers: number
    }
    answerBreakdown?: {
        choiceIndex: number
        count: number
        percentage: number
    }[]
    correctAnswer?: number
    answerRevealed?: boolean
}

export default function TriviaOverlay({
    show,
    question,
    choices,
    canvasSize,
    answerBreakdown,
    correctAnswer,
    answerRevealed
}: TriviaOverlayProps) {
    if (!show) return null

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-8"
            style={{
                width: canvasSize.width,
                height: canvasSize.height
            }}
        >
            <div className="w-full max-w-5xl mx-auto text-center">


                {/* Question */}
                <div className="bg-gray-800 rounded-2xl p-6 md:p-8 mb-8 border-2 border-blue-500 shadow-2xl">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-relaxed" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                        Q: {question}
                    </h2>
                </div>

                {/* Answer Choices */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {choices.map((choice, index) => {
                        const isCorrect = answerRevealed && correctAnswer === index
                        return (
                            <div
                                key={index}
                                className={`border-2 rounded-xl p-4 md:p-6 ${isCorrect
                                        ? 'bg-green-700 border-green-500'
                                        : 'bg-gray-700 border-gray-500'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-lg md:text-xl text-white ${isCorrect
                                            ? 'bg-green-500'
                                            : 'bg-blue-600'
                                        }`}>
                                        {String.fromCharCode(65 + index)}
                                    </div>
                                    <span className={`text-lg md:text-xl lg:text-2xl font-medium ${isCorrect
                                            ? 'text-green-100'
                                            : 'text-gray-100'
                                        }`}>
                                        {choice.replace(/^[A-D]\)\s*/, '')}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Answer Bar Graph */}
                {answerBreakdown && answerBreakdown.length > 0 && (
                    <div className="bg-gray-700 border border-gray-600 rounded-xl p-6 mb-4">
                        <div className="text-lg md:text-xl font-semibold text-blue-400 mb-4 text-center">
                            Answer Statistics
                        </div>

                        <div className="space-y-3">
                            {choices.map((choice, index) => {
                                const breakdown = answerBreakdown.find(b => b.choiceIndex === index)
                                const percentage = breakdown ? breakdown.percentage : 0
                                const count = breakdown ? breakdown.count : 0
                                const isCorrect = answerRevealed && correctAnswer === index

                                return (
                                                        <div key={index}>
                        {/* Choice Text */}
                        <div className={`text-sm md:text-base font-medium truncate mb-1 ${isCorrect ? 'text-green-400' : 'text-gray-200'
                            }`}>
                            {choice.replace(/^[A-D]\)\s*/, '')}
                        </div>

                        {/* Progress Bar Row with Letter */}
                        <div className="flex items-center gap-4">
                            {/* Choice Label */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${isCorrect
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-600 text-gray-200'
                                }`}>
                                {String.fromCharCode(65 + index)}
                            </div>

                            {/* Progress Bar */}
                            <div className="flex-1 bg-gray-600 rounded-full h-6 relative overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        isCorrect
                                            ? 'bg-green-500'
                                            : answerRevealed
                                            ? 'bg-red-500'
                                            : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                />

                                {/* Percentage Text */}
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                                    {percentage.toFixed(1)}% ({count})
                                </div>
                            </div>
                        </div>
                    </div>
                                )
                            })}
                        </div>

                        {/* Total Participants */}
                        <div className="text-center text-sm text-gray-400 mt-4">
                            {answerBreakdown.reduce((total, b) => total + b.count, 0)} participants have answered
                        </div>
                    </div>
                )}

                <div className="text-base md:text-xl lg:text-2xl font-medium text-gray-300 mt-2" style={{ fontFamily: 'Georgia, \"Times New Roman\", serif', opacity: 0.7 }}>
                    (Answer on your device)
                </div>

            </div>
        </div>
    )
} 