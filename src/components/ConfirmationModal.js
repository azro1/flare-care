'use client'

import { useState, useEffect } from 'react'

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Delete", 
  cancelText = "Cancel",
  isDestructive = true 
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      setIsVisible(false)
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isVisible) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full transform transition-all border border-slate-700">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
              isDestructive ? 'bg-red-100' : 'bg-[#5F9EA0]/20'
            }`}>
              <svg 
                className={`w-6 h-6 ${isDestructive ? 'text-red-600' : 'text-[#5F9EA0]'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d={isDestructive 
                    ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    : "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  }
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold font-roboto text-primary">
              {title}
            </h3>
          </div>
          
          <p className="text-secondary mb-6 font-roboto">
            {message}
          </p>

          <div className="flex space-x-3 justify-end">
            {cancelText && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium font-roboto button-cancel"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-medium font-roboto text-white rounded-lg transition-colors duration-200 ${
                isDestructive 
                  ? 'bg-red-500 hover:bg-red-400' 
                  : 'button-cadet'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
