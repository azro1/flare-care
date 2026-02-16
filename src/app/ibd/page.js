'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { Smartphone, Pizza, Brain, Bug, CupSoda, NotebookPen, Cookie, Stethoscope, BookOpen, Check } from 'lucide-react'

const QUICK_FACTS = [
  'IBD affects over 500,000 people in the UK',
  'Most people are diagnosed between 15-35',
  'Both conditions are chronic but manageable',
  'Early diagnosis leads to better outcomes',
]

export default function LearnPage() {
  const { isAuthenticated } = useAuth()
  const [currentFactIndex, setCurrentFactIndex] = useState(0)
  const [isFactFading, setIsFactFading] = useState(false)

  useEffect(() => {
    if (QUICK_FACTS.length <= 1) return

    let fadeTimeout
    const interval = setInterval(() => {
      setIsFactFading(true)
      fadeTimeout = setTimeout(() => {
        setCurrentFactIndex((prevIndex) => (prevIndex + 1) % QUICK_FACTS.length)
        setIsFactFading(false)
      }, 500)
    }, 60000)

    return () => {
      clearInterval(interval)
      if (fadeTimeout) clearTimeout(fadeTimeout)
    }
  }, [])
  
  return (
    <div className="w-full sm:px-4 md:px-6 min-w-0">
      <div className="flex flex-col lg:flex-row lg:gap-6 lg:justify-center">
        
        {/* Left Sidebar */}
        <div className="lg:w-72 lg:flex-shrink-0 order-2 lg:order-1 lg:mb-6">
          <div className="sticky top-6 space-y-4 sm:space-y-6">
            
            {/* Daily Tips */}
            <div className="card">
              <h3 className="text-xl font-semibold font-source text-primary mb-4">Daily Tips</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 min-w-[2rem] rounded-lg flex items-center justify-center card-inner">
                    <NotebookPen className="w-4 h-4 text-emerald-600 dark:text-white" />
                  </div>
                  <p className="text-sm text-secondary">Keep a food diary to track triggers</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 min-w-[2rem] rounded-lg flex items-center justify-center card-inner">
                    <CupSoda className="w-4 h-4 text-sky-600 dark:text-white" />
                  </div>
                  <p className="text-sm text-secondary">Stay hydrated throughout the day</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 min-w-[2rem] rounded-lg flex items-center justify-center card-inner">
                    <Cookie className="w-4 h-4 text-amber-600 dark:text-white" />
                  </div>
                  <p className="text-sm text-secondary">Eat smaller, frequent meals</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 min-w-[2rem] rounded-lg flex items-center justify-center card-inner">
                    <Stethoscope className="w-4 h-4 text-indigo-400 dark:text-white" />
                  </div>
                  <p className="text-sm text-secondary">Follow your healthcare team's advice</p>
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="card backdrop-blur-sm">
              <h3 className="text-xl font-semibold font-source text-primary mb-4">Emergency Contacts</h3>
            <div className="space-y-3">
              <div className="border-l-4" style={{ borderColor: '#5F9EA0', opacity: 0.85 }}>
                  <div className="pl-3">
                    <h4 className="font-medium text-primary">NHS 111</h4>
                    <p className="text-sm text-secondary">Non-emergency medical advice</p>
                  <p className="text-sm font-medium" style={{ color: '#5F9EA0' }}>Call 111</p>
                  </div>
                </div>
              <div className="border-l-4" style={{ borderColor: '#5F9EA0', opacity: 0.85 }}>
                  <div className="pl-3">
                    <h4 className="font-medium text-primary">Crohn's & Colitis UK</h4>
                    <p className="text-sm text-secondary">Support helpline</p>
                  <p className="text-sm font-medium" style={{ color: '#5F9EA0' }}>0300 222 9099</p>
                  </div>
                </div>
              <div className="border-l-4" style={{ borderColor: '#5F9EA0', opacity: 0.85 }}>
                  <div className="pl-3">
                    <h4 className="font-medium text-primary">Emergency Services</h4>
                    <p className="text-sm text-secondary">For life-threatening situations</p>
                  <p className="text-sm font-medium" style={{ color: '#5F9EA0' }}>Call 999</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Facts */}
            <div className="card">
              <h3 className="text-xl font-semibold font-source text-primary mb-4">Quick Facts</h3>
              <div className="space-y-3">
                <p
                  key={QUICK_FACTS[currentFactIndex]}
                  className={`text-sm text-secondary font-roboto leading-relaxed transition-opacity duration-500 ${
                    isFactFading ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  {QUICK_FACTS[currentFactIndex]}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:max-w-4xl order-1 lg:order-2">
      <div className="mb-4 sm:mb-6 card">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4">IBD</h1>
        <p className="lg:text-lg text-secondary font-roboto break-words">
          Learn about Crohn's disease and Ulcerative Colitis, and how FlareCare can help you manage your condition
        </p>
      </div>

      {/* What is IBD Section */}
      <div className="card mb-4 sm:mb-6">
        <h2 className="text-xl font-semibold font-source text-primary mb-6 break-words">What is Inflammatory Bowel Disease (IBD)?</h2>
        <div className="prose prose-gray max-w-none">
          <p className="text-secondary mb-6 font-roboto break-words">
            Inflammatory Bowel Disease (IBD) is a term used to describe disorders that involve chronic inflammation of your digestive tract. The two main types are:
          </p>
          
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <div className="card-inner p-6">
              <h3 className="text-lg font-semibold font-source text-primary mb-3 break-words">Crohn's Disease</h3>
              <ul className="text-secondary space-y-2 text-sm font-roboto break-words">
                <li><span className="text-[#5F9EA0] mr-2">•</span>Can affect any part of the digestive tract</li>
                <li><span className="text-[#5F9EA0] mr-2">•</span>Inflammation can be patchy with healthy areas in between</li>
                <li><span className="text-[#5F9EA0] mr-2">•</span>Can affect the full thickness of the bowel wall</li>
                <li><span className="text-[#5F9EA0] mr-2">•</span>May cause complications like fistulas and strictures</li>
              </ul>
            </div>
            
            <div className="card-inner p-6">
              <h3 className="text-lg font-semibold font-source text-primary mb-3 break-words">Ulcerative Colitis</h3>
              <ul className="text-secondary space-y-2 text-sm font-roboto break-words">
                <li><span className="text-[#5F9EA0] mr-2">•</span>Affects only the colon and rectum</li>
                <li><span className="text-[#5F9EA0] mr-2">•</span>Inflammation is continuous, starting from the rectum</li>
                <li><span className="text-[#5F9EA0] mr-2">•</span>Usually affects only the inner lining of the colon</li>
                <li><span className="text-[#5F9EA0] mr-2">•</span>May increase risk of colon cancer over time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Common Symptoms Section */}
      <div className="card backdrop-blur-sm mb-4 sm:mb-6">
        <h2 className="text-xl font-semibold font-source text-primary mb-6 break-words">Common Symptoms</h2>
        <div className="grid gap-2 md:gap-6 md:grid-cols-2">
          <ul className="space-y-2 text-secondary font-roboto break-words">
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 leading-tight">🤕</span>
              <span>Abdominal pain and cramping</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 leading-tight">💩</span>
              <span>Diarrhea (sometimes bloody)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 leading-tight">🏃</span>
              <span>Urgent need to have a bowel movement</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 leading-tight">🔁</span>
              <span>Feeling of incomplete bowel movement</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 leading-tight">🤢</span>
              <span>Nausea and vomiting</span>
            </li>
          </ul>
          
          <ul className="space-y-2 text-secondary font-roboto break-words">
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 leading-tight">😴</span>
              <span>Fatigue and low energy</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 leading-tight">⚖️</span>
              <span>Unintended weight loss</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 leading-tight">🍽️</span>
              <span>Loss of appetite</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 leading-tight">🌡️</span>
              <span>Fever during flare-ups</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 mt-0.5 leading-tight">🦵</span>
              <span>Joint pain and swelling</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Triggers Section */}
      <div className="card mb-4 sm:mb-6">
        <h2 className="text-xl font-semibold font-source text-primary mb-6 break-words">Common Triggers</h2>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          <div className="card-inner p-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-yellow-100 dark:bg-[var(--bg-card)]">
              <Pizza className="w-8 h-8 text-amber-500 dark:text-white" />
            </div>
            <p className="text-sm text-secondary font-roboto break-words">
              Spicy foods, dairy, high-fiber foods, alcohol, and caffeine can trigger symptoms
            </p>
          </div>

          <div className="card-inner p-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-cyan-100 dark:bg-[var(--bg-card)]">
              <Brain className="w-8 h-8 text-cyan-600 dark:text-white" />
            </div>
            <p className="text-sm text-secondary font-roboto break-words">
              Emotional stress and anxiety can worsen symptoms and trigger flare-ups
            </p>
          </div>

          <div className="card-inner p-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100 dark:bg-[var(--bg-card)]">
              <Bug className="w-8 h-8 text-emerald-600 dark:text-white" />
            </div>
            <p className="text-sm text-secondary font-roboto break-words">
              Viral or bacterial infections can trigger or worsen IBD symptoms
            </p>
          </div>
        </div>
      </div>

      {/* When to Seek Help Section */}
      <div className="card mb-4 sm:mb-6">
        <h2 className="text-xl font-semibold font-source text-primary mb-6">When to Seek Medical Help</h2>
        <div>
          <h3 className="text-lg font-semibold font-source text-primary mb-4 leading-normal">Seek immediate medical attention if you experience:</h3>
          <ul className="space-y-2 text-secondary font-source">
            <li className="flex items-start">
              <span className="text-red-500 mr-2 font-bold">•</span>
              <span>Severe abdominal pain</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2 font-bold">•</span>
              <span>High fever (over 101°F/38°C)</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2 font-bold">•</span>
              <span>Significant blood in stool</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2 font-bold">•</span>
              <span>Signs of dehydration (dizziness, dry mouth, no urination)</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2 font-bold">•</span>
              <span>Rapid weight loss</span>
            </li>
          </ul>
        </div>
      </div>

      {/* How FlareCare Helps Section */}
      <div className="card backdrop-blur-sm mb-4 sm:mb-6">
        <h2 className="text-xl font-semibold font-source text-primary mb-6">How FlareCare Can Help</h2>
        <div className="card-inner p-6">
        <div className="grid gap-3 md:gap-6 md:grid-cols-2">
          <div>
            <ul className="space-y-3 text-secondary font-roboto">
              <li className="flex items-start">
                <div className="w-4 h-4 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-cadet-blue)' }}>
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <span>Log daily symptoms with severity ratings</span>
              </li>
              <li className="flex items-start">
                <div className="w-4 h-4 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-cadet-blue)' }}>
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <span>Record foods that may trigger symptoms</span>
              </li>
              <li className="flex items-start">
                <div className="w-4 h-4 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-cadet-blue)' }}>
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <span>Track patterns and trends over time</span>
              </li>
            </ul>
          </div>
          
          <div>
            <ul className="space-y-3 text-secondary font-roboto">
              <li className="flex items-start">
                <div className="w-4 h-4 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-cadet-blue)' }}>
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <span>Set medication reminders</span>
              </li>
              <li className="flex items-start">
                <div className="w-4 h-4 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-cadet-blue)' }}>
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <span>Track dosage and timing</span>
              </li>
              <li className="flex items-start">
                <div className="w-4 h-4 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-cadet-blue)' }}>
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <span>Generate reports for your doctor</span>
              </li>
            </ul>
          </div>
        </div>
        </div>
      </div>

      {/* Resources Section */}
      <div className="card backdrop-blur-sm mb-4 sm:mb-6">
        <h2 className="text-xl font-semibold font-source text-primary mb-6">Helpful Resources</h2>
        <div className="grid gap-3 md:gap-6 md:grid-cols-2">
          <ul className="space-y-3 font-roboto">
            <li>
              <a 
                href="https://www.crohnsandcolitis.org.uk/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#5F9EA0] hover:text-[#5F9EA0]/80 underline"
              >
                Crohn's & Colitis UK
              </a>
              <p className="text-sm text-secondary font-roboto">Leading UK charity providing support and information</p>
            </li>
            <li>
              <a 
                href="https://www.crohnscolitisfoundation.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#5F9EA0] hover:text-[#5F9EA0]/80 underline"
              >
                Crohn's & Colitis Foundation
              </a>
              <p className="text-sm text-secondary font-roboto">US-based organization with comprehensive resources</p>
            </li>
          </ul>
          
          <ul className="space-y-3 font-roboto">
            <li>
              <a 
                href="https://www.nhs.uk/conditions/inflammatory-bowel-disease/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#5F9EA0] hover:text-[#5F9EA0]/80 underline"
              >
                NHS Information
              </a>
              <p className="text-sm text-secondary font-roboto">Official NHS guidance on IBD</p>
            </li>
            <li>
              <a 
                href="https://www.mayoclinic.org/diseases-conditions/inflammatory-bowel-disease/symptoms-causes/syc-20353315" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#5F9EA0] hover:text-[#5F9EA0]/80 underline"
              >
                Mayo Clinic Guide
              </a>
              <p className="text-sm text-secondary font-roboto">Comprehensive medical information</p>
            </li>
          </ul>
        </div>
      </div>

        </div>

      </div>

      {/* Call to Action */}
        <div className="mt-4 sm:mt-6 lg:mt-0">
          <div className="max-w-[76rem] mx-auto">
            <div className="card p-8 backdrop-blur-sm text-center">
          <h2 className="text-xl font-semibold font-source text-primary mb-4">Track Your Medications</h2>
          <p className="text-secondary font-roboto mb-6 leading-relaxed">
            Use the medications tracker to log missed medications to keep your healthcare team informed
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center sm:items-stretch space-y-3 sm:space-y-0 sm:space-x-4">
            {isAuthenticated ? (
              <Link href="/" className="bg-[#5F9EA0] hover:bg-button-cadet-hover text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95 font-roboto w-auto">
                Track Meds
              </Link>
            ) : (
              <>
                <Link href="/auth" className="bg-[#5F9EA0] hover:bg-button-cadet-hover text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg font-roboto">
                  Start Tracking
                </Link>
              </>
            )}
          </div>
            </div>
          </div>
      </div>
    </div>
  )
}
