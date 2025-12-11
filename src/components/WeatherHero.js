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

const getIconDisplay = (theme, isNight) => {
  switch (theme) {
    case 'clear':
      return {
        src: isNight
          ? 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/15.0.3/svg/1f319.svg'
          : 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/15.0.3/svg/2600.svg',
        alt: isNight ? 'Clear night sky' : 'Sunny skies',
      }
    case 'clouds':
      return {
        src: isNight
          ? 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/15.0.3/svg/2601.svg'
          : 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/15.0.3/svg/26c5.svg',
        alt: isNight ? 'Cloudy night' : 'Partly cloudy',
      }
    case 'rain':
      return {
        src: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/15.0.3/svg/1f327.svg',
        alt: 'Rain showers',
      }
    case 'snow':
      return {
        src: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/15.0.3/svg/1f328.svg',
        alt: 'Snowfall',
      }
    case 'storm':
      return {
        src: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/15.0.3/svg/26c8.svg',
        alt: 'Thunderstorm',
      }
    default:
      return {
        src: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/15.0.3/svg/1f324.svg',
        alt: 'Mostly cloudy',
      }
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
          city: data.name,
          isNight,
        }
        const sig = `${next.temp}|${next.main}|${next.desc}|${next.city}|${next.isNight}`
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
        const sig = `${cached.temp}|${cached.main}|${cached.desc}|${cached.city}|${cached.isNight}`
        lastSigRef.current = sig
        setWeather(cached)
      }
    } catch {}
  }, [coords, previewCondition])

  const theme = conditionToTheme(previewCondition || weather?.main)
  const isNight = previewCondition ? !!previewIsNight : !!weather?.isNight
  const { src: iconSrc, alt: iconAlt } = getIconDisplay(theme, isNight)

  return (
    <div
      className="rounded-2xl overflow-hidden card"
      style={{ position: 'relative' }}
    >
      <div
        className="sm:p-4"
      >
        {children && (
          <div className="mb-6">
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
          <div className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-cadet-blue)' }}>
            {previewCondition ? (previewTemp != null ? `${previewTemp}°` : '--°') : (weather?.temp != null ? `${weather.temp}°` : '--°')}
          </div>
        </div>
        
      </div>
      {/* Animated overlays */}
      {theme === 'rain' && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="rain-drop"
              style={{
                left: `${(i * 73) % 100}%`,
                // start animation mid-stream using negative delays
                animationDelay: `-${(i % 16) * 0.12 + Math.random() * 0.6}s`,
                animationDuration: `${1.6 + (i % 8) * 0.18}s`,
                opacity: 0.5,
                // randomize initial vertical position so not all start at same top
                top: `${-10 + Math.random() * 120}%`,
                // shorter drops (12–20px)
                height: `${12 + (i % 5) * 2}px`,
              }}
            />
          ))}
        </div>
      )}
      {theme === 'snow' && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              className="snow-flake"
              style={{
                left: `${(i * 61) % 100}%`,
                animationDelay: `-${(i % 12) * 0.2 + Math.random() * 0.8}s`,
                animationDuration: `${3 + (i % 8) * 0.4}s`,
                opacity: 0.8,
                top: `${-10 + Math.random() * 120}%`,
              }}
            />
          ))}
        </div>
      )}
      {theme === 'storm' && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* occasional sky flash */}
          <div className="storm-flash" />
          {/* a few lightning streaks */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="lightning-bolt"
              style={{
                left: `${10 + i * 20 + (i % 2 === 0 ? 5 : -3)}%`,
                top: `${-5 + (i % 3) * 10}%`,
                transform: `rotate(${-(18 + i * 4)}deg)`,
                animationDelay: `${0.8 * i + (i % 2) * 0.35}s`,
              }}
            />
          ))}
        </div>
      )}
      <style jsx>{`
        .rain-drop {
          position: absolute;
          top: -10%;
          width: 2px;
          height: 28px;
          background: rgba(2,132,199,0.7);
          border-radius: 1px;
          filter: drop-shadow(0 0 2px rgba(2,132,199,0.5));
          transform: rotate(12deg);
          animation-name: rainFall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes rainFall {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        .snow-flake {
          position: absolute;
          top: -10%;
          width: 6px;
          height: 6px;
          background: rgba(255,255,255,0.95);
          border-radius: 9999px;
          box-shadow: 0 0 6px rgba(255,255,255,0.6);
          animation-name: snowDrift;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes snowDrift {
          0% { top: -10%; transform: translateX(-8px); }
          50% { top: 45%; transform: translateX(8px); }
          100% { top: 110%; transform: translateX(-6px); }
        }
        .storm-flash {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 60% 20%, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%);
          opacity: 0;
          animation: flash 6s linear infinite;
          animation-delay: 0.6s;
        }
        @keyframes flash {
          0%, 86%, 100% { opacity: 0; }
          88% { opacity: 0.8; }
          89% { opacity: 0.15; }
          90% { opacity: 0.6; }
          92% { opacity: 0; }
        }
        .lightning-bolt {
          position: absolute;
          width: 2px;
          height: 45%;
          background: linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0.2));
          box-shadow: 0 0 10px rgba(255,255,255,0.6);
          opacity: 0;
          animation: bolt 6.2s linear infinite;
        }
        @keyframes bolt {
          0%, 80% { opacity: 0; }
          82% { opacity: 1; }
          83% { opacity: 0.2; }
          84% { opacity: 0.9; }
          86% { opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>
      {!apiKey && (
        <div className="px-4 py-2 text-xs text-secondary">Set NEXT_PUBLIC_OPENWEATHER_API_KEY to enable weather.</div>
      )}
    </div>
  )
}


