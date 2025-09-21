'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '../lib/ToastContext'

// Validation schemas
const emailSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email address is too long')
    .test('no-disposable', 'Disposable email addresses are not allowed', function(value) {
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 
        'mailinator.com', 'temp-mail.org', 'throwaway.email'
      ]
      const domain = value?.split('@')[1]?.toLowerCase()
      return !disposableDomains.includes(domain)
    })
})

const otpSchema = yup.object({
  otp: yup
    .string()
    .required('Verification code is required')
    .matches(/^\d{6}$/, 'Please enter the 6-digit code from your email')
})

export default function AuthForm() {
  const [step, setStep] = useState('email') // 'email' or 'otp'
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  const { signInWithOtp } = useAuth()
  const router = useRouter()
  const { addToast } = useToast()

  // Email form
  const emailForm = useForm({
    resolver: yupResolver(emailSchema),
    defaultValues: {
      email: ''
    }
  })

  // OTP form
  const otpForm = useForm({
    resolver: yupResolver(otpSchema),
    defaultValues: {
      otp: ''
    }
  })

  const handleEmailSubmit = async (data) => {
    setError('')
    setMessage('')

    const result = await signInWithOtp(data.email)
    
    if (result.success) {
      setMessage('Check your email for the login code!')
      setStep('otp')
    } else {
      setError(result.error)
    }
  }

  const handleOtpSubmit = async (data) => {
    setError('')

    try {
      const emailData = emailForm.getValues()
      const { data: authData, error } = await supabase.auth.verifyOtp({
        email: emailData.email,
        token: data.otp,
        type: 'email'
      })

      if (error) throw error
      
      // Success - show toast and redirect to homepage
      addToast('Successfully signed in! Welcome to FlareCare.', 'success', 4000)
      setTimeout(() => {
        router.push('/')
      }, 1000) // Small delay to show toast
    } catch (error) {
      setError(error.message)
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setMessage('')
    setError('')
    otpForm.reset()
  }

  return (
    <div className="flex items-center justify-center bg-gray-50 min-h-[500px] px-4 sm:h-[calc(100vh-450px)] sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to FlareCare
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to sync your data across devices
          </p>
        </div>

        {step === 'email' ? (
          <form className="mt-8 space-y-6" onSubmit={emailForm.handleSubmit(handleEmailSubmit)}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...emailForm.register('email')}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:z-10 sm:text-sm ${
                    emailForm.formState.errors.email
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } placeholder-gray-500 text-gray-900`}
                  placeholder="Enter your email"
                />
                {emailForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">{emailForm.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {message && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-700">{message}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={emailForm.formState.isSubmitting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emailForm.formState.isSubmitting ? 'Sending...' : 'Send login code'}
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={otpForm.handleSubmit(handleOtpSubmit)}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  Verification code
                </label>
                <input
                  id="otp"
                  type="text"
                  {...otpForm.register('otp')}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:z-10 sm:text-sm ${
                    otpForm.formState.errors.otp
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } placeholder-gray-500 text-gray-900`}
                  placeholder="Enter the 6-digit code from your email"
                  maxLength={6}
                />
                {otpForm.formState.errors.otp && (
                  <p className="mt-1 text-sm text-red-600">{otpForm.formState.errors.otp.message}</p>
                )}
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-500"
                >
                  ← Back to email
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {message && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-700">{message}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={otpForm.formState.isSubmitting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {otpForm.formState.isSubmitting ? 'Verifying...' : 'Verify code'}
              </button>
            </div>
          </form>
        )}


        <div className="text-center">
          <p className="text-xs text-gray-500">
            We'll send you a secure login link via email. No password required.
          </p>
        </div>
      </div>
    </div>
  )
}
