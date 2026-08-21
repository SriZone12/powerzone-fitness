'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MemberPayments() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(true)

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

      setUser(session.user)
      fetchData(session.user.id)
    }
    checkAuth()
  }, [router])

  const fetchData = async (userId) => {
    const { data } = await supabase.from('member_memberships').select('*, membership_plan(name, price, duration_days)').eq('user_id', userId).order('created_at', { ascending: false })
    setMemberships(data || [])
    setLoading(false)
  }

  const statusBg = (status) => {
    switch (status) {
      case 'active': case 'confirmed': return 'bg-green-600'
      case 'pending': return 'bg-yellow-600'
      case 'expired': return 'bg-gray-600'
      case 'rejected': return 'bg-red-600'
      default: return 'bg-gray-600'
    }
  }

  const totalSpent = memberships.filter(m => m.payment_status === 'confirmed').reduce((sum, m) => sum + (m.membership_plan?.price || 0) + (m.admission_fee || 0), 0)

  const pendingPayments = memberships.filter(m => m.payment_status === 'pending').length

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
          <h1 className="text-xl sm:text-2xl font-bold text-white">Payment History</h1>
          <button onClick={() => router.push('/member')} className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Total Spent</p>
            <p className="text-lg sm:text-2xl font-bold text-green-500">रू{totalSpent.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Total Transactions</p>
            <p className="text-lg sm:text-2xl font-bold text-white">{memberships.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Pending</p>
            <p className="text-lg sm:text-2xl font-bold text-yellow-500">{pendingPayments}</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-4">Payment History</h2>
        {memberships.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-6 text-center">
            <p className="text-gray-400">No payments yet.</p>
            <button onClick={() => router.push('/member/plans')} className="mt-3 bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600">
              Browse Plans
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {memberships.map(m => (
              <div key={m.id} className="bg-gray-900 rounded-lg p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div>
                    <h3 className="text-white font-bold text-lg">{m.membership_plan?.name || 'N/A'}</h3>
                    <p className="text-gray-400 text-sm">{m.membership_plan?.duration_days} days plan</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                      <span>Purchased: {new Date(m.created_at).toLocaleDateString()}</span>
                      {m.start_date && <span>From: {m.start_date}</span>}
                      {m.end_date && <span>To: {m.end_date}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-xl">रू{m.membership_plan?.price || 0}</p>
                    {m.admission_fee > 0 && <p className="text-yellow-500 text-xs">+ रू{m.admission_fee} admission</p>}
                    <span className={`px-2 py-0.5 rounded text-xs text-white ${statusBg(m.payment_status)}`}>
                      {m.payment_status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
