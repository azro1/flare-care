'use client'

import { useState, useRef, useEffect } from 'react'

export default function TimePicker({ value, onChange, className = '', placeholder = 'Select time', id, name }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState('')
  const [selectedMinute, setSelectedMinute] = useState('')
  const dropdownRef = useRef(null)

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [hour, minute] = value.split(':')
      setSelectedHour(hour || '')
      setSelectedMinute(minute || '')
    } else {
      setSelectedHour('')
      setSelectedMinute('')
    }
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTimeChange = (hour, minute) => {
    setSelectedHour(hour)
    setSelectedMinute(minute)
    
    if (hour && minute) {
      const formattedTime = `${hour}:${minute}`
      onChange(formattedTime)
    }
  }

  const formatDisplayValue = () => {
    if (selectedHour && selectedMinute) {
      return `${selectedHour}:${selectedMinute}`
    }
    return placeholder
  }

  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i
    return hour.toString().padStart(2, '0')
  })

  const minutes = Array.from({ length: 60 }, (_, i) => {
    return i.toString().padStart(2, '0')
  })

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        id={id}
        name={name}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right pr-10 transition-all duration-200 hover:border-gray-300"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1.5em 1.5em'
        }}
      >
        <span className={selectedHour && selectedMinute ? 'text-gray-900' : 'text-gray-500'}>
          {formatDisplayValue()}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg">
          <div className="p-4">
            {/* Quick Time Buttons */}
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '07:00', hour: '07', minute: '00' },
                  { label: '12:00', hour: '12', minute: '00' },
                  { label: '13:00', hour: '13', minute: '00' },
                  { label: '18:00', hour: '18', minute: '00' }
                ].map(time => (
                  <button
                    key={time.label}
                    type="button"
                    onClick={() => handleTimeChange(time.hour, time.minute)}
                    className="px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {time.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-4">
                {/* Hour Selector */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Hour</label>
                  <select
                    value={selectedHour}
                    onChange={(e) => handleTimeChange(e.target.value, selectedMinute)}
                    className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-no-repeat bg-right"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '1em 1em'
                    }}
                  >
                    <option value="">--</option>
                    {hours.map(hour => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                </div>

                {/* Minute Selector */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Minute</label>
                  <select
                    value={selectedMinute}
                    onChange={(e) => handleTimeChange(selectedHour, e.target.value)}
                    className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-no-repeat bg-right"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '1em 1em'
                    }}
                  >
                    <option value="">--</option>
                    {minutes.map(minute => (
                      <option key={minute} value={minute}>{minute}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedHour('')
                  setSelectedMinute('')
                  onChange('')
                  setIsOpen(false)
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
