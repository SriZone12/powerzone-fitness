'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MemberPlans() {
  const router = useRouter()
  const [plans, setPlans] = useState([])
  const [currentMembership, setCurrentMembership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [admissionFee, setAdmissionFee] = useState(0)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
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

      if (userData.role === 'admin') { router.push('/admin'); return }

      setUser(session.user)
      setUserProfile(userData)

      const { data: settings } = await supabase
        .from('gym_settings')
        .select('value')
        .eq('key', 'admission_fee')
        .single()

      if (settings) setAdmissionFee(parseInt(settings.value) || 0)

      fetchPlans()
      fetchCurrentMembership(session.user.id)
    }
    checkAuth()
  }, [router])

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('membership_plan')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })
    
    if (!error) setPlans(data)
    setLoading(false)
  }

  const fetchCurrentMembership = async (userId) => {
    const { data: activeData } = await supabase
      .from('member_memberships')
      .select('*, membership_plan(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (activeData && new Date(activeData.end_date) < new Date()) {
      await supabase
        .from('member_memberships')
        .update({ status: 'expired' })
        .eq('id', activeData.id)
      activeData.status = 'expired'
    }

    if (activeData && activeData.status === 'active') {
      setCurrentMembership(activeData)
      return
    }

    const { data: pendingData } = await supabase
      .from('member_memberships')
      .select('*, membership_plan(*)')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (pendingData) {
      setCurrentMembership(pendingData)
      return
    }

    const { data, error } = await supabase
      .from('member_memberships')
      .select('*, membership_plan(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (!error && data) {
      setCurrentMembership(data)
    } else {
      setCurrentMembership(null)
    }
  }

  const shouldChargeAdmission = (plan) => {
    if (!userProfile) return false
    if (userProfile.admission_fee_paid) return false
    if (!userProfile.is_new_member) return false
    if (userProfile.claim_status === 'approved') return false
    if (!plan.admission_fee || plan.admission_fee <= 0) return false
    return true
  }

  const getTotalPrice = (plan) => {
    if (shouldChargeAdmission(plan)) {
      return plan.price + (plan.admission_fee || 0)
    }
    return plan.price
  }

  const canBuyPlan = () => {
    if (!currentMembership) return true
    return currentMembership.status === 'expired' || currentMembership.status === 'rejected'
  }

  const openPaymentModal = (plan) => {
    if (!canBuyPlan()) {
      alert('You already have an active or pending membership!')
      return
    }
    setSelectedPlan(plan)
    setPaymentMethod('cash')
    setShowPaymentModal(true)
  }

  const handleBuyPlan = async () => {
    if (!user || !selectedPlan || !userProfile) return
    setSubmitting(true)

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

    const fee = shouldChargeAdmission(selectedPlan) ? (selectedPlan.admission_fee || 0) : 0

    const { error } = await supabase
      .from('member_memberships')
      .insert([{
        user_id: user.id,
        plan_id: selectedPlan.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'cash',
        admission_fee: fee,
        payment_date: new Date().toISOString()
      }])

    if (!error) {
      setShowPaymentModal(false)
      setSelectedPlan(null)
      fetchCurrentMembership(user.id)
      alert('Membership request sent! Please go to the gym to pay cash. Your membership will be activated after admin confirms your payment.')
    } else {
      alert('Error purchasing membership: ' + error.message)
    }
    
    setSubmitting(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-500'
      case 'pending': return 'text-yellow-500'
      case 'expired': return 'text-red-500'
      default: return 'text-gray-400'
    }
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
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Membership Plans</h1>
          <button onClick={() => router.push('/member')}
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600">
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {currentMembership && (
          <div className={`rounded-lg p-6 mb-8 ${
            currentMembership.status === 'active' ? 'bg-green-900' : 
            currentMembership.status === 'expired' ? 'bg-red-900' : 'bg-yellow-900'
          }`}>
            <h2 className="text-2xl font-bold text-white mb-4">
              {currentMembership.status === 'expired' ? 'Your Previous Membership' : 'Your Current Membership'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400">Plan</p>
                <p className="text-white font-bold text-xl">{currentMembership.membership_plan?.name}</p>
              </div>
              <div>
                <p className="text-gray-400">Valid Until</p>
                <p className="text-white font-bold text-xl">{currentMembership.end_date}</p>
              </div>
              <div>
                <p className="text-gray-400">Status</p>
                <p className={`font-bold text-xl ${getStatusColor(currentMembership.status)}`}>
                  {currentMembership.status.charAt(0).toUpperCase() + currentMembership.status.slice(1)}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Payment</p>
                <p className={`font-bold text-xl ${currentMembership.payment_status === 'confirmed' ? 'text-green-500' : 'text-yellow-500'}`}>
                  {currentMembership.payment_status === 'confirmed' ? 'Paid' : 'Pending'}
                </p>
              </div>
            </div>
            {currentMembership.status === 'pending' && (
              <div className="mt-4 bg-yellow-800 rounded p-4">
                <p className="text-white font-bold">Waiting for Admin Confirmation</p>
                <p className="text-gray-300 mt-2">Please go to the gym and pay cash. Your membership will be activated after the admin confirms your payment.</p>
              </div>
            )}
          </div>
        )}

        <h2 className="text-3xl font-bold text-white mb-2">Available Plans</h2>
        {userProfile && userProfile.is_new_member && !userProfile.admission_fee_paid && selectedPlan && selectedPlan.admission_fee > 0 && (
          <p className="text-yellow-500 text-sm mb-6">New members pay an additional रू{selectedPlan.admission_fee} admission fee (one-time only).</p>
        )}

        {plans.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-xl">No membership plans available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const hasAdmission = shouldChargeAdmission(plan)
              const total = getTotalPrice(plan)
              return (
                <div key={plan.id} className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold text-orange-500 mb-2">रू{plan.price}</div>
                  <p className="text-gray-400 mb-1">{plan.duration_days} days access</p>
                  {hasAdmission && (
                    <p className="text-yellow-500 text-sm mb-2">+ रू{selectedPlan.admission_fee} admission fee (one-time)</p>
                  )}
                  {hasAdmission && (
                    <p className="text-white font-bold text-lg mb-2">Total: रू{total}</p>
                  )}
                  <p className="text-gray-400 mb-6">{plan.description || 'Full access to gym facilities'}</p>
                  
                  {canBuyPlan() ? (
                    <button
                      onClick={() => openPaymentModal(plan)}
                      className="w-full bg-orange-500 text-white py-3 rounded font-bold hover:bg-orange-600"
                    >
                      {currentMembership?.status === 'expired' ? 'Renew Now' : 'Buy Now'}
                    </button>
                  ) : (
                    <button disabled
                      className="w-full bg-gray-600 text-white py-3 rounded font-bold cursor-not-allowed">
                      {currentMembership?.status === 'active' ? 'Already Have Plan' : 'Membership Pending'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Complete Your Purchase</h3>
            
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-gray-400">Selected Plan</p>
              <p className="text-white font-bold text-xl">{selectedPlan.name}</p>
              <div className="mt-2 space-y-1">
                <p className="text-gray-400 text-sm">Plan Price: <span className="text-white">रू{selectedPlan.price}</span></p>
                {shouldChargeAdmission(selectedPlan) && (
                  <p className="text-yellow-500 text-sm">Admission Fee (one-time): <span className="text-white">रू{selectedPlan.admission_fee || 0}</span></p>
                )}
                <p className="text-orange-500 font-bold text-2xl mt-2">Total: रू{getTotalPrice(selectedPlan)}</p>
              </div>
            </div>

            {shouldChargeAdmission(selectedPlan) && (
              <div className="bg-yellow-900 rounded-lg p-3 mb-4">
                <p className="text-yellow-300 text-sm">Admission fee is a one-time charge for new members taking a 1-month plan. You won&apos;t be charged again after this.</p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-white mb-3">Payment Method</label>
              <label className={`flex items-center p-4 rounded-lg cursor-pointer border-2 ${
                paymentMethod === 'cash' ? 'border-orange-500 bg-gray-800' : 'border-gray-700 bg-gray-900'
              }`}>
                <input type="radio" name="payment" value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-3" />
                <div>
                  <p className="text-white font-bold">💵 Cash Payment</p>
                  <p className="text-gray-400 text-sm">Pay at the gym</p>
                </div>
              </label>
            </div>

            <div className="bg-yellow-900 rounded-lg p-4 mb-6">
              <p className="text-white font-bold mb-2">Payment Instructions:</p>
              <ol className="text-gray-300 text-sm space-y-2">
                <li>1. Go to Powerzone Fitness gym</li>
                <li>2. Tell them you want to pay for membership</li>
                <li>3. Pay रू{getTotalPrice(selectedPlan)} in cash</li>
                {shouldChargeAdmission(selectedPlan) && (
                  <li className="text-yellow-300">4. Includes रू{selectedPlan.admission_fee || 0} admission fee (one-time)</li>
                )}
                <li>{shouldChargeAdmission(selectedPlan) ? '5' : '4'}. Your membership will be activated after admin confirms</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-gray-700 text-white py-3 rounded font-bold hover:bg-gray-600">Cancel</button>
              <button onClick={handleBuyPlan} disabled={submitting}
                className="flex-1 bg-orange-500 text-white py-3 rounded font-bold hover:bg-orange-600 disabled:opacity-50">
                {submitting ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
