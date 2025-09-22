'use client'

import { useState, useRef, useEffect } from 'react'

export default function DatePicker({ value, onChange, className = '', placeholder = 'Select date', minDate = null }) {
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

  // Auto-set year from minDate when dropdown opens (but let user pick month)
  useEffect(() => {
    if (isOpen && minDate && !selectedYear) {
      const minDateObj = new Date(minDate)
      setSelectedYear(minDateObj.getFullYear().toString())
      // Only auto-set month if it's the current year and we're in the start month
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear().toString()
      const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0')
      const minMonth = (minDateObj.getMonth() + 1).toString().padStart(2, '0')
      
      if (selectedYear === currentYear && currentMonth === minMonth) {
        setSelectedMonth(minMonth)
      }
    }
  }, [isOpen, minDate, selectedYear, selectedMonth])

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
      // Validate the date exists (e.g., Feb 30th should not become Mar 2nd)
      const testDate = new Date(year, month - 1, day)
      if (testDate.getFullYear() == year && 
          testDate.getMonth() == month - 1 && 
          testDate.getDate() == day) {
        const formattedDate = `${year}-${month}-${day}`
        setSelectedDate(formattedDate)
        onChange(formattedDate)
      } else {
        // Invalid date, don't update
        console.log('Invalid date:', month, day, year)
      }
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

  // Filter years, months, and days based on minDate
  const getAvailableYears = () => {
    if (!minDate) return years
    const minYear = new Date(minDate).getFullYear().toString()
    return years.filter(year => year >= minYear)
  }

  const getAvailableMonths = () => {
    if (!minDate) return months
    const minDateObj = new Date(minDate)
    const minYear = minDateObj.getFullYear().toString()
    const minMonth = (minDateObj.getMonth() + 1).toString().padStart(2, '0')
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear().toString()
    const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0')
    
    if (selectedYear === minYear) {
      // Same year as start date - show from start month to current month (if current year) or end of year
      const maxMonth = (selectedYear === currentYear) ? currentMonth : '12'
      return months.filter(month => month.value >= minMonth && month.value <= maxMonth)
    }
    // For years other than the minimum year, return all months
    return months
  }

  const getAvailableDays = () => {
    if (!minDate) {
      // Get valid days for selected month/year
      if (selectedMonth && selectedYear) {
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
        return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'))
      }
      return days
    }
    
    const minDateObj = new Date(minDate)
    const minYear = minDateObj.getFullYear().toString()
    const minMonth = (minDateObj.getMonth() + 1).toString().padStart(2, '0')
    const minDay = minDateObj.getDate().toString().padStart(2, '0')
    
    if (selectedYear === minYear && selectedMonth === minMonth) {
      // Get valid days for the selected month and filter from min day
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
      const validDays = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'))
      return validDays.filter(day => day >= minDay)
    }
    
    // Get valid days for selected month/year
    if (selectedMonth && selectedYear) {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
      return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'))
    }
    
    return days
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef} style={{ zIndex: 100 }}>
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
        <div 
          ref={dropdownRef}
          className="absolute w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 99999
          }}
        >
          <div className="p-4">
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
                    {getAvailableDays().map(day => (
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
                    {getAvailableMonths().map(month => (
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
                    {getAvailableYears().map(year => (
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
