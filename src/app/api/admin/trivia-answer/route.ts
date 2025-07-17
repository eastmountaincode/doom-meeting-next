import { NextRequest } from 'next/server'
import Pusher from 'pusher'

// Initialize Pusher with environment variables
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
})

// In-memory storage for current trivia session
let currentTriviaSession: {
  question: string
  correctAnswer: number
  answers: Map<string, { participantId: string; selectedAnswer: number; isCorrect: boolean }>
  isActive: boolean
} = {
  question: '',
  correctAnswer: 0,
  answers: new Map(),
  isActive: false
}

// Start a new trivia session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.action === 'start-session') {
      // Check if this is the same question as the current session
      const isSameQuestion = currentTriviaSession.question === body.question && 
                            currentTriviaSession.correctAnswer === body.correctAnswer
      
      // If it's a different question, reset the answers. If it's the same question, preserve answers.
      if (!isSameQuestion) {
        currentTriviaSession = {
          question: body.question || '',
          correctAnswer: body.correctAnswer || 0,
          answers: new Map(),
          isActive: true
        }
        console.log('Started new trivia session with different question:', { question: body.question, correctAnswer: body.correctAnswer })
      } else {
        // Same question, just reactivate the session and preserve answers
        currentTriviaSession.isActive = true
        console.log('Reactivated trivia session with same question:', { question: body.question, correctAnswer: body.correctAnswer })
      }
      
      // Calculate current stats
      const totalAnswers = currentTriviaSession.answers.size
      const correctAnswers = Array.from(currentTriviaSession.answers.values()).filter(answer => answer.isCorrect).length
      
      // If reactivating same question and there are existing answers, broadcast the current stats
      if (isSameQuestion && totalAnswers > 0) {
        // Calculate answer breakdown by choice
        const answerBreakdown = []
        const answerCounts = new Map<number, number>()
        
        // Count answers for each choice
        Array.from(currentTriviaSession.answers.values()).forEach(answer => {
          const currentCount = answerCounts.get(answer.selectedAnswer) || 0
          answerCounts.set(answer.selectedAnswer, currentCount + 1)
        })
        
        // Create breakdown with percentages
        for (const [choiceIndex, count] of answerCounts.entries()) {
          const percentage = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
          answerBreakdown.push({
            choiceIndex,
            count,
            percentage
          })
        }
        
        // Broadcast existing statistics to display screen
        await pusher.trigger('display-channel', 'trivia-answer-stats', {
          totalAnswers,
          correctAnswers,
          question: currentTriviaSession.question,
          answerBreakdown
        })
      }
      
      return Response.json({ 
        success: true, 
        message: isSameQuestion ? 'Trivia session reactivated' : 'Trivia session started',
        stats: {
          totalAnswers,
          correctAnswers
        }
      })
    }
    
    if (body.action === 'submit-answer') {
      // Validate required fields
      if (!body.participantId || body.selectedAnswer === undefined) {
        return Response.json({ error: 'Missing participantId or selectedAnswer' }, { status: 400 })
      }
      
      if (!currentTriviaSession.isActive) {
        return Response.json({ error: 'No active trivia session' }, { status: 400 })
      }
      
      const participantId = body.participantId
      const selectedAnswer = body.selectedAnswer
      const isCorrect = selectedAnswer === currentTriviaSession.correctAnswer
      
      // Store the answer (overwrites if participant answers multiple times)
      currentTriviaSession.answers.set(participantId, {
        participantId,
        selectedAnswer,
        isCorrect
      })
      
      // Calculate current statistics
      const totalAnswers = currentTriviaSession.answers.size
      const correctAnswers = Array.from(currentTriviaSession.answers.values()).filter(answer => answer.isCorrect).length
      
      console.log(`Trivia answer from ${participantId}: ${selectedAnswer} (${isCorrect ? 'correct' : 'incorrect'})`)
      console.log(`Current stats: ${correctAnswers}/${totalAnswers} correct`)
      
      // Calculate answer breakdown by choice
      const answerBreakdown = []
      const answerCounts = new Map<number, number>()
      
      // Count answers for each choice
      Array.from(currentTriviaSession.answers.values()).forEach(answer => {
        const currentCount = answerCounts.get(answer.selectedAnswer) || 0
        answerCounts.set(answer.selectedAnswer, currentCount + 1)
      })
      

      
      // Create breakdown with percentages
      for (const [choiceIndex, count] of answerCounts.entries()) {
        const percentage = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
        answerBreakdown.push({
          choiceIndex,
          count,
          percentage
        })
      }
      

      
      // Broadcast updated statistics to display screen
      await pusher.trigger('display-channel', 'trivia-answer-stats', {
        totalAnswers,
        correctAnswers,
        question: currentTriviaSession.question,
        answerBreakdown
      })
      
      return Response.json({ 
        success: true, 
        message: 'Answer submitted successfully',
        isCorrect,
        stats: {
          totalAnswers,
          correctAnswers
        }
      })
    }
    
    if (body.action === 'end-session') {
      // End the trivia session
      currentTriviaSession.isActive = false
      
      const finalStats = {
        totalAnswers: currentTriviaSession.answers.size,
        correctAnswers: Array.from(currentTriviaSession.answers.values()).filter(answer => answer.isCorrect).length
      }
      
      console.log('Ended trivia session with final stats:', finalStats)
      
      return Response.json({ 
        success: true, 
        message: 'Trivia session ended',
        finalStats
      })
    }
    
    return Response.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('Trivia answer API error:', error)
    return Response.json(
      { error: 'Failed to process trivia answer' }, 
      { status: 500 }
    )
  }
}

// Get current trivia session stats
export async function GET() {
  try {
    if (!currentTriviaSession.isActive) {
      return Response.json({ error: 'No active trivia session' }, { status: 400 })
    }
    
    const totalAnswers = currentTriviaSession.answers.size
    const correctAnswers = Array.from(currentTriviaSession.answers.values()).filter(answer => answer.isCorrect).length
    
    return Response.json({
      success: true,
      stats: {
        totalAnswers,
        correctAnswers,
        question: currentTriviaSession.question,
        isActive: currentTriviaSession.isActive
      }
    })
  } catch (error) {
    console.error('Get trivia stats error:', error)
    return Response.json(
      { error: 'Failed to get trivia stats' }, 
      { status: 500 }
    )
  }
} 