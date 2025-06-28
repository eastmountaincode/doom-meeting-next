'use client'

import { useState } from 'react'
import { useSetAtom } from 'jotai'
import { joinMeetingAtom } from '../store/atoms'

function LandingScreen() {
  const [screenName, setScreenName] = useState('')
  const joinMeeting = useSetAtom(joinMeetingAtom)

  const handleJoinMeeting = () => {
    if (screenName.trim()) {
      joinMeeting(screenName.trim())
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoinMeeting()
    }
  }

  return (
    <div className="p-8 flex justify-center items-center h-full">
      <div className="flex flex-col items-center max-w-md w-full text-center">
        {/* Logo Section */}
        <div className="mb-12">
          <img 
            src="/doom-logo.png" 
            alt="Doom Logo" 
            className="w-32 h-32 object-contain"
          />
        </div>

        {/* Form Section */}
        <div className="w-full mb-16">
          <h2 className="text-2xl mb-8 font-normal">Enter our screen name:</h2>
          
          <input
            type="text"
            value={screenName}
            onChange={(e) => setScreenName(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full p-4 text-lg border-2 border-gray-600 rounded-lg bg-gray-800 text-white mb-8 focus:outline-none focus:border-blue-500 placeholder-gray-400"
            placeholder="Our screen name"
          />

          <button 
            onClick={handleJoinMeeting}
            disabled={!screenName.trim()}
            className="w-full p-4 text-lg font-bold bg-gray-800 text-white border-2 border-gray-600 rounded-full cursor-pointer tracking-wider hover:bg-blue-500 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:border-gray-600"
          >
            JOIN DOOM MEETING
          </button>
        </div>

        {/* Company Branding */}
        <div className="text-base text-gray-400 font-normal">
          LSSN Solutions LLC
        </div>
      </div>
    </div>
  )
}

export default LandingScreen 