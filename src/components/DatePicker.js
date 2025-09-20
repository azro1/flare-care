'use client'

import { useState, useRef, useEffect } from 'react'

export default function DatePicker({ value, onChange, className = '', placeholder = 'Select date' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedDay, setSelectedDay] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const dropdownRef = useRef(null)

  // Parse initial value
  useEffect(() => {
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setSelectedDate(value)
        setSelectedMonth((date.getMonth() + 1).toString().padStart(2, '0'))
        setSelectedDay(date.getDate().toString().padStart(2, '0'))
        setSelectedYear(date.getFullYear().toString())
      }
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

  const handleDateChange = (month, day, year) => {
    setSelectedMonth(month)
    setSelectedDay(day)
    setSelectedYear(year)
    
    if (month && day && year) {
      const formattedDate = `${year}-${month}-${day}`
      setSelectedDate(formattedDate)
      onChange(formattedDate)
    }
  }

  const formatDisplayValue = () => {
    if (selectedDate) {
      const date = new Date(selectedDate)
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
    return placeholder
  }

  const months = [
    { value: '01', label: 'Jan' },
    { value: '02', label: 'Feb' },
    { value: '03', label: 'Mar' },
    { value: '04', label: 'Apr' },
    { value: '05', label: 'May' },
    { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' },
    { value: '08', label: 'Aug' },
    { value: '09', label: 'Sep' },
    { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Dec' }
  ]

  const days = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1
    return day.toString().padStart(2, '0')
  })

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 50 }, (_, i) => {
    const year = currentYear - 49 + i
    return year.toString()
  })

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-no-repeat bg-right pr-10 transition-all duration-200 hover:border-gray-300"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1.5em 1.5em'
        }}
      >
        <span className={selectedDate ? 'text-gray-900' : 'text-gray-500'}>
          {formatDisplayValue()}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg">
          <div className="p-4">
            {/* Quick Date Buttons */}
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Today', getDate: () => new Date() },
                  { label: 'Yesterday', getDate: () => { const d = new Date(); d.setDate(d.getDate() - 1); return d } },
                  { label: '1 week ago', getDate: () => { const d = new Date(); d.setDate(d.getDate() - 7); return d } },
                  { label: '1 month ago', getDate: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d } }
                ].map(dateOption => {
                  const date = dateOption.getDate()
                  const month = (date.getMonth() + 1).toString().padStart(2, '0')
                  const day = date.getDate().toString().padStart(2, '0')
                  const year = date.getFullYear().toString()
                  
                  return (
                    <button
                      key={dateOption.label}
                      type="button"
                      onClick={() => handleDateChange(month, day, year)}
                      className="px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {dateOption.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                {/* Day Selector */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Day</label>
                  <select
                    value={selectedDay}
                    onChange={(e) => handleDateChange(selectedMonth, e.target.value, selectedYear)}
                    className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-no-repeat bg-right"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '1em 1em'
                    }}
                  >
                    <option value="">--</option>
                    {days.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                {/* Month Selector */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => handleDateChange(e.target.value, selectedDay, selectedYear)}
                    className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-no-repeat bg-right"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '1em 1em'
                    }}
                  >
                    <option value="">--</option>
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>

                {/* Year Selector */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => handleDateChange(selectedMonth, selectedDay, e.target.value)}
                    className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-no-repeat bg-right"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '1em 1em'
                    }}
                  >
                    <option value="">--</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
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
                  setSelectedDate('')
                  setSelectedMonth('')
                  setSelectedDay('')
                  setSelectedYear('')
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
