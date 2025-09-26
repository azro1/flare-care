'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'

export default function LearnPage() {
  const { isAuthenticated } = useAuth()
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-gray-900 mb-4 sm:mb-6">Understanding IBD</h1>
        <p className="text-gray-600 font-roboto">
          Learn about Crohn's disease and Ulcerative Colitis, and how FlareCare can help you manage your condition.
        </p>
      </div>

      {/* What is IBD Section */}
      <div className="card mb-8 sm:mb-12">
        <h2 className="text-xl font-semibold font-source text-gray-900 mb-6">What is Inflammatory Bowel Disease (IBD)?</h2>
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-4 font-roboto">
            Inflammatory Bowel Disease (IBD) is a term used to describe disorders that involve chronic inflammation of your digestive tract. The two main types are:
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-red-50 p-6 rounded-xl border border-red-200">
              <h3 className="text-lg font-semibold font-source text-red-800 mb-3">Crohn's Disease</h3>
              <ul className="text-red-700 space-y-2 text-sm font-roboto">
                <li>• Can affect any part of the digestive tract</li>
                <li>• Inflammation can be patchy with healthy areas in between</li>
                <li>• Can affect the full thickness of the bowel wall</li>
                <li>• May cause complications like fistulas and strictures</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
              <h3 className="text-lg font-semibold font-source text-blue-800 mb-3">Ulcerative Colitis</h3>
              <ul className="text-blue-700 space-y-2 text-sm font-roboto">
                <li>• Affects only the colon and rectum</li>
                <li>• Inflammation is continuous, starting from the rectum</li>
                <li>• Usually affects only the inner lining of the colon</li>
                <li>• May increase risk of colon cancer over time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Common Symptoms Section */}
      <div className="card mb-8 sm:mb-12">
        <h2 className="text-xl font-semibold font-source text-gray-900 mb-6">Common Symptoms</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium font-source text-gray-900 mb-4">Digestive Symptoms</h3>
            <ul className="space-y-2 text-gray-600 font-roboto">
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Abdominal pain and cramping</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Diarrhea (sometimes bloody)</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Urgent need to have a bowel movement</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Feeling of incomplete bowel movement</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Nausea and vomiting</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-medium font-source text-gray-900 mb-4">Other Symptoms</h3>
            <ul className="space-y-2 text-gray-600 font-roboto">
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Fatigue and low energy</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Unintended weight loss</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Loss of appetite</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Fever during flare-ups</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Joint pain and swelling</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Triggers Section */}
      <div className="card mb-8 sm:mb-12">
        <h2 className="text-xl font-semibold font-source text-gray-900 mb-6">Common Triggers</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🍕</span>
            </div>
            <h3 className="font-medium font-source text-gray-900 mb-2">Food & Diet</h3>
            <p className="text-sm text-gray-600 font-roboto">Spicy foods, dairy, high-fiber foods, alcohol, and caffeine can trigger symptoms</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">😰</span>
            </div>
            <h3 className="font-medium font-source text-gray-900 mb-2">Stress</h3>
            <p className="text-sm text-gray-600 font-roboto">Emotional stress and anxiety can worsen symptoms and trigger flare-ups</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🦠</span>
            </div>
            <h3 className="font-medium font-source text-gray-900 mb-2">Infections</h3>
            <p className="text-sm text-gray-600 font-roboto">Viral or bacterial infections can trigger or worsen IBD symptoms</p>
          </div>
        </div>
      </div>

      {/* How FlareCare Helps Section */}
      <div className="card mb-8 sm:mb-12">
        <h2 className="text-xl font-semibold font-source text-gray-900 mb-6">How FlareCare Can Help</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-medium font-source text-gray-900 mb-4">Track Your Symptoms</h3>
            <ul className="space-y-3 text-gray-600 font-roboto">
              <li className="flex items-start">
                <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-teal-600 text-sm">✓</span>
                </div>
                <span>Log daily symptoms with severity ratings</span>
              </li>
              <li className="flex items-start">
                <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-teal-600 text-sm">✓</span>
                </div>
                <span>Record foods that may trigger symptoms</span>
              </li>
              <li className="flex items-start">
                <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-teal-600 text-sm">✓</span>
                </div>
                <span>Track patterns and trends over time</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-medium font-source text-gray-900 mb-4">Manage Medications</h3>
            <ul className="space-y-3 text-gray-600 font-roboto">
              <li className="flex items-start">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-purple-600 text-sm">✓</span>
                </div>
                <span>Set medication reminders</span>
              </li>
              <li className="flex items-start">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-purple-600 text-sm">✓</span>
                </div>
                <span>Track dosage and timing</span>
              </li>
              <li className="flex items-start">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-purple-600 text-sm">✓</span>
                </div>
                <span>Generate reports for your doctor</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* When to Seek Help Section */}
      <div className="card mb-8 sm:mb-12">
        <h2 className="text-xl font-semibold font-source text-gray-900 mb-6">When to Seek Medical Help</h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 font-source">
          <h3 className="text-lg font-semibold font-source text-red-800 mb-4">Seek immediate medical attention if you experience:</h3>
          <ul className="space-y-2 text-red-700 font-source">
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

      {/* Resources Section */}
      <div className="card mb-8 sm:mb-12">
        <h2 className="text-xl font-semibold font-source text-gray-900 mb-6">Helpful Resources</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium font-source text-gray-900 mb-4">Support Organizations</h3>
            <ul className="space-y-3 font-roboto">
              <li>
                <a 
                  href="https://www.crohnsandcolitis.org.uk/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Crohn's & Colitis UK
                </a>
                <p className="text-sm text-gray-600 font-roboto">Leading UK charity providing support and information</p>
              </li>
              <li>
                <a 
                  href="https://www.crohnscolitisfoundation.org/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Crohn's & Colitis Foundation
                </a>
                <p className="text-sm text-gray-600 font-roboto">US-based organization with comprehensive resources</p>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-medium font-source text-gray-900 mb-4">Medical Information</h3>
            <ul className="space-y-3 font-roboto">
              <li>
                <a 
                  href="https://www.nhs.uk/conditions/inflammatory-bowel-disease/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  NHS Information
                </a>
                <p className="text-sm text-gray-600 font-roboto">Official NHS guidance on IBD</p>
              </li>
              <li>
                <a 
                  href="https://www.mayoclinic.org/diseases-conditions/inflammatory-bowel-disease/symptoms-causes/syc-20353315" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Mayo Clinic Guide
                </a>
                <p className="text-sm text-gray-600 font-roboto">Comprehensive medical information</p>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="card text-center">
        <h2 className="text-xl font-semibold font-source text-gray-900 mb-4">Ready to Start Tracking?</h2>
        <p className="text-gray-600 mb-6 font-roboto">
          Join thousands of people managing their IBD with FlareCare. Start tracking your symptoms and medications today.
        </p>
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          {isAuthenticated ? (
            <Link href="/" className="btn-primary font-roboto">
              Go to Dashboard
            </Link>
          ) : (
            <Link href="/auth" className="btn-primary font-roboto">
              Get Started Free
            </Link>
          )}
          <Link href="/about" className="btn-secondary font-roboto">
            Learn More About FlareCare
          </Link>
        </div>
      </div>
    </div>
  )
}
