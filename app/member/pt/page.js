'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MemberPT() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [progress, setProgress] = useState([])
  const [dietPlan, setDietPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [progressForm, setProgressForm] = useState({
    weight: '', body_fat: '', chest: '', waist: '', hips: '', biceps: '', notes: ''
  })

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

      setUser(userData)
      fetchPTData(session.user.id)
    }
    checkAuth()
  }, [router])

  const fetchPTData = async (userId) => {
    const [subRes, schedRes, sessionsRes, progressRes, dietRes] = await Promise.all([
      supabase.from('pt_subscriptions').select('*, membership_plan:package_id(name, price, sessions_count, duration_days), trainer:trainer_id(full_name, email, phone)').eq('user_id', userId).in('status', ['active', 'pending']).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('pt_schedules').select('*').eq('member_id', userId),
      supabase.from('pt_sessions').select('*').eq('member_id', userId).gte('session_date', new Date().toISOString().split('T')[0]).order('session_date', { ascending: true }).limit(10),
      supabase.from('pt_progress').select('*').eq('user_id', userId).order('recorded_at', { ascending: false }).limit(10),
      supabase.from('pt_diet_plans').select('*').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: false }).limit(1).single()
    ])

    if (subRes.data) setSubscription(subRes.data)
    setSchedule(schedRes.data || [])
    setUpcomingSessions(sessionsRes.data || [])
    setProgress(progressRes.data || [])
    if (dietRes.data) setDietPlan(dietRes.data)
    setLoading(false)
  }

  const handleAddProgress = async () => {
    if (!user) return

    const data = {
      user_id: user.id,
      weight: progressForm.weight ? parseFloat(progressForm.weight) : null,
      body_fat: progressForm.body_fat ? parseFloat(progressForm.body_fat) : null,
      chest: progressForm.chest ? parseFloat(progressForm.chest) : null,
      waist: progressForm.waist ? parseFloat(progressForm.waist) : null,
      hips: progressForm.hips ? parseFloat(progressForm.hips) : null,
      biceps: progressForm.biceps ? parseFloat(progressForm.biceps) : null,
      notes: progressForm.notes || null
    }

    const { error } = await supabase.from('pt_progress').insert([data])

    if (!error) {
      alert('Progress saved!')
      setShowProgressModal(false)
      setProgressForm({ weight: '', body_fat: '', chest: '', waist: '', hips: '', biceps: '', notes: '' })
      fetchPTData(user.id)
    }
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-black">
        <div className="bg-gray-900 p-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Powerzone Fitness</h1>
            <button onClick={() => router.push('/member')} className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm">
              Back to Dashboard
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-4 sm:p-8">
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">No Active PT Package</h2>
            <p className="text-gray-400 mb-6">You don't have a personal training subscription yet.</p>
            <button
              onClick={() => router.push('/member/pt/buy')}
              className="bg-orange-500 text-white px-6 py-3 rounded font-bold hover:bg-orange-600"
            >
              Browse PT Packages
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-white">My Personal Training</h1>
          <div className="flex gap-2">
            <button onClick={() => router.push('/member')} className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm">
              Dashboard
            </button>
            <button onClick={() => router.push('/member/pt/buy')} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm">
              Buy More Sessions
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {/* Trainer Card */}
        <div className="bg-gradient-to-r from-orange-900 to-gray-900 rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">My Trainer: {subscription.trainer?.full_name || 'Not assigned yet'}</h2>
              {subscription.trainer?.email && (
                <p className="text-gray-400 text-sm">{subscription.trainer.email}</p>
              )}
              {subscription.trainer?.phone && (
                <p className="text-gray-400 text-sm">{subscription.trainer.phone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Package</p>
              <p className="text-white font-bold">{subscription.membership_plan?.name}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4 text-center">
            <p className="text-gray-400 text-xs sm:text-sm">Sessions Done</p>
            <p className="text-2xl font-bold text-green-500">{subscription.sessions_completed}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4 text-center">
            <p className="text-gray-400 text-xs sm:text-sm">Remaining</p>
            <p className="text-2xl font-bold text-orange-500">{subscription.sessions_remaining || (subscription.sessions_total - subscription.sessions_completed)}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 sm:p-4 text-center">
            <p className="text-gray-400 text-xs sm:text-sm">Total</p>
            <p className="text-2xl font-bold text-white">{subscription.sessions_total}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Schedule' },
            { id: 'progress', label: 'Progress' },
            { id: 'diet', label: 'Diet Plan' },
            { id: 'sessions', label: 'Sessions' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded text-sm whitespace-nowrap ${tab === t.id ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Schedule Tab */}
        {tab === 'overview' && (
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">My Schedule</h3>
            {schedule.length === 0 ? (
              <p className="text-gray-400">No schedule set yet. Your trainer will set it up.</p>
            ) : (
              <div className="space-y-3">
                {schedule.sort((a, b) => a.day_of_week - b.day_of_week).map(s => (
                  <div key={s.id} className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <p className="text-white font-bold">{dayNames[s.day_of_week]}</p>
                      <p className="text-orange-500">{s.time_slot}</p>
                    </div>
                    <span className="bg-green-500 text-white px-3 py-1 rounded text-sm">PT Session</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Progress Tab */}
        {tab === 'progress' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">My Progress</h3>
              <button
                onClick={() => setShowProgressModal(true)}
                className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600"
              >
                + Add Progress
              </button>
            </div>

            {progress.length === 0 ? (
              <div className="bg-gray-900 rounded-lg p-8 text-center">
                <p className="text-gray-400">No progress recorded yet. Start tracking your transformation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {progress.map((p) => (
                  <div key={p.id} className="bg-gray-900 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-3">
                      {new Date(p.recorded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center text-sm">
                      {p.weight && <div><p className="text-gray-400">Weight</p><p className="text-white font-bold">{p.weight} kg</p></div>}
                      {p.body_fat && <div><p className="text-gray-400">Body Fat</p><p className="text-white font-bold">{p.body_fat}%</p></div>}
                      {p.chest && <div><p className="text-gray-400">Chest</p><p className="text-white font-bold">{p.chest} in</p></div>}
                      {p.waist && <div><p className="text-gray-400">Waist</p><p className="text-white font-bold">{p.waist} in</p></div>}
                      {p.hips && <div><p className="text-gray-400">Hips</p><p className="text-white font-bold">{p.hips} in</p></div>}
                      {p.biceps && <div><p className="text-gray-400">Biceps</p><p className="text-white font-bold">{p.biceps} in</p></div>}
                    </div>
                    {p.notes && <p className="text-gray-400 text-sm mt-2">{p.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Diet Plan Tab */}
        {tab === 'diet' && (
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">My Diet Plan</h3>
            {!dietPlan ? (
              <p className="text-gray-400">No diet plan assigned yet. Your trainer will create one for you.</p>
            ) : (
              <div>
                <p className="text-orange-500 font-bold mb-2">{dietPlan.plan_name}</p>
                <div className="bg-gray-800 rounded-lg p-4 whitespace-pre-wrap text-gray-300">
                  {dietPlan.plan_text}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {tab === 'sessions' && (
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Upcoming Sessions</h3>
            {upcomingSessions.length === 0 ? (
              <p className="text-gray-400">No upcoming sessions scheduled.</p>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map(s => (
                  <div key={s.id} className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <p className="text-white font-bold">{new Date(s.session_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                      <p className="text-gray-400 text-sm capitalize">Status: {s.status}</p>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm text-white ${
                      s.status === 'completed' ? 'bg-green-500' :
                      s.status === 'missed' ? 'bg-red-500' :
                      s.status === 'cancelled' ? 'bg-gray-500' :
                      'bg-yellow-500'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">Record Progress</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Weight (kg)</label>
                <input type="number" step="0.1" value={progressForm.weight} onChange={(e) => setProgressForm({...progressForm, weight: e.target.value})} className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. 72.5" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Body Fat %</label>
                <input type="number" step="0.1" value={progressForm.body_fat} onChange={(e) => setProgressForm({...progressForm, body_fat: e.target.value})} className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. 18" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Chest (in)</label>
                  <input type="number" step="0.1" value={progressForm.chest} onChange={(e) => setProgressForm({...progressForm, chest: e.target.value})} className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. 40" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Waist (in)</label>
                  <input type="number" step="0.1" value={progressForm.waist} onChange={(e) => setProgressForm({...progressForm, waist: e.target.value})} className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. 32" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Hips (in)</label>
                  <input type="number" step="0.1" value={progressForm.hips} onChange={(e) => setProgressForm({...progressForm, hips: e.target.value})} className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. 38" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Biceps (in)</label>
                  <input type="number" step="0.1" value={progressForm.biceps} onChange={(e) => setProgressForm({...progressForm, biceps: e.target.value})} className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. 14" />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Notes</label>
                <textarea value={progressForm.notes} onChange={(e) => setProgressForm({...progressForm, notes: e.target.value})} className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="How are you feeling? Any changes?" rows={3} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowProgressModal(false)} className="flex-1 bg-gray-700 text-white py-3 rounded font-bold hover:bg-gray-600">Cancel</button>
              <button onClick={handleAddProgress} className="flex-1 bg-orange-500 text-white py-3 rounded font-bold hover:bg-orange-600">Save Progress</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}