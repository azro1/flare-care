'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'

export default function LearnPage() {
  const { isAuthenticated } = useAuth()
  
  return (
    <div className="max-w-4xl w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 min-w-0">
      <div className="mb-12">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-gray-900 mb-4 sm:mb-6">Understanding IBD</h1>
        <p className="text-gray-600 font-roboto break-words">
          Learn about Crohn's disease and Ulcerative Colitis, and how FlareCare can help you manage your condition.
        </p>
      </div>

      {/* What is IBD Section */}
      <div className="card mb-8 sm:mb-12 p-4 sm:p-6">
        <h2 className="text-xl font-semibold font-source text-gray-900 mb-6 break-words">What is Inflammatory Bowel Disease (IBD)?</h2>
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-4 font-roboto break-words">
            Inflammatory Bowel Disease (IBD) is a term used to describe disorders that involve chronic inflammation of your digestive tract. The two main types are:
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-red-50 p-6 rounded-xl border border-red-200">
              <h3 className="text-lg font-semibold font-source text-red-800 mb-3 break-words">Crohn's Disease</h3>
              <ul className="text-red-700 space-y-2 text-sm font-roboto break-words">
                <li>• Can affect any part of the digestive tract</li>
                <li>• Inflammation can be patchy with healthy areas in between</li>
                <li>• Can affect the full thickness of the bowel wall</li>
                <li>• May cause complications like fistulas and strictures</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
              <h3 className="text-lg font-semibold font-source text-blue-800 mb-3 break-words">Ulcerative Colitis</h3>
              <ul className="text-blue-700 space-y-2 text-sm font-roboto break-words">
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
      <div className="card mb-8 sm:mb-12 p-4 sm:p-6">
        <h2 className="text-xl font-semibold font-source text-gray-900 mb-6 break-words">Common Symptoms</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium font-source text-gray-900 mb-4 break-words">Digestive Symptoms</h3>
            <ul className="space-y-2 text-gray-600 font-roboto break-words">
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
            <h3 className="text-lg font-medium font-source text-gray-900 mb-4 break-words">Other Symptoms</h3>
            <ul className="space-y-2 text-gray-600 font-roboto break-words">
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
      <div className="card mb-8 sm:mb-12 p-4 sm:p-6">
        <h2 className="text-xl font-semibold font-source text-gray-900 mb-6 break-words">Common Triggers</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🍕</span>
            </div>
            <h3 className="font-medium font-source text-gray-900 mb-2 break-words">Food & Diet</h3>
            <p className="text-sm text-gray-600 font-roboto break-words">Spicy foods, dairy, high-fiber foods, alcohol, and caffeine can trigger symptoms</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">😰</span>
            </div>
            <h3 className="font-medium font-source text-gray-900 mb-2 break-words">Stress</h3>
            <p className="text-sm text-gray-600 font-roboto break-words">Emotional stress and anxiety can worsen symptoms and trigger flare-ups</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🦠</span>
            </div>
            <h3 className="font-medium font-source text-gray-900 mb-2 break-words">Infections</h3>
            <p className="text-sm text-gray-600 font-roboto break-words">Viral or bacterial infections can trigger or worsen IBD symptoms</p>
          </div>
        </div>
      </div>

      {/* How FlareCare Helps Section */}
      <div className="card mb-8 sm:mb-12 p-4 sm:p-6">
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
      <div className="card mb-8 sm:mb-12 p-4 sm:p-6">
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
      <div className="card mb-8 sm:mb-12 p-4 sm:p-6">
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

      {/* Quit Smoking Section */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-7 mb-8 sm:mb-12">
        <div className="flex items-center mb-4">
          <svg className="w-8 h-8 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-2xl font-bold font-source text-gray-900 break-words">Quit Smoking Support</h2>
        </div>
        
        <div className="space-y-4 text-gray-700 font-roboto mb-6 break-words">
          <p className="text-lg break-words">
            <strong>Smoking significantly increases the risk of Crohn's disease flares and complications.</strong> 
            If you smoke, quitting is one of the most important steps you can take to improve your health.
          </p>
          <p className="break-words">
            Research shows that smoking can reduce blood flow to the gut and weaken your body's natural defenses, 
            making Crohn's symptoms worse and more frequent.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 min-w-0">
            <h3 className="text-lg font-semibold font-source text-gray-900 mb-3 break-words">🚭 NHS Stop Smoking Services</h3>
            <div className="space-y-2 text-gray-600 font-roboto break-words">
              <p className="break-words"><strong>Website:</strong> <a href="https://www.nhs.uk/smokefree" className="text-blue-600 hover:underline break-words" target="_blank" rel="noopener noreferrer">nhs.uk/smokefree</a></p>
              <p className="break-words"><strong>Helpline:</strong> <a href="tel:03001231045" className="text-blue-600 hover:underline break-words">0300 123 1045</a></p>
              <p className="break-words"><strong>Text Support:</strong> Text QUIT to 66777</p>
              <p className="text-sm break-words">Free support, advice, and resources</p>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 min-w-0">
            <h3 className="text-lg font-semibold font-source text-gray-900 mb-3 break-words">📱 Additional Resources</h3>
            <div className="space-y-2 text-gray-600 font-roboto break-words">
              <p className="break-words"><strong>Crohn's & Colitis UK:</strong></p>
              <p className="break-words">Helpline: <a href="tel:03002229099" className="text-blue-600 hover:underline break-words">0300 222 9099</a></p>
              <p className="break-words">Email: <a href="mailto:helpline@crohnsandcolitis.org.uk" className="text-blue-600 hover:underline break-words">helpline@crohnsandcolitis.org.uk</a></p>
              <p className="text-sm break-words">Specialist support for IBD patients</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-white/60 rounded-xl border border-white/30 break-words">
          <h4 className="font-semibold font-source text-gray-900 mb-2 break-words">💡 Tips to Get Started:</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-600 font-roboto text-sm break-words">
            <li className="break-words">Set a quit date and stick to it</li>
            <li className="break-words">Tell your family and friends about your decision</li>
            <li className="break-words">Ask your GP about nicotine replacement therapy</li>
            <li className="break-words">Identify your smoking triggers and plan alternatives</li>
            <li className="break-words">Consider joining a support group</li>
          </ul>
        </div>
      </div>

      {/* Call to Action */}
      <div className="card text-center p-4 sm:p-6">
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
