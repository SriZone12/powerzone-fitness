'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminPayments() {
  const router = useRouter()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const { data: userData } = await supabase
        .from('app_users')
        .select('role')
        .eq('id', session.user.id)
        .single()
      if (userData.role !== 'admin') {
        router.push('/login')
        return
      }
      fetchPayments()
    }
    checkAuth()
  }, [router])

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('member_memberships')
      .select('*, membership_plan(*), app_users:user_id(full_name, email, phone)')
      .order('created_at', { ascending: false })
    
    if (!error) {
      setPayments(data)
    }
    setLoading(false)
  }

  const handleConfirmPayment = async (paymentId) => {
    if (confirm('Are you sure you want to confirm this payment?')) {
      setProcessingId(paymentId)

      const payment = payments.find(p => p.id === paymentId)

      const { error } = await supabase
        .from('member_memberships')
        .update({ 
          payment_status: 'confirmed',
          status: 'active'
        })
        .eq('id', paymentId)
      
      if (!error) {
        if (payment && payment.admission_fee > 0 && payment.user_id) {
          await supabase
            .from('app_users')
            .update({ admission_fee_paid: true })
            .eq('id', payment.user_id)
        }
        alert('Payment confirmed! Membership is now active.')
        fetchPayments()
      } else {
        alert('Error: ' + error.message)
      }
      setProcessingId(null)
    }
  }

  const handleRejectPayment = async (paymentId) => {
    if (confirm('Are you sure you want to reject this payment?')) {
      setProcessingId(paymentId)
      const { error } = await supabase
        .from('member_memberships')
        .update({ 
          payment_status: 'rejected',
          status: 'rejected'
        })
        .eq('id', paymentId)
      
      if (!error) {
        alert('Payment rejected.')
        fetchPayments()
      } else {
        alert('Error: ' + error.message)
      }
      setProcessingId(null)
    }
  }

  const handleApproveFreeze = async (paymentId) => {
    setProcessingId(paymentId)

    const sub = payments.find(p => p.id === paymentId)
    if (!sub) { setProcessingId(null); return }

    let updateData = { freeze_approved: true }

    if (sub.end_date && sub.freeze_start_date && sub.freeze_end_date) {
      const freezeDays = Math.ceil((new Date(sub.freeze_end_date) - new Date(sub.freeze_start_date)) / 86400000)
      const newEndDate = new Date(sub.end_date)
      newEndDate.setDate(newEndDate.getDate() + freezeDays)
      updateData.end_date = newEndDate.toISOString().split('T')[0]
      updateData.status = 'active'
    }

    const { error } = await supabase
      .from('member_memberships')
      .update(updateData)
      .eq('id', paymentId)

    if (!error) {
      alert(`Freeze approved! Membership end date extended by ${Math.ceil((new Date(sub.freeze_end_date) - new Date(sub.freeze_start_date)) / 86400000)} days.`)
      fetchPayments()
    } else {
      alert('Error: ' + error.message)
    }
    setProcessingId(null)
  }

  const handleRejectFreeze = async (paymentId) => {
    setProcessingId(paymentId)
    const { error } = await supabase
      .from('member_memberships')
      .update({ freeze_requested: false, freeze_approved: false, freeze_start_date: null, freeze_end_date: null, freeze_reason: null })
      .eq('id', paymentId)

    if (!error) {
      alert('Freeze request rejected.')
      fetchPayments()
    } else {
      alert('Error: ' + error.message)
    }
    setProcessingId(null)
  }

  const filteredPayments = payments.filter(payment => {
    if (filter === 'all') return true
    return payment.payment_status === filter
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500'
      case 'pending': return 'bg-yellow-500'
      case 'rejected': return 'bg-red-500'
      default: return 'bg-gray-500'
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
      {/* Header */}
      <div className="bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Payment Management</h1>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {/* Title and Filter */}
        <div className="flex flex-col gap-4 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">All Payments</h2>
          
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 rounded text-sm ${filter === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              All ({payments.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-2 rounded text-sm ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Pending ({payments.filter(p => p.payment_status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-3 py-2 rounded text-sm ${filter === 'confirmed' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Confirmed ({payments.filter(p => p.payment_status === 'confirmed').length})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-3 py-2 rounded text-sm ${filter === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Rejected ({payments.filter(p => p.payment_status === 'rejected').length})
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
            <p className="text-gray-400 text-xs sm:text-sm">Total Revenue</p>
            <p className="text-lg sm:text-2xl font-bold text-green-500">
              रू{payments.filter(p => p.payment_status === 'confirmed').reduce((sum, p) => sum + (p.membership_plan?.price || 0), 0)}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
            <p className="text-gray-400 text-xs sm:text-sm">Pending</p>
            <p className="text-lg sm:text-2xl font-bold text-yellow-500">
              रू{payments.filter(p => p.payment_status === 'pending').reduce((sum, p) => sum + (p.membership_plan?.price || 0), 0)}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
            <p className="text-gray-400 text-xs sm:text-sm">Active</p>
            <p className="text-lg sm:text-2xl font-bold text-green-500">
              {payments.filter(p => p.status === 'active').length}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
            <p className="text-gray-400 text-xs sm:text-sm">Pending</p>
            <p className="text-lg sm:text-2xl font-bold text-yellow-500">
              {payments.filter(p => p.payment_status === 'pending').length}
            </p>
          </div>
        </div>

        {/* Payments List - Mobile Friendly Cards */}
        <div className="space-y-4">
          {filteredPayments.length === 0 ? (
            <div className="bg-gray-900 rounded-lg p-8 text-center">
              <p className="text-gray-400">No payments found</p>
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <div key={payment.id} className="bg-gray-900 rounded-lg p-4">
                {/* Mobile: Card Layout */}
                <div className="sm:hidden">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-white font-bold">{payment.app_users?.full_name}</p>
                      <p className="text-gray-400 text-sm">{payment.app_users?.email}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-white text-xs ${getStatusColor(payment.payment_status)}`}>
                      {payment.payment_status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div>
                      <p className="text-gray-400">Plan</p>
                      <p className="text-white">{payment.membership_plan?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Amount</p>
                      <p className="text-green-500 font-bold">रू{payment.membership_plan?.price}</p>
                      {payment.admission_fee > 0 && (
                        <p className="text-yellow-500 text-xs">+ रू{payment.admission_fee} admission</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-400">Method</p>
                      <p className="text-white capitalize">{payment.payment_method}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Date</p>
                      <p className="text-white">{new Date(payment.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {payment.payment_status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirmPayment(payment.id)}
                        disabled={processingId === payment.id}
                        className="flex-1 bg-green-500 text-white py-2 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                      >
                        {processingId === payment.id ? 'Processing...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => handleRejectPayment(payment.id)}
                        disabled={processingId === payment.id}
                        className="flex-1 bg-red-500 text-white py-2 rounded text-sm hover:bg-red-600 disabled:opacity-50"
                      >
                        {processingId === payment.id ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                  )}

                  {/* Freeze Request */}
                  {payment.freeze_requested && !payment.freeze_approved && (
                    <div className="mt-3 bg-blue-900 rounded p-3">
                      <p className="text-white font-bold text-sm">❄️ Freeze Request</p>
                      <p className="text-gray-300 text-xs">{payment.freeze_start_date} to {payment.freeze_end_date}</p>
                      {payment.freeze_reason && <p className="text-gray-400 text-xs">Reason: {payment.freeze_reason}</p>}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleApproveFreeze(payment.id)}
                          disabled={processingId === payment.id}
                          className="flex-1 bg-blue-500 text-white py-1 rounded text-xs hover:bg-blue-600"
                        >
                          Approve Freeze
                        </button>
                        <button
                          onClick={() => handleRejectFreeze(payment.id)}
                          disabled={processingId === payment.id}
                          className="flex-1 bg-gray-600 text-white py-1 rounded text-xs hover:bg-gray-500"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                  {payment.freeze_requested && payment.freeze_approved && (
                    <div className="mt-3 bg-blue-800 rounded p-3">
                      <p className="text-white font-bold text-sm">❄️ Frozen</p>
                      <p className="text-gray-300 text-xs">{payment.freeze_start_date} to {payment.freeze_end_date}</p>
                    </div>
                  )}
                </div>

                {/* Desktop: Table Row Layout */}
                <div className="hidden sm:grid sm:grid-cols-7 sm:gap-4 sm:items-center">
                  <div>
                    <p className="text-white font-bold">{payment.app_users?.full_name}</p>
                    <p className="text-gray-400 text-sm">{payment.app_users?.email}</p>
                  </div>
                  <div className="text-white">{payment.membership_plan?.name}</div>
                  <div className="text-green-500 font-bold">रू{payment.membership_plan?.price}</div>
                  <div className="text-gray-400 capitalize">{payment.payment_method}</div>
                  <div>
                    <span className={`px-3 py-1 rounded-full text-white text-sm ${getStatusColor(payment.payment_status)}`}>
                      {payment.payment_status}
                    </span>
                  </div>
                  <div className="text-gray-400">{new Date(payment.created_at).toLocaleDateString()}</div>
                  <div>
                    {payment.payment_status === 'pending' ? (
                      <div className="space-x-2">
                        <button
                          onClick={() => handleConfirmPayment(payment.id)}
                          disabled={processingId === payment.id}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                        >
                          {processingId === payment.id ? 'Processing...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => handleRejectPayment(payment.id)}
                          disabled={processingId === payment.id}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 disabled:opacity-50"
                        >
                          {processingId === payment.id ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    ) : payment.freeze_requested && !payment.freeze_approved ? (
                      <div className="space-x-2">
                        <button
                          onClick={() => handleApproveFreeze(payment.id)}
                          disabled={processingId === payment.id}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                        >
                          Approve Freeze
                        </button>
                        <button
                          onClick={() => handleRejectFreeze(payment.id)}
                          disabled={processingId === payment.id}
                          className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-400"
                        >
                          Reject
                        </button>
                      </div>
                    ) : payment.freeze_requested && payment.freeze_approved ? (
                      <span className="text-blue-400 text-sm font-bold">❄️ Frozen</span>
                    ) : (
                      <span className="text-gray-400 text-sm">No actions</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}