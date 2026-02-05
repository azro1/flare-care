'use client'

import { useState } from 'react'
import ConfirmationModal from '@/components/ConfirmationModal'

export default function About() {
  const [blogModal, setBlogModal] = useState({ isOpen: false })
  return (
    <div className="w-full px-2 sm:px-4 md:px-6 min-w-0">
      <div className="max-w-5xl mx-auto">
      <div className="md:text-center mb-4 sm:mb-6 card">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4">
          FlareCare
        </h1>
        <p className="lg:text-lg font-roboto text-secondary">
          A personal journey turned into a tool for the community
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4 sm:gap-6 sm:mb-6">
        <div className="card p-6 rounded-2xl backdrop-blur-sm">
          <h2 className="text-xl sm:text-2xl font-semibold font-source text-primary mb-4">My Story</h2>
          <div className="space-y-4 text-secondary font-roboto leading-relaxed">
            <p>
              Hi, I'm Simon, and I was diagnosed with Crohn's disease in 2005. Like many others, 
              I quickly learned that managing this condition requires constant attention 
              to symptoms, medications, and lifestyle factors.
            </p>
            <p>
              As an outpatient at the Royal London Hospital in Whitechapel, I've experienced 
              firsthand the challenges of tracking symptoms, remembering medication schedules, 
              and communicating effectively with my healthcare team.
            </p>
            <p>
              Over the years, I've tried various methods to keep track of my health data - 
              from simple notebooks to complex apps that didn't quite fit my needs. 
              That's when I realized there was a gap in the market for a tool designed 
              specifically for Crohn's and Colitis patients.
            </p>
          </div>
        </div>

        <div className="card p-6 rounded-2xl backdrop-blur-sm">
          <h2 className="text-xl sm:text-2xl font-semibold font-source text-primary mb-4">Why FlareCare?</h2>
          <div className="space-y-4 text-secondary font-roboto leading-relaxed">
            <p>
              FlareCare was born from my personal need for a simple, effective way to 
              track my health journey. I wanted something that would:
            </p>
            <ul className="space-y-2 ml-4 font-roboto">
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-[#5F9EA0] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Make symptom logging quick and intuitive</span>
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-[#5F9EA0] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Help identify patterns and triggers</span>
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-[#5F9EA0] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Generate clear reports for medical appointments</span>
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-[#5F9EA0] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Work seamlessly across devices</span>
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-[#5F9EA0] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Respect privacy with local-first data storage</span>
              </li>
            </ul>
            <p>
              The app is designed to grow with you - whether you're newly diagnosed 
              or have been managing your condition for years.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6 rounded-2xl backdrop-blur-sm mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold font-source text-primary mb-4">The Vision</h2>
        <div className="space-y-4 text-secondary font-roboto leading-relaxed">
          <p>
            Living with Crohn's or Colitis can feel isolating, but you're not alone. 
            FlareCare is built by someone who understands the daily challenges of 
            managing these conditions.
          </p>
          <p>
            My hope is that this tool will help you take control of your health data, 
            make more informed decisions, and have more productive conversations with 
            your healthcare team. Every feature is designed with real-world use in mind, 
            based on nearly two decades of personal experience.
          </p>
          <p>
            Whether you're tracking your first flare or managing a complex medication 
            regimen, FlareCare is here to support you on your journey to better health.
          </p>
        </div>
      </div>

      <div className="card p-6 rounded-2xl">
        <h2 className="text-xl sm:text-2xl font-bold font-source text-primary mb-4">Stay Connected</h2>
        <p className="text-secondary mb-8 font-roboto leading-relaxed">
          Have questions, suggestions, or want to share your own story? 
          I'd love to hear from you and learn how FlareCare can better serve 
          the Crohn's and Colitis community.
        </p>
        
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <div className="card-inner p-6 rounded-xl">
            <h3 className="text-lg font-semibold font-source text-primary mb-3">Email Support</h3>
            <p className="text-secondary mb-4 font-roboto text-sm leading-relaxed">
              For technical support, feature requests, or general questions by email.
            </p>
            <a 
              href="mailto:support@flarecare.app" 
              className="button-cadet font-roboto py-3 px-6 rounded-xl hover:shadow-lg inline-block"
            >
              Contact Support
            </a>
          </div>
          
          <div className="card-inner p-6 rounded-xl">
            <h3 className="text-lg font-semibold font-source text-primary mb-3">Community Blog</h3>
            <p className="text-secondary mb-4 font-roboto text-sm leading-relaxed">
              Share experiences, tips, and connect with others on similar journeys.
            </p>
            <button 
              className="bg-white hover:bg-gray-50 text-gray-800 font-medium font-roboto py-3 px-6 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md inline-block"
              onClick={() => setBlogModal({ isOpen: true })}
            >
              Coming Soon
            </button>
          </div>
        </div>
        
        <p className="text-secondary mt-8 text-center font-roboto">
          Together, we're building a better way to manage IBD        </p>
      </div>

      <ConfirmationModal
        isOpen={blogModal.isOpen}
        onClose={() => setBlogModal({ isOpen: false })}
        onConfirm={() => setBlogModal({ isOpen: false })}
        title="Community Blog Coming Soon"
        message="This will be a place for the community to share stories, tips, and support each other. Stay tuned for updates!"
        confirmText="OK"
        cancelText=""
        isDestructive={false}
      />
      </div>
    </div>
  )
}
