'use client'

export default function CrohnsColitisLogo({ className = "", showText = true, size = "sm" }) {
  const sizeClasses = {
    xs: "w-6 h-6",
    sm: "w-8 h-8", 
    md: "w-10 h-10",
    lg: "w-12 h-12"
  }

  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base", 
    lg: "text-lg"
  }

  return (
    <a 
      href="https://www.crohnsandcolitis.org.uk" 
      target="_blank" 
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 hover:opacity-80 transition-opacity ${className}`}
      title="Visit Crohn's & Colitis UK"
    >
      {/* Crohn's & Colitis UK Logo */}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center shadow-sm`}>
        <svg 
          className="w-3/4 h-3/4 text-white" 
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          {/* Simplified medical cross/heart symbol representing IBD support */}
          <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" />
          <path d="M12 18C12.5523 18 13 17.5523 13 17C13 16.4477 12.5523 16 12 16C11.4477 16 11 16.4477 11 17C11 17.5523 11.4477 18 12 18Z" />
        </svg>
      </div>
      
      {showText && (
        <span className={`${textSizeClasses[size]} text-gray-600 font-medium`}>
          Crohn's & Colitis UK
        </span>
      )}
    </a>
  )
}
