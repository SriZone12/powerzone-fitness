'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MemberClasses() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [classes, setClasses] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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

      setUser(session.user)
      fetchData(session.user.id)
    }
    checkAuth()
  }, [router])

  const fetchData = async (userId) => {
    const [classesRes, bookingsRes] = await Promise.all([
      supabase.from('classes').select('*, app_users:trainer_id(full_name)').eq('is_active', true).order('day_of_week'),
      supabase.from('class_bookings').select('*').eq('user_id', userId)
    ])

    setClasses(classesRes.data || [])
    setBookings(bookingsRes.data || [])
    setLoading(false)
  }

  const isBooked = (classId) => bookings.some(b => b.class_id === classId && b.status === 'booked')

  const handleBook = async (cls) => {
    if (!user) return
    if (isBooked(cls.id)) {
      alert('You are already booked for this class!')
      return
    }
    if ((cls.current_bookings || 0) >= cls.max_capacity) {
      alert('This class is full!')
      return
    }

    const { error } = await supabase
      .from('class_bookings')
      .insert([{ class_id: cls.id, user_id: user.id }])

    if (!error) {
      alert(`Booked "${cls.name}" on ${days[cls.day_of_week]}!`)
      fetchData(user.id)
    }
  }

  const handleCancel = async (cls) => {
    if (!user) return
    const booking = bookings.find(b => b.class_id === cls.id && b.status === 'booked')
    if (!booking) return

    if (!confirm(`Cancel booking for "${cls.name}"?`)) return

    const { error } = await supabase
      .from('class_bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id)

    if (!error) fetchData(user.id)
  }

  const dayClasses = classes.filter(c => c.day_of_week === selectedDay)
  const myBookings = bookings.filter(b => b.status === 'booked')

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
          <h1 className="text-xl sm:text-2xl font-bold text-white">Classes</h1>
          <button onClick={() => router.push('/member')} className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {/* My Bookings */}
        {myBookings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">My Upcoming Classes ({myBookings.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myBookings.map(booking => {
                const cls = classes.find(c => c.id === booking.class_id)
                if (!cls) return null
                return (
                  <div key={booking.id} className="bg-green-900 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <p className="text-white font-bold">{cls.name}</p>
                      <p className="text-gray-300 text-sm">{days[cls.day_of_week]} • {cls.start_time?.substring(0, 5)} - {cls.end_time?.substring(0, 5)}</p>
                      {cls.app_users?.full_name && <p className="text-gray-400 text-xs">Trainer: {cls.app_users.full_name}</p>}
                    </div>
                    <button onClick={() => handleCancel(cls)} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                      Cancel
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Day Selector */}
        <h2 className="text-xl font-bold text-white mb-4">All Classes</h2>
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {days.map((day, i) => (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={`px-4 py-2 rounded text-sm whitespace-nowrap ${selectedDay === i ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              {day.substring(0, 3)} ({classes.filter(c => c.day_of_week === i).length})
            </button>
          ))}
        </div>

        {/* Classes for Selected Day */}
        {dayClasses.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-xl">No classes on {days[selectedDay]}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayClasses.map(cls => {
              const booked = isBooked(cls.id)
              const full = (cls.current_bookings || 0) >= cls.max_capacity
              return (
                <div key={cls.id} className="bg-gray-900 rounded-lg p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{cls.name}</h3>
                      {cls.description && <p className="text-gray-400 text-sm">{cls.description}</p>}
                      <div className="flex flex-wrap gap-3 text-sm text-gray-400 mt-2">
                        <span>⏰ {cls.start_time?.substring(0, 5)} - {cls.end_time?.substring(0, 5)}</span>
                        {cls.app_users?.full_name && <span>👤 {cls.app_users.full_name}</span>}
                        <span>👥 {cls.current_bookings || 0}/{cls.max_capacity}</span>
                        {cls.location && <span>📍 {cls.location}</span>}
                      </div>
                    </div>
                    <div>
                      {booked ? (
                        <span className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold">
                          ✓ Booked
                        </span>
                      ) : full ? (
                        <span className="bg-red-600 text-white px-4 py-2 rounded text-sm font-bold">
                          Full
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBook(cls)}
                          className="bg-orange-500 text-white px-4 py-2 rounded text-sm font-bold hover:bg-orange-600"
                        >
                          Book Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}