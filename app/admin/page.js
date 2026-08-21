'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [members, setMembers] = useState([])
  const [memberships, setMemberships] = useState([])
  const [pendingClaims, setPendingClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState(null)

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: userData } = await supabase
        .from('app_users').select('*').eq('id', session.user.id).single()

      setUser(userData)
      if (userData.role !== 'admin') {
        router.push('/member')
        return
      }

      const [membersRes, membershipsRes, claimsRes] = await Promise.all([
        supabase.from('app_users').select('*').eq('role', 'member'),
        supabase.from('member_memberships').select('*, membership_plan(*), app_users(*)'),
        supabase.from('app_users').select('*').eq('existing_member_claim', true).eq('claim_status', 'pending')
      ])

      setMembers(membersRes.data || [])
      setMemberships(membershipsRes.data || [])
      setPendingClaims(claimsRes.data || [])
      setLoading(false)
    }
    getData()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getData = async () => {
    const [membersRes, membershipsRes, claimsRes] = await Promise.all([
      supabase.from('app_users').select('*').eq('role', 'member'),
      supabase.from('member_memberships').select('*, membership_plan(*), app_users(*)'),
      supabase.from('app_users').select('*').eq('existing_member_claim', true).eq('claim_status', 'pending')
    ])
    setMembers(membersRes.data || [])
    setMemberships(membershipsRes.data || [])
    setPendingClaims(claimsRes.data || [])
  }

  const handleApproveClaim = async (userId) => {
    const { error } = await supabase
      .from('app_users')
      .update({ claim_status: 'approved', is_new_member: false, admission_fee_paid: true })
      .eq('id', userId)
    if (!error) {
      alert('Existing member claim approved! Admission fee waived.')
      getData()
    }
  }

  const handleRejectClaim = async (userId) => {
    if (!confirm('Reject this claim? The member will be treated as a new member.')) return
    const { error } = await supabase
      .from('app_users')
      .update({ claim_status: 'rejected', existing_member_claim: false })
      .eq('id', userId)
    if (!error) {
      alert('Claim rejected.')
      getData()
    }
  }

  const getBestMembership = (userId) => {
    const um = memberships.filter(m => m.user_id === userId)
    if (um.length === 0) return null
    const active = um.find(m => m.status === 'active')
    if (active) return active
    const pending = um.find(m => m.status === 'pending')
    if (pending) return pending
    return [...um].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
  }

  const getModalTitle = () => {
    switch (activeModal) {
      case 'members': return 'All Members'
      case 'active': return 'Active Memberships'
      case 'revenue': return 'Revenue Details'
      default: return ''
    }
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
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Powerzone Fitness - Admin</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-gray-400 text-sm hidden sm:inline">Welcome, {user?.full_name}</span>
            <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm">Logout</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">Admin Dashboard</h2>

        {/* Pending Existing Member Claims */}
        {pendingClaims.length > 0 && (
          <div className="mb-6 space-y-3">
            {pendingClaims.map((c) => (
              <div key={c.id} className="bg-green-900 border-l-4 border-green-500 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-white font-bold">Existing Member Claim</p>
                  <p className="text-green-300 text-sm">{c.full_name} ({c.email}) claims they are already a gym member and have paid admission fee.</p>
                  <p className="text-green-400 text-xs mt-1">Phone: {c.phone || 'N/A'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApproveClaim(c.id)} className="bg-green-500 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-600">Approve</button>
                  <button onClick={() => handleRejectClaim(c.id)} className="bg-red-500 text-white px-4 py-2 rounded text-sm font-bold hover:bg-red-600">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending Payment Alerts */}
        {memberships.filter(m => m.payment_status === 'pending').length > 0 && (
          <div className="mb-6">
            <button onClick={() => router.push('/admin/payments')}
              className="w-full bg-yellow-900 border-l-4 border-yellow-500 rounded-lg p-4 flex items-center justify-between hover:bg-yellow-800 transition">
              <div className="flex items-center gap-3">
                <span className="text-2xl">&#128176;</span>
                <div className="text-left">
                  <p className="text-white font-bold">Pending Payments</p>
                  <p className="text-yellow-300 text-sm">{memberships.filter(m => m.payment_status === 'pending').length} member(s) waiting</p>
                </div>
              </div>
              <span className="bg-yellow-500 text-black font-bold px-3 py-1 rounded-full text-sm">{memberships.filter(m => m.payment_status === 'pending').length}</span>
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
          <button onClick={() => setActiveModal('members')}
            className="bg-gray-900 rounded-lg p-4 sm:p-6 text-left hover:bg-gray-800 transition cursor-pointer border-2 border-transparent hover:border-orange-500">
            <h3 className="text-gray-400 mb-2 text-sm">Total Members</h3>
            <p className="text-2xl sm:text-4xl font-bold text-white">{members.length}</p>
            <p className="text-orange-500 text-xs mt-2">Click to view &#8594;</p>
          </button>

          <button onClick={() => setActiveModal('active')}
            className="bg-gray-900 rounded-lg p-4 sm:p-6 text-left hover:bg-gray-800 transition cursor-pointer border-2 border-transparent hover:border-green-500">
            <h3 className="text-gray-400 mb-2 text-sm">Active Memberships</h3>
            <p className="text-2xl sm:text-4xl font-bold text-green-500">{memberships.filter(m => m.status === 'active').length}</p>
            <p className="text-green-500 text-xs mt-2">Click to view &#8594;</p>
          </button>

          <button onClick={() => setActiveModal('revenue')}
            className="bg-gray-900 rounded-lg p-4 sm:p-6 text-left hover:bg-gray-800 transition cursor-pointer border-2 border-transparent hover:border-orange-500">
            <h3 className="text-gray-400 mb-2 text-sm">Total Revenue</h3>
            <p className="text-2xl sm:text-4xl font-bold text-orange-500">
              रू{memberships.filter(m => m.payment_status === 'confirmed').reduce((sum, m) => sum + (m.membership_plan?.price || 0) + (m.admission_fee || 0), 0)}
            </p>
            <p className="text-orange-500 text-xs mt-2">Click to view &#8594;</p>
          </button>

          <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
            <h3 className="text-gray-400 mb-2 text-sm">Pre-App Members</h3>
            <p className="text-2xl sm:text-4xl font-bold text-purple-500">{members.filter(m => m.is_pre_app_member).length}</p>
            <p className="text-purple-400 text-xs mt-2">Already paying before app</p>
          </div>
        </div>

        {/* Management Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white mb-2">Membership Plans</h3>
            <p className="text-gray-400 text-sm mb-4">Create and manage plans</p>
            <button onClick={() => router.push('/admin/plans')} className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600">Manage Plans</button>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white mb-2">Payments</h3>
            <p className="text-gray-400 text-sm mb-4">Confirm member payments</p>
            <button onClick={() => router.push('/admin/payments')} className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600">Manage Payments</button>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white mb-2">Member Management</h3>
            <p className="text-gray-400 text-sm mb-4">Setup plans, manage members</p>
            <button onClick={() => router.push('/admin/staff')} className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600">Manage Members</button>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white mb-2">Classes</h3>
            <p className="text-gray-400 text-sm mb-4">Manage gym classes</p>
            <button onClick={() => router.push('/admin/classes')} className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600">Manage Classes</button>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white mb-2">Attendance</h3>
            <p className="text-gray-400 text-sm mb-4">View reports & analytics</p>
            <button onClick={() => router.push('/admin/attendance')} className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600">View Reports</button>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white mb-2">Notice Board</h3>
            <p className="text-gray-400 text-sm mb-4">Post announcements</p>
            <button onClick={() => router.push('/admin/notices')} className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600">Manage Notices</button>
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
          <h3 className="text-xl font-bold text-white mb-4">All Members ({members.length})</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="p-3">Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Membership</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Expires</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const mb = getBestMembership(member.id)
                  return (
                    <tr key={member.id} className="border-b border-gray-700 hover:bg-gray-800">
                      <td className="p-3">
                        <p className="text-white font-bold">{member.full_name}</p>
                        <p className="text-gray-500 text-xs">{member.email}</p>
                      </td>
                      <td className="p-3 text-gray-400">{member.phone || 'N/A'}</td>
                      <td className="p-3">
                        {member.is_pre_app_member ? (
                          <span className="bg-purple-500 text-white px-2 py-1 rounded text-xs font-bold">Pre-App</span>
                        ) : member.is_new_member ? (
                          <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">New</span>
                        ) : (
                          <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs">Existing</span>
                        )}
                        {member.admission_fee_paid && (
                          <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs ml-1">Fee Paid</span>
                        )}
                      </td>
                      <td className="p-3 text-white">{mb?.membership_plan?.name || 'None'}</td>
                      <td className="p-3">
                        {mb ? (
                          <span className={`px-2 py-1 rounded text-white text-xs ${mb.status === 'active' ? 'bg-green-500' : mb.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`}>{mb.status}</span>
                        ) : (
                          <span className="text-gray-500 text-xs">No plan</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-400 text-sm">{mb?.end_date || 'N/A'}</td>
                    </tr>
                  )
                })}
                {members.length === 0 && (
                  <tr><td colSpan="6" className="p-3 text-center text-gray-400">No members yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 text-xs mt-2 text-center sm:hidden">&#8592; Swipe &#8594;</p>
        </div>
      </div>

      {/* Detail Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">{getModalTitle()}</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white text-2xl">X</button>
            </div>

            <div className="overflow-y-auto flex-1">
              {activeModal === 'members' && (
                <div>
                  <p className="text-gray-400 mb-4">{members.length} total members</p>
                  {members.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No members yet</p>
                  ) : (
                    <div className="space-y-3">
                      {members.map((member) => {
                        const mb = getBestMembership(member.id)
                        return (
                          <div key={member.id} className="bg-gray-800 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-white font-bold">{member.full_name}</p>
                                <p className="text-gray-400 text-sm">{member.email}</p>
                                <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${member.is_pre_app_member ? 'bg-purple-500 text-white' : member.is_new_member ? 'bg-green-500 text-white' : 'bg-gray-600 text-white'}`}>
                                  {member.is_pre_app_member ? 'Pre-App Member' : member.is_new_member ? 'New Member' : 'Existing Member'}
                                </span>
                              </div>
                              <div className="text-right">
                                {mb ? (
                                  <div>
                                    <span className={`text-sm font-bold ${getStatusColor(mb.status)}`}>{mb.status}</span>
                                    <p className="text-gray-400 text-xs">{mb.membership_plan?.name}</p>
                                  </div>
                                ) : (
                                  <span className="text-gray-500 text-sm">No membership</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeModal === 'active' && (
                <div>
                  <p className="text-gray-400 mb-4">{memberships.filter(m => m.status === 'active').length} active</p>
                  {memberships.filter(m => m.status === 'active').length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No active memberships</p>
                  ) : (
                    <div className="space-y-3">
                      {memberships.filter(m => m.status === 'active').map((m) => (
                        <div key={m.id} className="bg-gray-800 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-bold">{m.app_users?.full_name || 'Unknown'}</p>
                              <p className="text-gray-400 text-sm">{m.app_users?.email}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-green-500 font-bold">{m.membership_plan?.name}</p>
                              <p className="text-gray-400 text-xs">Expires: {m.end_date}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeModal === 'revenue' && (
                <div>
                  <p className="text-gray-400 mb-4">
                    रू{memberships.filter(m => m.payment_status === 'confirmed').reduce((sum, m) => sum + (m.membership_plan?.price || 0) + (m.admission_fee || 0), 0)}
                    {' '}total from {memberships.filter(m => m.payment_status === 'confirmed').length} payments
                  </p>
                  {memberships.filter(m => m.payment_status === 'confirmed').length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No confirmed payments</p>
                  ) : (
                    <div className="space-y-3">
                      {memberships.filter(m => m.payment_status === 'confirmed').map((m) => (
                        <div key={m.id} className="bg-gray-800 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-bold">{m.app_users?.full_name || 'Unknown'}</p>
                              <p className="text-gray-400 text-xs">{m.membership_plan?.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-orange-500 font-bold">रू{m.membership_plan?.price}</p>
                              {m.admission_fee > 0 && (
                                <p className="text-yellow-500 text-xs">+ रू{m.admission_fee} admission</p>
                              )}
                              <p className="text-green-500 text-xs">Confirmed</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
