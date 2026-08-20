'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function BuyPT() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: userData } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (userData.role === 'admin') { router.push('/admin'); return }
      if (userData.role === 'trainer') { router.push('/trainer'); return }

      setUser(session.user)
      fetchPackages()
    }
    checkAuth()
  }, [router])

  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('pt_packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (!error) setPackages(data)
    setLoading(false)
  }

  const handleBuy = async () => {
    if (!user || !selectedPackage) return
    setSubmitting(true)

    const startDate = new Date()
    const endDate = selectedPackage.duration_days
      ? new Date(Date.now() + selectedPackage.duration_days * 86400000)
      : null

    const { error } = await supabase
      .from('pt_subscriptions')
      .insert([{
        user_id: user.id,
        package_id: selectedPackage.id,
        sessions_total: selectedPackage.sessions_count,
        sessions_remaining: selectedPackage.sessions_count,
        payment_status: 'pending',
        payment_method: 'cash',
        status: 'pending',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate ? endDate.toISOString().split('T')[0] : null
      }])

    if (!error) {
      alert('PT subscription request sent! Please go to the gym to pay cash. Admin will confirm your payment and assign a trainer.')
      setShowModal(false)
      router.push('/member/pt')
    } else {
      alert('Error: ' + error.message)
    }

    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-white">PT Packages</h1>
          <button
            onClick={() => router.push('/member/pt')}
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
          >
            Back to My PT
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Personal Training Packages</h2>
          <p className="text-gray-400">Choose a package to start your transformation journey with a dedicated trainer.</p>
        </div>

        {packages.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-xl">No PT packages available yet.</p>
            <p className="text-gray-500 mt-2">Please check back later or contact the gym.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition border-2 border-transparent hover:border-orange-500">
                <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
                <div className="text-3xl font-bold text-orange-500 mb-4">रू{pkg.price}</div>

                {pkg.description && (
                  <p className="text-gray-400 text-sm mb-4">{pkg.description}</p>
                )}

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Sessions</span>
                    <span className="text-white font-bold">{pkg.sessions_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Per Session</span>
                    <span className="text-white">रू{Math.round(pkg.price / pkg.sessions_count)}</span>
                  </div>
                  {pkg.duration_days && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Valid For</span>
                      <span className="text-white">{pkg.duration_days} days</span>
                    </div>
                  )}
                </div>

                <ul className="text-gray-400 text-sm space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Dedicated personal trainer
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Custom workout plan
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Progress tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Diet guidance
                  </li>
                </ul>

                <button
                  onClick={() => { setSelectedPackage(pkg); setShowModal(true) }}
                  className="w-full bg-orange-500 text-white py-3 rounded font-bold hover:bg-orange-600"
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {showModal && selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Purchase</h3>

            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-gray-400 text-sm">Selected Package</p>
              <p className="text-white font-bold text-xl">{selectedPackage.name}</p>
              <p className="text-orange-500 font-bold text-2xl mt-2">रू{selectedPackage.price}</p>
              <p className="text-gray-400 text-sm mt-1">{selectedPackage.sessions_count} sessions</p>
            </div>

            <div className="bg-yellow-900 rounded-lg p-4 mb-6">
              <p className="text-white font-bold mb-2">Payment Instructions:</p>
              <ol className="text-gray-300 text-sm space-y-2">
                <li>1. Go to Powerzone Fitness gym</li>
                <li>2. Tell them you want to buy PT package</li>
                <li>3. Pay रू{selectedPackage.price} in cash</li>
                <li>4. Admin will confirm and assign your trainer</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-700 text-white py-3 rounded font-bold hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleBuy}
                disabled={submitting}
                className="flex-1 bg-orange-500 text-white py-3 rounded font-bold hover:bg-orange-600 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}