'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      return
    }

    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('role, account_status')
      .eq('id', data.user.id)
      .single()

    if (userError || !userData) {
      setError('User profile not found. Please register again.')
      return
    }

    if (userData.role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/member')
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-gray-900 p-6 sm:p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-6 sm:mb-8">
          Powerzone Fitness
        </h1>
        <h2 className="text-lg sm:text-xl text-white text-center mb-6">Login</h2>

        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-white mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-white mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-orange-500 text-white p-3 rounded font-bold hover:bg-orange-600"
          >
            Login
          </button>
        </form>

        <p className="text-gray-400 text-center mt-4">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-orange-500 hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  )
}
