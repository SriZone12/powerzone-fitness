'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminStaff() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [setupMember, setSetupMember] = useState(null)
  const [setupForm, setSetupForm] = useState({ plan_id: '', start_date: '', end_date: '', payment_method: 'cash' })

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: userData } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (userData.role === 'member') { router.push('/member'); return }
      if (userData.role === 'trainer') { router.push('/trainer'); return }

      setUser(session.user)
      fetchData()
    }
    checkAuth()
  }, [router])

  const fetchData = async () => {
    const [usersRes, plansRes] = await Promise.all([
      supabase.from('app_users').select('*').order('full_name'),
      supabase.from('membership_plan').select('*').eq('is_active', true).order('price')
    ])
    if (!usersRes.error) setAllUsers(usersRes.data)
    if (!plansRes.error) setPlans(plansRes.data || [])
    setLoading(false)
  }

  const handleRoleChange = async (userId, newRole) => {
    const { error } = await supabase
      .from('app_users')
      .update({ role: newRole })
      .eq('id', userId)
    if (!error) {
      alert('Role updated!')
      fetchData()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const togglePreApp = async (userId, currentStatus) => {
    const newStatus = !currentStatus
    const updates = {
      is_pre_app_member: newStatus,
      is_new_member: !newStatus,
      admission_fee_paid: newStatus
    }
    const { error } = await supabase
      .from('app_users')
      .update(updates)
      .eq('id', userId)
    if (!error) {
      if (newStatus) {
        alert('Marked as Pre-App Member! They will never be charged admission fee.')
      } else {
        alert('Removed Pre-App status.')
      }
      fetchData()
    }
  }

  const openSetupModal = (u) => {
    setSetupMember(u)
    const today = new Date().toISOString().split('T')[0]
    setSetupForm({ plan_id: '', start_date: today, end_date: '', payment_method: 'cash' })
    setShowSetupModal(true)
  }

  const handleSetupMembership = async () => {
    if (!setupForm.plan_id || !setupForm.start_date || !setupForm.end_date) {
      alert('Please fill all fields')
      return
    }
    const plan = plans.find(p => p.id === setupForm.plan_id)
    if (!plan) return

    const { error } = await supabase.from('member_memberships').insert({
      user_id: setupMember.id,
      plan_id: setupForm.plan_id,
      start_date: setupForm.start_date,
      end_date: setupForm.end_date,
      status: 'active',
      payment_status: 'confirmed',
      payment_method: setupForm.payment_method,
      payment_date: new Date().toISOString(),
      admission_fee: 0
    })

    if (!error) {
      alert('Membership created! ' + setupMember.full_name + ' now has an active ' + plan.name + ' plan.')
      setShowSetupModal(false)
      setSetupMember(null)
      fetchData()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const calculateEndDate = (planId, startDate) => {
    const plan = plans.find(p => p.id === planId)
    if (!plan || !startDate) return
    const start = new Date(startDate)
    start.setDate(start.getDate() + plan.duration_days)
    setSetupForm(prev => ({
      ...prev,
      end_date: start.toISOString().split('T')[0]
    }))
  }

  const openProfile = (u) => {
    setSelectedUser(u)
    setShowModal(true)
  }

  const trainerList = allUsers.filter(u => u.role === 'trainer')
  const admins = allUsers.filter(u => u.role === 'admin')
  const members = allUsers.filter(u => u.role === 'member')
  const preAppMembers = members.filter(u => u.is_pre_app_member)
  const appMembers = members.filter(u => !u.is_pre_app_member)

  const filteredUsers = filter === 'all' ? allUsers :
    filter === 'trainer' ? trainerList :
    filter === 'admin' ? admins :
    filter === 'member' ? members :
    filter === 'pre-app' ? preAppMembers :
    allUsers

  const roleBadge = {
    admin: 'bg-red-600',
    trainer: 'bg-blue-600',
    member: 'bg-green-600'
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
          <h1 className="text-xl sm:text-2xl font-bold text-white">User Management</h1>
          <button onClick={() => router.push('/admin')} className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Total Users</p>
            <p className="text-lg sm:text-2xl font-bold text-white">{allUsers.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Admins</p>
            <p className="text-lg sm:text-2xl font-bold text-red-500">{admins.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Trainers</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-500">{trainerList.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Pre-App Members</p>
            <p className="text-lg sm:text-2xl font-bold text-purple-500">{preAppMembers.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">App Members</p>
            <p className="text-lg sm:text-2xl font-bold text-green-500">{appMembers.length}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'all', label: 'All' },
            { key: 'admin', label: 'Admins' },
            { key: 'trainer', label: 'Trainers' },
            { key: 'member', label: 'All Members' },
            { key: 'pre-app', label: 'Pre-App Members' }
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded text-sm whitespace-nowrap ${filter === f.key ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
              {f.label} ({f.key === 'all' ? allUsers.length : f.key === 'admin' ? admins.length : f.key === 'trainer' ? trainerList.length : f.key === 'pre-app' ? preAppMembers.length : members.length})
            </button>
          ))}
        </div>

        <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Member Type</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className="border-b border-gray-700 hover:bg-gray-800">
                    <td className="p-3">
                      <p className="text-white font-bold">{u.full_name}</p>
                      {u.phone && <p className="text-gray-500 text-xs">{u.phone}</p>}
                    </td>
                    <td className="p-3 text-gray-400 text-sm">{u.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs text-white ${roleBadge[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {u.role === 'member' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => togglePreApp(u.id, u.is_pre_app_member)}
                            className={`px-2 py-1 rounded text-xs font-bold text-white cursor-pointer ${
                              u.is_pre_app_member ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-600 hover:bg-gray-500'
                            }`}
                          >
                            {u.is_pre_app_member ? 'Pre-App' : 'App Member'}
                          </button>
                          {u.is_pre_app_member && (
                            <button
                              onClick={() => openSetupModal(u)}
                              className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold hover:bg-blue-600"
                            >
                              Setup Plan
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => openProfile(u)}
                          className="bg-gray-700 text-white px-3 py-1 rounded text-xs hover:bg-gray-600">
                          View
                        </button>
                        {u.id !== user?.id && (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="bg-gray-700 text-white px-2 py-1 rounded text-xs border border-gray-600"
                          >
                            <option value="member">Member</option>
                            <option value="trainer">Trainer</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">User Profile</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-400 text-sm">Name</p>
                  <p className="text-white font-bold">{selectedUser.full_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Role</p>
                  <span className={`px-2 py-0.5 rounded text-xs text-white ${roleBadge[selectedUser.role]}`}>{selectedUser.role}</span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Phone</p>
                  <p className="text-white">{selectedUser.phone}</p>
                </div>
                {selectedUser.role === 'member' && (
                  <>
                    <div>
                      <p className="text-gray-400 text-sm">Member Type</p>
                      {selectedUser.is_pre_app_member ? (
                        <span className="bg-purple-500 text-white px-2 py-0.5 rounded text-xs font-bold">Pre-App Member</span>
                      ) : (
                        <span className="bg-green-500 text-white px-2 py-0.5 rounded text-xs font-bold">App Member</span>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Admission Fee</p>
                      <p className="text-white">{selectedUser.admission_fee_paid ? 'Paid' : 'Not Paid'}</p>
                    </div>
                  </>
                )}
              </div>
              {selectedUser.age && (
                <div className="border-t border-gray-700 pt-3">
                  <h4 className="text-white font-bold mb-2">Physical Info</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-400">Age: </span><span className="text-white">{selectedUser.age}</span></div>
                    <div><span className="text-gray-400">Gender: </span><span className="text-white capitalize">{selectedUser.gender}</span></div>
                    <div><span className="text-gray-400">Height: </span><span className="text-white">{selectedUser.height}</span></div>
                    <div><span className="text-gray-400">Weight: </span><span className="text-white">{selectedUser.weight}</span></div>
                  </div>
                </div>
              )}
              {selectedUser.emergency_contact_name && (
                <div className="border-t border-gray-700 pt-3">
                  <h4 className="text-white font-bold mb-2">Emergency Contact</h4>
                  <p className="text-sm text-white">{selectedUser.emergency_contact_name} - {selectedUser.emergency_contact_phone}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-700 text-white py-3 rounded font-bold hover:bg-gray-600">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showSetupModal && setupMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-white mb-2">Setup Membership</h3>
            <p className="text-purple-400 text-sm mb-4">Setting up membership for: <strong>{setupMember.full_name}</strong></p>
            <p className="text-gray-400 text-xs mb-4">This member was already paying before the app. Set up their existing membership so it shows active in the app.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Select Plan</label>
                <select value={setupForm.plan_id}
                  onChange={(e) => {
                    setSetupForm(prev => ({ ...prev, plan_id: e.target.value }))
                    calculateEndDate(e.target.value, setupForm.start_date)
                  }}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700">
                  <option value="">Choose plan...</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - रू{p.price} ({p.duration_days} days)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Start Date</label>
                  <input type="date" value={setupForm.start_date}
                    onChange={(e) => {
                      setSetupForm(prev => ({ ...prev, start_date: e.target.value }))
                      calculateEndDate(setupForm.plan_id, e.target.value)
                    }}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">End Date</label>
                  <input type="date" value={setupForm.end_date}
                    onChange={(e) => setSetupForm(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Payment Method</label>
                <select value={setupForm.payment_method}
                  onChange={(e) => setSetupForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700">
                  <option value="cash">Cash (already paid offline)</option>
                  <option value="esewa">eSewa</option>
                  <option value="khalti">Khalti</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowSetupModal(false); setSetupMember(null) }}
                className="flex-1 bg-gray-700 text-white py-3 rounded font-bold hover:bg-gray-600">
                Cancel
              </button>
              <button onClick={handleSetupMembership}
                className="flex-1 bg-purple-500 text-white py-3 rounded font-bold hover:bg-purple-600">
                Create Membership
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
