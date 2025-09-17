'use client'

export default function About() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          About FlareCare
        </h1>
        <p className="text-xl text-gray-600">
          A personal journey turned into a tool for the community
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="card">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">My Story</h2>
          <div className="space-y-4 text-gray-700">
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

        <div className="card">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Why FlareCare?</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              FlareCare was born from my personal need for a simple, effective way to 
              track my health journey. I wanted something that would:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
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

      <div className="card mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">The Vision</h2>
        <div className="space-y-4 text-gray-700">
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

      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-primary-900 mb-2">Get in Touch</h2>
        <p className="text-primary-700 mb-4">
          Have questions, suggestions, or want to share your own story? 
          I'd love to hear from you and learn how FlareCare can better serve 
          the Crohn's and Colitis community.
        </p>
        <p className="text-sm text-primary-600">
          Built with care by someone who truly understands the journey.
        </p>
      </div>
    </div>
  )
}
