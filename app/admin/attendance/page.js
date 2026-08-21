'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminAttendance() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filter, setFilter] = useState('today')

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
    const [attendanceRes, membersRes] = await Promise.all([
      supabase.from('attendance').select('*, app_users:user_id(full_name, email, phone)').order('check_in', { ascending: false }).limit(100),
      supabase.from('app_users').select('id, full_name, email, phone').eq('role', 'member')
    ])

    setAttendance(attendanceRes.data || [])
    setMembers(membersRes.data || [])
    setLoading(false)
  }

  const filteredAttendance = attendance.filter(a => {
    if (filter === 'today') {
      return new Date(a.check_in).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
    }
    if (filter === 'date') {
      return new Date(a.check_in).toISOString().split('T')[0] === selectedDate
    }
    return true
  })

  // Group by date for stats
  const todayCount = attendance.filter(a => new Date(a.check_in).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]).length
  const uniqueToday = new Set(attendance.filter(a => new Date(a.check_in).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]).map(a => a.user_id)).size
  const thisWeek = attendance.filter(a => {
    const d = new Date(a.check_in)
    const now = new Date()
    return (now - d) < 7 * 86400000
  }).length

  // Attendance by date for the last 7 days
  const dailyStats = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const count = attendance.filter(a => new Date(a.check_in).toISOString().split('T')[0] === dateStr).length
    const unique = new Set(attendance.filter(a => new Date(a.check_in).toISOString().split('T')[0] === dateStr).map(a => a.user_id)).size
    return { date: dateStr, label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), total: count, unique }
  }).reverse()

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
          <h1 className="text-xl sm:text-2xl font-bold text-white">Attendance Reports</h1>
          <button onClick={() => router.push('/admin')} className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Today&apos;s Check-ins</p>
            <p className="text-lg sm:text-2xl font-bold text-orange-500">{todayCount}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Unique Today</p>
            <p className="text-lg sm:text-2xl font-bold text-white">{uniqueToday}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">This Week</p>
            <p className="text-lg sm:text-2xl font-bold text-green-500">{thisWeek}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Total Members</p>
            <p className="text-lg sm:text-2xl font-bold text-white">{members.length}</p>
          </div>
        </div>

        {/* Daily Chart (text-based) */}
        <div className="bg-gray-900 rounded-lg p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Last 7 Days</h3>
          <div className="space-y-2">
            {dailyStats.map(day => (
              <div key={day.date} className="flex items-center gap-3">
                <span className="text-gray-400 text-sm w-28">{day.label}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-orange-500 h-full rounded-full flex items-center px-2"
                    style={{ width: `${Math.max((day.unique / Math.max(...dailyStats.map(d => d.unique), 1)) * 100, 5)}%` }}
                  >
                    <span className="text-white text-xs font-bold whitespace-nowrap">{day.unique}</span>
                  </div>
                </div>
                <span className="text-gray-500 text-xs w-16 text-right">{day.total} total</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['today', 'date', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded text-sm ${filter === f ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
              {f === 'today' ? 'Today' : f === 'date' ? 'By Date' : 'All Records'}
            </button>
          ))}
          {filter === 'date' && (
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 rounded bg-gray-800 text-white border border-gray-700 text-sm" />
          )}
        </div>

        {/* Attendance List */}
        <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            Attendance Records ({filteredAttendance.length})
          </h3>
          {filteredAttendance.length === 0 ? (
            <p className="text-gray-400">No attendance records found.</p>
          ) : (
            <div className="space-y-3">
              {filteredAttendance.map(record => (
                <div key={record.id} className="bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start gap-2">
                  <div>
                    <p className="text-white font-bold">{record.app_users?.full_name || 'Unknown'}</p>
                    <p className="text-gray-400 text-sm">{record.app_users?.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-500 text-sm font-bold">
                      In: {new Date(record.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {record.check_out ? (
                      <p className="text-red-500 text-sm">
                        Out: {new Date(record.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    ) : (
                      <p className="text-yellow-500 text-sm">Still checked in</p>
                    )}
                    <p className="text-gray-500 text-xs">
                      {new Date(record.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}