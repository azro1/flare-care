'use client'

import { useState } from 'react'
import ConfirmationModal from '@/components/ConfirmationModal'

export default function About() {
  const [blogModal, setBlogModal] = useState({ isOpen: false })
  return (
    <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 min-w-0">
      <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-white mb-4 sm:mb-6">
          About FlareCare
        </h1>
        <p className="text-lg sm:text-xl font-roboto text-slate-300 max-w-3xl mx-auto leading-relaxed">
          A personal journey turned into a tool for the community
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 md:p-10 border border-slate-700/50">
          <h2 className="text-2xl font-semibold font-source text-white mb-4">My Story</h2>
          <div className="space-y-4 text-slate-300 font-roboto">
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

        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 md:p-10 border border-slate-700/50">
          <h2 className="text-2xl font-semibold font-source text-white mb-4">Why FlareCare?</h2>
          <div className="space-y-4 text-slate-300 font-roboto">
            <p>
              FlareCare was born from my personal need for a simple, effective way to 
              track my health journey. I wanted something that would:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 font-roboto">
              <li>Make symptom logging quick and intuitive</li>
              <li>Help identify patterns and triggers</li>
              <li>Generate clear reports for medical appointments</li>
              <li>Work seamlessly across devices</li>
              <li>Respect privacy with local-first data storage</li>
            </ul>
            <p>
              The app is designed to grow with you - whether you're newly diagnosed 
              or have been managing your condition for years.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 md:p-10 border border-slate-700/50 mb-12">
        <h2 className="text-2xl font-semibold font-source text-white mb-4">The Vision</h2>
        <div className="space-y-4 text-slate-300 font-roboto">
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

      <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-7">
        <h2 className="text-2xl font-bold font-source text-white mb-4">Stay Connected</h2>
        <p className="text-slate-300 mb-6 font-roboto">
          Have questions, suggestions, or want to share your own story? 
          I'd love to hear from you and learn how FlareCare can better serve 
          the Crohn's and Colitis community.
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-700/40 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30">
            <h3 className="text-lg font-semibold font-source text-white mb-3">📧 Email Support</h3>
            <p className="text-slate-300 mb-4 font-roboto">
              For technical support, feature requests, or general questions.
            </p>
            <a 
              href="mailto:support@flarecare.app" 
              className="bg-[#008B8B] hover:bg-[#008B8B]/80 text-white font-semibold font-roboto py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg inline-block"
            >
              Contact Support
            </a>
          </div>
          
          <div className="bg-slate-700/40 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30">
            <h3 className="text-lg font-semibold font-source text-white mb-3">💬 Community Blog</h3>
            <p className="text-slate-300 mb-4 font-roboto">
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
        
        <p className="text-sm text-slate-400 mt-6 text-center font-roboto">
          Built with care for Crohn's and Colitis patients.
        </p>
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
