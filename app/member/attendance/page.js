'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MemberAttendance() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [attendance, setAttendance] = useState([])
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
      if (userData.role === 'trainer') { router.push('/trainer'); return }

      setUser(session.user)
      fetchData(session.user.id)
    }
    checkAuth()
  }, [router])

  const fetchData = async (userId) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('check_in', { ascending: false })
      .limit(50)

    if (!error) setAttendance(data)
    setLoading(false)
  }

  // Calculate stats
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = new Date().toISOString().split('T')[0].substring(0, 7)
  const todayCheckins = attendance.filter(a => new Date(a.check_in).toISOString().split('T')[0] === today).length
  const monthCheckins = attendance.filter(a => new Date(a.check_in).toISOString().split('T')[0].startsWith(thisMonth)).length
  const totalCheckins = attendance.length

  // Current streak
  let streak = 0
  const todayDate = new Date()
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(todayDate)
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = checkDate.toISOString().split('T')[0]
    if (attendance.some(a => new Date(a.check_in).toISOString().split('T')[0] === dateStr)) {
      streak++
    } else {
      break
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
          <h1 className="text-xl sm:text-2xl font-bold text-white">My Attendance</h1>
          <button onClick={() => router.push('/member')} className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Today</p>
            <p className="text-lg sm:text-2xl font-bold text-orange-500">
              {todayCheckins > 0 ? '✓ Checked In' : '—'}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">This Month</p>
            <p className="text-lg sm:text-2xl font-bold text-white">{monthCheckins}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Total Check-ins</p>
            <p className="text-lg sm:text-2xl font-bold text-green-500">{totalCheckins}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Current Streak</p>
            <p className="text-lg sm:text-2xl font-bold text-yellow-500">{streak} days</p>
          </div>
        </div>

        {/* Attendance History */}
        <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-bold text-white mb-4">Attendance History</h3>
          {attendance.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-xl">No attendance records yet.</p>
              <p className="text-gray-500 text-sm mt-2">Your attendance will appear here after you check in at the gym.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attendance.map(record => (
                <div key={record.id} className="bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start gap-2">
                  <div>
                    <p className="text-white font-bold">
                      {new Date(record.check_in).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Check-in: {new Date(record.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    {record.check_out ? (
                      <>
                        <p className="text-gray-400 text-sm">
                          Check-out: {new Date(record.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-green-500 text-sm font-bold">
                          Duration: {Math.round((new Date(record.check_out) - new Date(record.check_in)) / 60000)} min
                        </p>
                      </>
                    ) : (
                      <p className="text-yellow-500 text-sm font-bold">Still at gym</p>
                    )}
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