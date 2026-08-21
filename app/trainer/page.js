'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TrainerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [myMembers, setMyMembers] = useState([])
  const [todaySessions, setTodaySessions] = useState([])
  const [allSessions, setAllSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('today')
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [notes, setNotes] = useState('')
  const [showDietModal, setShowDietModal] = useState(false)
  const [dietForm, setDietForm] = useState({ member_id: '', plan_name: '', plan_text: '' })
  const [notices, setNotices] = useState([])

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
      if (userData.role === 'admin') { router.push('/admin'); return }

      setUser(userData)
      fetchData(session.user.id)
    }
    checkAuth()
  }, [router])

  const fetchData = async (trainerId) => {
    const today = new Date().toISOString().split('T')[0]
    const dayOfWeek = new Date().getDay()

    const [membersRes, todayRes, allRes] = await Promise.all([
      supabase.from('pt_subscriptions').select('*, app_users:user_id(full_name, email, phone, age, gender, height, weight), membership_plan:package_id(name)').eq('trainer_id', trainerId).eq('status', 'active'),
      supabase.from('pt_sessions').select('*, app_users:member_id(full_name, email)').eq('trainer_id', trainerId).eq('session_date', today).order('created_at'),
      supabase.from('pt_sessions').select('*, app_users:member_id(full_name)').eq('trainer_id', trainerId).order('session_date', { ascending: false }).limit(20)
    ])

    // Fetch notices
    const { data: noticesData } = await supabase
      .from('gym_notices')
      .select('*')
      .eq('is_active', true)
      .in('target_audience', ['all', 'trainers'])
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(3)

    setNotices(noticesData || [])

    setMyMembers(membersRes.data || [])
    setTodaySessions(todayRes.data || [])
    setAllSessions(allRes.data || [])
    setLoading(false)
  }

  const handleMarkComplete = async (sessionId) => {
    const { error } = await supabase
      .from('pt_sessions')
      .update({ status: 'completed', trainer_notes: notes })
      .eq('id', sessionId)

    if (!error) {
      const session = allSessions.find(s => s.id === sessionId)
      if (session) {
        const { data: sub } = await supabase
          .from('pt_subscriptions')
          .select('sessions_completed, sessions_total')
          .eq('id', session.subscription_id)
          .single()

        if (sub) {
          await supabase
            .from('pt_subscriptions')
            .update({
              sessions_completed: sub.sessions_completed + 1,
              sessions_remaining: sub.sessions_total - sub.sessions_completed - 1
            })
            .eq('id', session.subscription_id)
        }
      }

      alert('Session marked as complete!')
      setShowNotesModal(false)
      setNotes('')
      fetchData(user.id)
    }
  }

  const handleMarkMissed = async (sessionId) => {
    const { error } = await supabase
      .from('pt_sessions')
      .update({ status: 'missed' })
      .eq('id', sessionId)

    if (!error) {
      fetchData(user.id)
    }
  }

  const handleAddDietPlan = async () => {
    if (!dietForm.member_id || !dietForm.plan_text) {
      alert('Please select a member and write the diet plan')
      return
    }

    await supabase.from('pt_diet_plans').update({ is_active: false }).eq('user_id', dietForm.member_id)

    const { error } = await supabase
      .from('pt_diet_plans')
      .insert([{
        user_id: dietForm.member_id,
        trainer_id: user.id,
        plan_name: dietForm.plan_name || 'Diet Plan',
        plan_text: dietForm.plan_text,
        is_active: true
      }])

    if (!error) {
      alert('Diet plan added!')
      setShowDietModal(false)
      setDietForm({ member_id: '', plan_name: '', plan_text: '' })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
          <h1 className="text-xl sm:text-2xl font-bold text-white">Trainer Dashboard</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-gray-400 text-sm hidden sm:inline">Trainer: {user?.full_name}</span>
            <button onClick={() => router.push('/staff')} className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm hidden sm:inline-block">
              Member Check-in
            </button>
            <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Welcome, {user?.full_name}</h2>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
            <p className="text-gray-400 text-xs sm:text-sm">My Members</p>
            <p className="text-lg sm:text-2xl font-bold text-white">{myMembers.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
            <p className="text-gray-400 text-xs sm:text-sm">Today&apos;s Sessions</p>
            <p className="text-lg sm:text-2xl font-bold text-orange-500">{todaySessions.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
            <p className="text-gray-400 text-xs sm:text-sm">Completed Today</p>
            <p className="text-lg sm:text-2xl font-bold text-green-500">
              {todaySessions.filter(s => s.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setShowDietModal(true)}
            className="bg-orange-500 text-white p-4 rounded-lg font-bold hover:bg-orange-600 text-left"
          >
            <p className="text-lg">Create Diet Plan</p>
            <p className="text-sm opacity-75">Assign diet plan to your members</p>
          </button>
        </div>

        {/* Notices */}
        {notices.length > 0 && (
          <div className="mb-6">
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('today')}
            className={`px-4 py-2 rounded text-sm ${tab === 'today' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Today&apos;s Sessions ({todaySessions.length})
          </button>
          <button
            onClick={() => setTab('members')}
            className={`px-4 py-2 rounded text-sm ${tab === 'members' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            My Members ({myMembers.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 rounded text-sm ${tab === 'history' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            History
          </button>
        </div>

        {/* Today's Sessions */}
        {tab === 'today' && (
          <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Today&apos;s Sessions ({new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })})
            </h3>
            {todaySessions.length === 0 ? (
              <p className="text-gray-400">No sessions scheduled for today.</p>
            ) : (
              <div className="space-y-3">
                {todaySessions.map(session => (
                  <div key={session.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div>
                        <p className="text-white font-bold text-lg">{session.app_users?.full_name}</p>
                        <p className="text-gray-400 text-sm">{session.app_users?.email}</p>
                        <p className={`text-sm mt-1 capitalize ${
                          session.status === 'completed' ? 'text-green-500' :
                          session.status === 'missed' ? 'text-red-500' :
                          'text-yellow-500'
                        }`}>
                          Status: {session.status}
                        </p>
                        {session.trainer_notes && (
                          <p className="text-gray-400 text-sm mt-1">Notes: {session.trainer_notes}</p>
                        )}
                      </div>
                      {session.status === 'upcoming' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedSession(session); setShowNotesModal(true) }}
                            className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleMarkMissed(session.id)}
                            className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600"
                          >
                            Missed
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Members */}
        {tab === 'members' && (
          <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
            <h3 className="text-xl font-bold text-white mb-4">My Members</h3>
            {myMembers.length === 0 ? (
              <p className="text-gray-400">No members assigned to you yet.</p>
            ) : (
              <div className="space-y-3">
                {myMembers.map(sub => (
                  <div key={sub.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-bold">{sub.app_users?.full_name}</p>
                        <p className="text-gray-400 text-sm">{sub.app_users?.email} | {sub.app_users?.phone}</p>
                        <div className="flex gap-4 text-xs text-gray-400 mt-1">
                          {sub.app_users?.age && <span>Age: {sub.app_users.age}</span>}
                          {sub.app_users?.gender && <span className="capitalize">{sub.app_users.gender}</span>}
                          {sub.app_users?.height && <span>Height: {sub.app_users.height}</span>}
                          {sub.app_users?.weight && <span>Weight: {sub.app_users.weight}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-500 font-bold">{sub.membership_plan?.name}</p>
                        <p className="text-white text-sm">{sub.sessions_completed}/{sub.sessions_total} sessions</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
            <h3 className="text-xl font-bold text-white mb-4">Session History</h3>
            {allSessions.length === 0 ? (
              <p className="text-gray-400">No session history yet.</p>
            ) : (
              <div className="space-y-3">
                {allSessions.map(session => (
                  <div key={session.id} className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <p className="text-white font-bold">{session.app_users?.full_name}</p>
                      <p className="text-gray-400 text-sm">{new Date(session.session_date).toLocaleDateString()}</p>
                      {session.trainer_notes && <p className="text-gray-400 text-xs mt-1">{session.trainer_notes}</p>}
                    </div>
                    <span className={`px-3 py-1 rounded text-xs text-white ${
                      session.status === 'completed' ? 'bg-green-500' :
                      session.status === 'missed' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes Modal */}
      {showNotesModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">
              Complete Session - {selectedSession.app_users?.full_name}
            </h3>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-1">Trainer Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                placeholder="e.g. Did 3 sets of squats, increased weight to 80kg..."
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowNotesModal(false); setNotes('') }} className="flex-1 bg-gray-700 text-white py-3 rounded font-bold hover:bg-gray-600">
                Cancel
              </button>
              <button onClick={() => handleMarkComplete(selectedSession.id)} className="flex-1 bg-green-500 text-white py-3 rounded font-bold hover:bg-green-600">
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diet Plan Modal */}
      {showDietModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Create Diet Plan</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Select Member *</label>
                <select
                  value={dietForm.member_id}
                  onChange={(e) => setDietForm({...dietForm, member_id: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                >
                  <option value="">Choose member...</option>
                  {myMembers.map(sub => (
                    <option key={sub.user_id} value={sub.user_id}>{sub.app_users?.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Plan Name</label>
                <input
                  type="text"
                  value={dietForm.plan_name}
                  onChange={(e) => setDietForm({...dietForm, plan_name: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  placeholder="e.g. Weight Loss Diet Plan"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Diet Plan *</label>
                <textarea
                  value={dietForm.plan_text}
                  onChange={(e) => setDietForm({...dietForm, plan_text: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  placeholder="Write the detailed diet plan here..."
                  rows={8}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDietModal(false)} className="flex-1 bg-gray-700 text-white py-3 rounded font-bold hover:bg-gray-600">
                Cancel
              </button>
              <button onClick={handleAddDietPlan} className="flex-1 bg-orange-500 text-white py-3 rounded font-bold hover:bg-orange-600">
                Save Diet Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}