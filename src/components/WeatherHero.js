'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

const conditionToTheme = (main) => {
  const m = (main || '').toLowerCase()
  if (m.includes('thunder')) return 'storm'
  if (m.includes('drizzle') || m.includes('rain')) return 'rain'
  if (m.includes('snow')) return 'snow'
  if (m.includes('cloud')) return 'clouds'
  if (m.includes('clear')) return 'clear'
  return 'clouds'
}

const getIconDisplay = (iconCode, desc) => {
  // OpenWeatherMap icon codes (e.g., "01d", "01n", "02d", etc.)
  // Format: https://openweathermap.org/img/wn/{icon}@2x.png
  if (iconCode) {
    return {
      src: `https://openweathermap.org/img/wn/${iconCode}@2x.png`,
      alt: desc || 'Weather icon',
    }
  }
  // Fallback if no icon code
  return {
    src: 'https://openweathermap.org/img/wn/02d@2x.png',
    alt: 'Weather icon',
  }
}

export default function WeatherHero({
  apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY,
  children,
  previewCondition,
  previewTitle,
  previewSubtitle,
  previewTemp,
  previewIsNight,
}) {
  const [coords, setCoords] = useState(null)
  const [error, setError] = useState('')
  const [weather, setWeather] = useState(null)
  const lastSigRef = useRef('')

  useEffect(() => {
    if (previewCondition) return
    if (!apiKey) return
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        },
        () => {
          // fallback: London
          setCoords({ lat: 51.5074, lon: -0.1278 })
        },
        { enableHighAccuracy: false, timeout: 5000 }
      )
    } else {
      setCoords({ lat: 51.5074, lon: -0.1278 })
    }
  }, [apiKey, previewCondition])

  const fetchWeatherNow = async () => {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric`
      const res = await fetch(url)
      const data = await res.json()
      if (data?.weather?.[0]) {
        const sunrise = data?.sys?.sunrise
        const sunset = data?.sys?.sunset
        const nowTs = data?.dt
        const isNight = typeof sunrise === 'number' && typeof sunset === 'number' && typeof nowTs === 'number'
          ? (nowTs < sunrise || nowTs > sunset)
          : false
        const next = {
          temp: Math.round(data.main?.temp ?? 0),
          main: data.weather[0].main,
          desc: data.weather[0].description,
          icon: data.weather[0].icon, // OpenWeatherMap icon code (e.g., "01d", "01n")
          city: data.name,
          isNight,
        }
        const sig = `${next.temp}|${next.main}|${next.desc}|${next.icon}|${next.city}|${next.isNight}`
        if (lastSigRef.current !== sig) {
          lastSigRef.current = sig
          setWeather(next)
          try {
            const cacheKey = coords ? `weather-cache:${Math.round(coords.lat*100)/100},${Math.round(coords.lon*100)/100}` : 'weather-cache'
            localStorage.setItem(cacheKey, JSON.stringify(next))
          } catch {}
        }
      } else {
        setError('')
      }
    } catch (e) {
      setError('')
    }
  }

  useEffect(() => {
    if (previewCondition) return
    if (coords && apiKey) fetchWeatherNow()
  }, [coords, apiKey, previewCondition])

  useEffect(() => {
    if (previewCondition) return
    if (!coords || !apiKey) return
    const onVisibility = () => {
      if (!document.hidden) fetchWeatherNow()
    }
    document.addEventListener('visibilitychange', onVisibility)
    const id = setInterval(() => {
      if (document.hidden) return
      fetchWeatherNow()
    }, 15 * 60 * 1000)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [coords, apiKey, previewCondition])

  useEffect(() => {
    if (previewCondition) return
    if (!coords) return
    try {
      const cacheKey = `weather-cache:${Math.round(coords.lat*100)/100},${Math.round(coords.lon*100)/100}`
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const cached = JSON.parse(raw)
        const sig = `${cached.temp}|${cached.main}|${cached.desc}|${cached.icon || ''}|${cached.city}|${cached.isNight}`
        lastSigRef.current = sig
        setWeather(cached)
      }
    } catch {}
  }, [coords, previewCondition])

  const theme = conditionToTheme(previewCondition || weather?.main)
  const isNight = previewCondition ? !!previewIsNight : !!weather?.isNight
  const iconCode = weather?.icon || null
  const { src: iconSrc, alt: iconAlt } = getIconDisplay(iconCode, weather?.desc || previewCondition)

  return (
    <div
      className="overflow-hidden card"
      style={{ position: 'relative' }}
    >
      <div
        className=""
      >
        {children && (
          <div className="mb-3 sm:mb-4">
            {children}
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center">
            {iconSrc ? (
              <Image
                src={iconSrc}
                alt={iconAlt}
                width={112}
                height={112}
                className="w-18 h-18 sm:w-20 sm:h-20 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
                priority
              />
            ) : (
              <span className="text-3xl sm:text-4xl select-none" role="img" aria-hidden>
                ☁️
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base sm:text-lg font-medium text-primary truncate">
              {previewCondition ? (previewTitle || previewCondition) : (weather?.city || 'Fetching location...')}
            </div>
            <div className="text-sm text-secondary capitalize truncate">
              {previewCondition ? (previewSubtitle || 'preview') : (weather?.desc || error || 'Loading weather...')}
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--text-cadet-blue)] dark:text-white">
            {previewCondition ? (previewTemp != null ? `${previewTemp}°` : '--°') : (weather?.temp != null ? `${weather.temp}°` : '--°')}
          </div>
        </div>
        
      </div>
      {!apiKey && (
        <div className="px-4 py-2 text-xs text-secondary">Set NEXT_PUBLIC_OPENWEATHER_API_KEY to enable weather.</div>
      )}
    </div>
  )
}


