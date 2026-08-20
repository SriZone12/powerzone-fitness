'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MemberDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [membership, setMembership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [plans, setPlans] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [notices, setNotices] = useState([])
  const [showFreezeModal, setShowFreezeModal] = useState(false)
  const [freezeForm, setFreezeForm] = useState({ start_date: '', end_date: '', reason: '' })

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      const { data: userData } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      setUser(userData)

      if (userData.role === 'admin') {
        router.push('/admin')
        return
      }
      if (userData.role === 'trainer') {
        router.push('/trainer')
        return
      }

      // First check for active membership, then pending, then latest
      let membershipData = null

      const { data: activeMembership } = await supabase
        .from('member_memberships')
        .select('*, membership_plan(*)')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Auto-unfreeze if freeze period has ended
      if (activeMembership && activeMembership.freeze_approved && activeMembership.freeze_end_date) {
        if (new Date(activeMembership.freeze_end_date) < new Date()) {
          await supabase
            .from('member_memberships')
            .update({
              freeze_approved: false,
              freeze_requested: false,
              freeze_start_date: null,
              freeze_end_date: null,
              freeze_reason: null
            })
            .eq('id', activeMembership.id)
          activeMembership.freeze_approved = false
          activeMembership.freeze_requested = false
        }
      }

      // Auto-expire if end_date has passed
      if (activeMembership && new Date(activeMembership.end_date) < new Date()) {
        await supabase
          .from('member_memberships')
          .update({ status: 'expired' })
          .eq('id', activeMembership.id)
        activeMembership.status = 'expired'
      }

      if (activeMembership && activeMembership.status === 'active') {
        membershipData = activeMembership
      } else {
        const { data: latestMembership } = await supabase
          .from('member_memberships')
          .select('*, membership_plan(*)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        membershipData = latestMembership
      }

      setMembership(membershipData)

      // Get available plans for renewal
      const { data: plansData } = await supabase
        .from('membership_plan')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })

      setPlans(plansData || [])

      // Fetch notices
      const { data: noticesData } = await supabase
        .from('gym_notices')
        .select('*')
        .eq('is_active', true)
        .in('target_audience', ['all', 'members'])
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(5)

      setNotices(noticesData || [])
      setLoading(false)
    }

    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleRenew = async () => {
    if (!user || !selectedPlan) return

    setSubmitting(true)

    // Check for existing pending membership
    const { data: existingPending } = await supabase
      .from('member_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(1)
      .single()

    if (existingPending) {
      alert('You already have a pending membership! Please wait for admin confirmation.')
      setSubmitting(false)
      return
    }

    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + selectedPlan.duration_days)

    const { error } = await supabase
      .from('member_memberships')
      .insert([
        {
          user_id: user.id,
          plan_id: selectedPlan.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'pending',
          payment_status: 'pending',
          payment_method: 'cash',
          payment_date: new Date().toISOString()
        }
      ])

    if (!error) {
      setShowRenewModal(false)
      setSelectedPlan(null)
      // Refresh membership data - priority: active > pending > latest
      let membershipData = null
      const { data: activeMembership } = await supabase
        .from('member_memberships')
        .select('*, membership_plan(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (activeMembership) {
        membershipData = activeMembership
      } else {
        const { data: latestMembership } = await supabase
          .from('member_memberships')
          .select('*, membership_plan(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        membershipData = latestMembership
      }
      setMembership(membershipData)
      alert('Renewal request sent! Please go to the gym to pay cash.')
    } else {
      alert('Error: ' + error.message)
    }
    
    setSubmitting(false)
  }

  const handleFreezeRequest = async () => {
    if (!user || !membership || !freezeForm.start_date || !freezeForm.end_date) {
      alert('Please select start and end dates')
      return
    }
    if (new Date(freezeForm.end_date) <= new Date(freezeForm.start_date)) {
      alert('End date must be after start date')
      return
    }

    setSubmitting(true)
    const { error } = await supabase
      .from('member_memberships')
      .update({
        freeze_requested: true,
        freeze_start_date: freezeForm.start_date,
        freeze_end_date: freezeForm.end_date,
        freeze_reason: freezeForm.reason,
        freeze_approved: false
      })
      .eq('id', membership.id)

    if (!error) {
      alert('Freeze request submitted! Admin will review and approve.')
      setShowFreezeModal(false)
      setFreezeForm({ start_date: '', end_date: '', reason: '' })
      setMembership({ ...membership, freeze_requested: true, freeze_approved: false })
    } else {
      alert('Error: ' + error.message)
    }
    setSubmitting(false)
  }

  const getStatusDisplay = () => {
    if (!membership) {
      return {
        color: 'bg-gray-900',
        status: 'No Membership',
        statusColor: 'text-gray-400',
        message: 'You haven\'t purchased a membership yet.'
      }
    }

    switch (membership.status) {
      case 'active':
        return {
          color: 'bg-green-900',
          status: 'Active',
          statusColor: 'text-green-500',
          message: null
        }
      case 'pending':
        return {
          color: 'bg-yellow-900',
          status: 'Pending Confirmation',
          statusColor: 'text-yellow-500',
          message: 'Please go to the gym to pay cash. Your membership will be activated after admin confirms your payment.'
        }
      case 'expired':
        return {
          color: 'bg-red-900',
          status: 'Expired',
          statusColor: 'text-red-500',
          message: 'Your membership has expired. Please renew to continue.'
        }
      case 'rejected':
        return {
          color: 'bg-red-900',
          status: 'Payment Rejected',
          statusColor: 'text-red-500',
          message: 'Your payment was rejected. Please contact the gym.'
        }
      default:
        return {
          color: 'bg-gray-900',
          status: membership.status,
          statusColor: 'text-gray-400',
          message: null
        }
    }
  }

  const canRenew = () => {
    return membership && (membership.status === 'expired' || membership.status === 'rejected')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Powerzone Fitness</h1>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <span className="text-gray-400 text-sm">Welcome, {user?.full_name}</span>
            {user?.is_new_member && user?.claim_status !== 'approved' && (
              <span className="bg-green-500 text-white px-2 py-0.5 rounded text-xs font-bold">New Member</span>
            )}
            {user?.claim_status === 'pending' && (
              <span className="bg-yellow-500 text-black px-2 py-0.5 rounded text-xs font-bold">Claim Pending</span>
            )}
            {user?.claim_status === 'approved' && (
              <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-bold">Existing Member ✓</span>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">Member Dashboard</h2>

        {/* Existing Member Claim Pending Notice */}
        {user?.claim_status === 'pending' && (
          <div className="bg-yellow-900 border-l-4 border-yellow-500 rounded-lg p-4 mb-6">
            <p className="text-white font-bold">⏳ Existing Member Claim Pending</p>
            <p className="text-yellow-300 text-sm mt-1">Your request to be recognized as an existing gym member is being reviewed by the admin. You will not be charged admission fee once approved.</p>
          </div>
        )}

        {user?.claim_status === 'approved' && (
          <div className="bg-green-900 border-l-4 border-green-500 rounded-lg p-4 mb-6">
            <p className="text-white font-bold">✅ Existing Member Verified</p>
            <p className="text-green-300 text-sm mt-1">Your existing membership has been verified by the admin. No admission fee will be charged.</p>
          </div>
        )}

        {/* Membership Card */}
        <div className={`${statusDisplay.color} rounded-lg p-6 mb-6`}>
          <h3 className="text-xl font-bold text-white mb-4">My Membership</h3>
          
          {membership ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-400 text-sm">Plan</p>
                  <p className="text-white font-bold text-lg">{membership.membership_plan?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <p className={`font-bold text-lg ${statusDisplay.statusColor}`}>{statusDisplay.status}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Valid From</p>
                  <p className="text-white font-bold">{membership.start_date}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Valid Until</p>
                  <p className="text-white font-bold">{membership.end_date}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Payment</p>
                  {membership.status === 'expired' ? (
                    <p className="font-bold text-red-500">Unpaid</p>
                  ) : membership.payment_status === 'confirmed' ? (
                    <p className="font-bold text-green-500">Paid</p>
                  ) : (
                    <p className="font-bold text-yellow-500">Pending</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Amount</p>
                  <p className="text-white font-bold">रू{membership.membership_plan?.price || 'N/A'}</p>
                </div>
              </div>

              {/* Freeze Status */}
              {membership.freeze_requested && (
                <div className={`rounded p-3 mt-2 ${membership.freeze_approved ? 'bg-blue-900' : 'bg-yellow-900'}`}>
                  <p className="text-white font-bold text-sm">
                    {membership.freeze_approved ? '❄️ Membership Frozen' : '⏳ Freeze Request Pending'}
                  </p>
                  <p className="text-gray-300 text-xs">
                    {membership.freeze_start_date} to {membership.freeze_end_date}
                  </p>
                </div>
              )}

              {/* Freeze Button */}
              {membership.status === 'active' && membership.payment_status === 'confirmed' && !membership.freeze_requested && (
                <button
                  onClick={() => setShowFreezeModal(true)}
                  className="w-full mt-3 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 text-sm"
                >
                  ❄️ Request Membership Freeze
                </button>
              )}

              {/* Renew Button */}
              {statusDisplay.status === 'Expired' && (
                <button 
                  onClick={() => setShowRenewModal(true)}
                  className="w-full mt-4 bg-orange-500 text-white py-3 rounded font-bold hover:bg-orange-600"
                >
                  Renew Membership
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-400 mb-4">You haven&apos;t purchased a membership yet.</p>
              <button 
                onClick={() => router.push('/member/plans')}
                className="w-full bg-orange-500 text-white py-3 rounded font-bold hover:bg-orange-600"
              >
                View Membership Plans
              </button>
            </div>
          )}
        </div>

        {/* Notices */}
        {notices.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <h3 className="text-xl font-bold text-white mb-4">📢 Announcements</h3>
            <div className="space-y-3">
              {notices.map(notice => (
                <div
                  key={notice.id}
                  className={`rounded-lg p-4 border-l-4 ${
                    notice.priority === 'urgent' ? 'border-l-red-500 bg-red-900' :
                    notice.priority === 'high' ? 'border-l-yellow-500 bg-yellow-900' :
                    'border-l-blue-500 bg-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-bold">{notice.title}</h4>
                    {notice.priority === 'urgent' && <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded">URGENT</span>}
                    {notice.priority === 'high' && <span className="bg-yellow-600 text-white text-xs px-2 py-0.5 rounded">HIGH</span>}
                  </div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{notice.content}</p>
                  <p className="text-gray-500 text-xs mt-2">{new Date(notice.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4">
          {/* Personal Training */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">Personal Training</h3>
            <p className="text-gray-400 text-sm mb-4">View trainer, schedule & progress</p>
            <button 
              onClick={() => router.push('/member/pt')}
              className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600 text-sm"
            >
              My PT Dashboard
            </button>
          </div>

          {/* Classes */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">Classes</h3>
            <p className="text-gray-400 text-sm mb-4">Browse & book gym classes</p>
            <button
              onClick={() => router.push('/member/classes')}
              className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600 text-sm"
            >
              View Classes
            </button>
          </div>

          {/* Attendance */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">My Attendance</h3>
            <p className="text-gray-400 text-sm mb-4">Check your attendance history</p>
            <button
              onClick={() => router.push('/member/attendance')}
              className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600 text-sm"
            >
              View History
            </button>
          </div>

          {/* Payments */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">Payments</h3>
            <p className="text-gray-400 text-sm mb-4">View your payment history</p>
            <button
              onClick={() => router.push('/member/payments')}
              className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600 text-sm"
            >
              View Payments
            </button>
          </div>
        </div>

      </div>

      {/* Freeze Modal */}
      {showFreezeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Request Membership Freeze</h3>
            <p className="text-gray-400 text-sm mb-4">
              Freeze your membership for a period when you can&apos;t come to the gym. Your end date will be extended by the freeze duration.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Freeze Start Date *</label>
                <input type="date" value={freezeForm.start_date}
                  onChange={(e) => setFreezeForm({...freezeForm, start_date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Freeze End Date *</label>
                <input type="date" value={freezeForm.end_date}
                  onChange={(e) => setFreezeForm({...freezeForm, end_date: e.target.value})}
                  min={freezeForm.start_date || new Date().toISOString().split('T')[0]}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Reason</label>
                <textarea value={freezeForm.reason}
                  onChange={(e) => setFreezeForm({...freezeForm, reason: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  rows={3} placeholder="e.g. Traveling, medical reasons..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowFreezeModal(false)}
                className="flex-1 bg-gray-700 text-white py-3 rounded font-bold hover:bg-gray-600">
                Cancel
              </button>
              <button onClick={handleFreezeRequest} disabled={submitting}
                className="flex-1 bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renewal Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Renew Your Membership</h3>
            
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-gray-400 text-sm">Expired Plan</p>
              <p className="text-white font-bold">{membership?.membership_plan?.name}</p>
            </div>

            <div className="mb-4">
              <label className="block text-white mb-3 font-bold">Select Renewal Plan</label>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <label 
                    key={plan.id} 
                    className={`flex items-center justify-between p-3 rounded cursor-pointer border-2 ${
                      selectedPlan?.id === plan.id ? 'border-orange-500 bg-gray-800' : 'border-gray-700 bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="renewal"
                        value={plan.id}
                        checked={selectedPlan?.id === plan.id}
                        onChange={() => setSelectedPlan(plan)}
                        className="mr-3"
                      />
                      <div>
                        <p className="text-white font-bold">{plan.name}</p>
                        <p className="text-gray-400 text-sm">{plan.duration_days} days</p>
                      </div>
                    </div>
                    <p className="text-orange-500 font-bold">रू{plan.price}</p>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-yellow-900 rounded-lg p-4 mb-6">
              <p className="text-white font-bold text-sm mb-2">📋 Payment Instructions:</p>
              <ol className="text-gray-300 text-xs space-y-1">
                <li>1. Go to Powerzone Fitness gym</li>
                <li>2. Tell them you want to renew membership</li>
                <li>3. Pay the amount in cash</li>
                <li>4. Your membership will be activated after admin confirms</li>
              </ol>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowRenewModal(false)}
                className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleRenew}
                disabled={!selectedPlan || submitting}
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Confirm Renewal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}