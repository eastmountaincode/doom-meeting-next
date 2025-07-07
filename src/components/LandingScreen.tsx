'use client'

import { useState } from 'react'
import { useSetAtom } from 'jotai'
import { joinMeetingAtom } from '../store'
import Image from 'next/image'
import { RESERVED_SCREEN_NAME, RESERVED_SCREEN_PASSWORD } from '../config/constants'

function LandingScreen() {
  const [screenName, setScreenName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPasswordField, setShowPasswordField] = useState(false)
  const joinMeeting = useSetAtom(joinMeetingAtom)

  const handleJoinMeeting = () => {
    const trimmedName = screenName.trim()
    if (trimmedName) {
      // Check if the screen name is reserved
      if (trimmedName.toLowerCase() === RESERVED_SCREEN_NAME.toLowerCase()) {
        if (!showPasswordField) {
          // Show password field for reserved name
          setShowPasswordField(true)
          setError('')
          return
        } else {
          // Validate password
          if (!RESERVED_SCREEN_PASSWORD) {
            setError('Reserved screen name authentication is not configured.')
            return
          }
          if (password !== RESERVED_SCREEN_PASSWORD) {
            setError('Incorrect password for reserved screen name.')
            return
          }
        }
      }
      setError('')
      joinMeeting(trimmedName)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoinMeeting()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setScreenName(newValue)
    
    // Hide password field if user changes away from reserved name
    if (showPasswordField && newValue.toLowerCase() !== RESERVED_SCREEN_NAME.toLowerCase()) {
      setShowPasswordField(false)
      setPassword('')
    }
    
    // Clear error when user starts typing
    if (error) {
      setError('')
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    // Clear error when user starts typing password
    if (error) {
      setError('')
    }
  }

  return (
    <div className="p-8 flex justify-center items-center h-full">
      <div className="flex flex-col items-center max-w-md w-full text-center">
        {/* Logo Section */}
        <div className="mb-12">
          <Image 
            src="/doom-logo.png" 
            alt="Doom Logo" 
            width={128}
            height={128}
            className="w-32 h-32 object-contain"
          />
        </div>

        {/* Form Section */}
        <div className="w-full mb-16">
          <h2 className="text-2xl mb-8 font-normal">Enter our screen name:</h2>
          
          <input
            type="text"
            value={screenName}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className={`w-full p-4 text-lg border-2 rounded-lg bg-gray-800 text-white mb-2 focus:outline-none placeholder-gray-400 caret-white ${
              error ? 'border-red-500 focus:border-red-500' : 'border-gray-600 focus:border-blue-500'
            }`}
            placeholder="Our screen name"
          />
          
          {showPasswordField && (
            <div className="mb-2">
              <input
                type="password"
                value={password}
                onChange={handlePasswordChange}
                onKeyDown={handleKeyDown}
                className={`w-full p-4 text-lg border-2 rounded-lg bg-gray-800 text-white focus:outline-none placeholder-gray-400 caret-white ${
                  error ? 'border-red-500 focus:border-red-500' : 'border-gray-600 focus:border-blue-500'
                }`}
                placeholder="Enter password for reserved name"
              />
              <div className="text-gray-400 text-sm mt-2 text-center">
                This is a reserved screen name. Please enter the password to continue.
              </div>
            </div>
          )}
          
          {error && (
            <div className="text-red-400 text-sm mb-6 text-center">
              {error}
            </div>
          )}
          
          <div className="mb-8" />

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