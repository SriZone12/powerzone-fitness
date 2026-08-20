'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function StaffDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [members, setMembers] = useState([])
  const [memberships, setMemberships] = useState([])
  const [todayAttendance, setTodayAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(null)

  useEffect(() => {
    const getData = async () => {
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
      if (userData.role !== 'trainer') {
        router.push('/member')
        return
      }

      await fetchData()
    }

    getData()
  }, [router])

  const fetchData = async () => {
    const today = new Date().toISOString().split('T')[0]

    const [membersRes, membershipsRes, attendanceRes] = await Promise.all([
      supabase.from('app_users').select('*').eq('role', 'member'),
      supabase.from('member_memberships').select('*, membership_plan(*)'),
      supabase.from('attendance').select('*').gte('check_in', today).lt('check_in', today + 'T23:59:59')
    ])

    setMembers(membersRes.data || [])
    setMemberships(membershipsRes.data || [])
    setTodayAttendance(attendanceRes.data || [])
    setLoading(false)
  }

  const handleCheckIn = async (memberId) => {
    setCheckingIn(memberId)

    const alreadyCheckedIn = todayAttendance.find(a => a.user_id === memberId && !a.check_out)

    if (alreadyCheckedIn) {
      const { error } = await supabase
        .from('attendance')
        .update({ check_out: new Date().toISOString() })
        .eq('id', alreadyCheckedIn.id)

      if (!error) {
        fetchData()
      }
    } else {
      const { error } = await supabase
        .from('attendance')
        .insert([{
          user_id: memberId,
          check_in: new Date().toISOString(),
          marked_by: user.id
        }])

      if (!error) {
        fetchData()
      }
    }

    setCheckingIn(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getBestMembership = (userId) => {
    const userMemberships = memberships.filter(m => m.user_id === userId)
    if (userMemberships.length === 0) return null
    const active = userMemberships.find(m => m.status === 'active')
    if (active) return active
    const pending = userMemberships.find(m => m.status === 'pending')
    if (pending) return pending
    return [...userMemberships].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
  }

  const isCheckedIn = (memberId) => todayAttendance.some(a => a.user_id === memberId && !a.check_out)

  const activeCount = memberships.filter(m => m.status === 'active').length
  const expiredCount = memberships.filter(m => m.status === 'expired').length
  const pendingCount = memberships.filter(m => m.status === 'pending').length

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
          <h1 className="text-xl sm:text-2xl font-bold text-white">Powerzone Fitness - Trainer</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-gray-400 text-sm hidden sm:inline">Welcome, {user?.full_name}</span>
            <button onClick={() => router.push('/trainer')} className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm">
              Trainer View
            </button>
            <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">Member Check-in</h2>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Checked In Today</p>
            <p className="text-lg sm:text-2xl font-bold text-orange-500">{todayAttendance.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Active Members</p>
            <p className="text-lg sm:text-2xl font-bold text-green-500">{activeCount}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Expired</p>
            <p className="text-lg sm:text-2xl font-bold text-red-500">{expiredCount}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Pending</p>
            <p className="text-lg sm:text-2xl font-bold text-yellow-500">{pendingCount}</p>
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
          <h3 className="text-xl font-bold text-white mb-4">All Members ({members.length})</h3>
          
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full min-w-[750px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="p-3">Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Membership</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Expires</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const memberMembership = getBestMembership(member.id)
                  const checkedIn = isCheckedIn(member.id)
                  return (
                    <tr key={member.id} className="border-b border-gray-700 hover:bg-gray-800">
                      <td className="p-3 text-white font-bold">{member.full_name}</td>
                      <td className="p-3 text-gray-400">{member.phone || 'N/A'}</td>
                      <td className="p-3 text-white">
                        {memberMembership?.membership_plan?.name || 'None'}
                      </td>
                      <td className="p-3">
                        {memberMembership ? (
                          <span className={`px-2 py-1 rounded text-white text-xs ${
                            memberMembership.status === 'active' ? 'bg-green-500' :
                            memberMembership.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}>
                            {memberMembership.status}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">No plan</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-400 text-sm">
                        {memberMembership?.end_date || 'N/A'}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleCheckIn(member.id)}
                          disabled={checkingIn === member.id}
                          className={`px-4 py-2 rounded text-sm font-bold text-white ${
                            checkedIn
                              ? 'bg-red-500 hover:bg-red-600'
                              : 'bg-green-500 hover:bg-green-600'
                          } disabled:opacity-50`}
                        >
                          {checkingIn === member.id ? '...' : checkedIn ? 'Check-out' : 'Check-in'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {members.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-3 text-center text-gray-400">
                      No members registered yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 text-xs mt-2 text-center sm:hidden">Swipe to see more</p>
        </div>
      </div>
    </div>
  )
}