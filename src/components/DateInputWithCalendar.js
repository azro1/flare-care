'use client'

import { forwardRef } from 'react'
import { Calendar } from 'lucide-react'

const DateInputWithCalendar = forwardRef(({ value, onClick, onChange, placeholder, id, className, onIconClick, ...rest }, ref) => (
  <div className={`symptom-date-input-wrapper flex items-center input-field-wizard ${className ?? ''}`.trim()}>
    <input
      ref={ref}
      readOnly
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      className="flex-1 min-w-0 !border-0 !p-0 !bg-transparent outline-none cursor-default text-inherit placeholder-slate-400"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => e.preventDefault()}
      style={{ caretColor: 'transparent' }}
      {...rest}
    />
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); onIconClick?.() }}
      className="flex-shrink-0 p-0.5 cursor-pointer hover:opacity-80 transition-opacity ml-1"
      aria-label="Open date picker"
    >
      <Calendar className="w-5 h-5 text-secondary" />
    </button>
  </div>
))
DateInputWithCalendar.displayName = 'DateInputWithCalendar'

export default DateInputWithCalendar
