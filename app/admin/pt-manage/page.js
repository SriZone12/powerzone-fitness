'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function PTManage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [members, setMembers] = useState([])
  const [trainers, setTrainers] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [submitting, setSubmitting] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedSub, setSelectedSub] = useState(null)
  const [assignForm, setAssignForm] = useState({
    trainer_id: '',
    schedule_days: [],
    time_slot: ''
  })

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: userData } = await supabase
        .from('app_users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (userData.role !== 'admin') { router.push('/login'); return }

      setUser(session.user)
      fetchData()
    }
    checkAuth()
  }, [router])

  const fetchData = async () => {
    const [subsRes, membersRes, trainersRes, packagesRes] = await Promise.all([
      supabase.from('pt_subscriptions').select('*, pt_packages:package_id(name, price, sessions_count, duration_days), app_users:user_id(full_name, email, phone), trainer:trainer_id(full_name)').order('created_at', { ascending: false }),
      supabase.from('app_users').select('id, full_name, email').eq('role', 'member'),
      supabase.from('app_users').select('id, full_name, email').in('role', ['trainer', 'admin']),
      supabase.from('pt_packages').select('*').eq('is_active', true)
    ])

    setSubscriptions(subsRes.data || [])
    setMembers(membersRes.data || [])
    setTrainers(trainersRes.data || [])
    setPackages(packagesRes.data || [])
    setLoading(false)
  }

  const openAssignModal = (sub) => {
    setSelectedSub(sub)
    setAssignForm({
      trainer_id: sub.trainer_id || '',
      schedule_days: [],
      time_slot: ''
    })
    setShowAssignModal(true)
  }

  const handleAssignTrainer = async () => {
    if (!assignForm.trainer_id) {
      alert('Please select a trainer')
      return
    }

    setSubmitting(true)

    const { error } = await supabase
      .from('pt_subscriptions')
      .update({ 
        trainer_id: assignForm.trainer_id,
        status: 'active'
      })
      .eq('id', selectedSub.id)

    if (error) {
      alert('Error: ' + error.message)
      setSubmitting(false)
      return
    }

    // Create schedules
    if (assignForm.schedule_days.length > 0 && assignForm.time_slot) {
      await supabase.from('pt_schedules').delete().eq('subscription_id', selectedSub.id)

      const schedules = assignForm.schedule_days.map(day => ({
        subscription_id: selectedSub.id,
        member_id: selectedSub.user_id,
        trainer_id: assignForm.trainer_id,
        day_of_week: day,
        time_slot: assignForm.time_slot
      }))

      await supabase.from('pt_schedules').insert(schedules)
    }

    alert('Trainer assigned successfully!')
    setShowAssignModal(false)
    fetchData()
    setSubmitting(false)
  }

  const handleConfirmPayment = async (subId) => {
    if (!confirm('Confirm this PT payment?')) return

    const { error } = await supabase
      .from('pt_subscriptions')
      .update({ payment_status: 'confirmed' })
      .eq('id', subId)

    if (!error) {
      alert('Payment confirmed!')
      fetchData()
    }
  }

  const filteredSubs = subscriptions.filter(sub => {
    if (filter === 'all') return true
    return sub.payment_status === filter || sub.status === filter
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'pending': return 'bg-yellow-500'
      case 'completed': return 'bg-blue-500'
      case 'expired': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
          <h1 className="text-xl sm:text-2xl font-bold text-white">Manage PT Subscriptions</h1>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
          >
            Back to Admin
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
            <p className="text-gray-400 text-xs sm:text-sm">Total PT Members</p>
            <p className="text-lg sm:text-2xl font-bold text-white">{subscriptions.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
            <p className="text-gray-400 text-xs sm:text-sm">Active</p>
            <p className="text-lg sm:text-2xl font-bold text-green-500">
              {subscriptions.filter(s => s.status === 'active').length}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
            <p className="text-gray-400 text-xs sm:text-sm">Pending</p>
            <p className="text-lg sm:text-2xl font-bold text-yellow-500">
              {subscriptions.filter(s => s.payment_status === 'pending').length}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
            <p className="text-gray-400 text-xs sm:text-sm">PT Revenue</p>
            <p className="text-lg sm:text-2xl font-bold text-orange-500">
              रू{subscriptions
                .filter(s => s.payment_status === 'confirmed')
                .reduce((sum, s) => sum + (s.pt_packages?.price || 0), 0)}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'pending', 'active', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded text-sm capitalize ${filter === f ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              {f} ({f === 'all' ? subscriptions.length : subscriptions.filter(s => s.payment_status === f || s.status === f).length})
            </button>
          ))}
        </div>

        {/* Subscriptions List */}
        {filteredSubs.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-xl">No PT subscriptions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubs.map((sub) => (
              <div key={sub.id} className="bg-gray-900 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-white">{sub.app_users?.full_name}</h3>
                      <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(sub.status)}`}>
                        {sub.status}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs text-white ${sub.payment_status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                        {sub.payment_status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{sub.app_users?.email}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-sm">
                      <p className="text-gray-400">Package: <span className="text-white">{sub.pt_packages?.name || 'N/A'}</span></p>
                      <p className="text-gray-400">Price: <span className="text-orange-500 font-bold">रू{sub.pt_packages?.price || 'N/A'}</span></p>
                      <p className="text-gray-400">Sessions: <span className="text-white">{sub.sessions_remaining ?? sub.sessions_total}/{sub.sessions_total}</span></p>
                      <p className="text-gray-400">Trainer: <span className="text-white">{sub.trainer?.full_name || 'Not assigned'}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {sub.payment_status === 'pending' && (
                      <button
                        onClick={() => handleConfirmPayment(sub.id)}
                        className="bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600"
                      >
                        Confirm Payment
                      </button>
                    )}
                    <button
                      onClick={() => openAssignModal(sub)}
                      className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
                    >
                      {sub.trainer_id ? 'Change Trainer' : 'Assign Trainer'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Trainer Modal */}
      {showAssignModal && selectedSub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">
              Assign Trainer to {selectedSub.app_users?.full_name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Select Trainer *</label>
                <select
                  value={assignForm.trainer_id}
                  onChange={(e) => setAssignForm({...assignForm, trainer_id: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                >
                  <option value="">Choose trainer...</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Schedule Days</label>
                <div className="flex flex-wrap gap-2">
                  {dayNames.map((day, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const days = assignForm.schedule_days.includes(i)
                          ? assignForm.schedule_days.filter(d => d !== i)
                          : [...assignForm.schedule_days, i]
                        setAssignForm({...assignForm, schedule_days: days})
                      }}
                      className={`px-3 py-2 rounded text-sm ${assignForm.schedule_days.includes(i) ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Time Slot</label>
                <input
                  type="text"
                  value={assignForm.time_slot}
                  onChange={(e) => setAssignForm({...assignForm, time_slot: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  placeholder="e.g. 5:00 PM - 6:00 PM"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 bg-gray-700 text-white py-3 rounded font-bold hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTrainer}
                disabled={submitting}
                className="flex-1 bg-orange-500 text-white py-3 rounded font-bold hover:bg-orange-600 disabled:opacity-50"
              >
                {submitting ? 'Assigning...' : 'Assign Trainer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}