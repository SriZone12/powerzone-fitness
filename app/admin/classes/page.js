'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminClasses() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editClass, setEditClass] = useState(null)
  const [form, setForm] = useState({
    name: '', description: '', day_of_week: 1,
    start_time: '09:00', end_time: '10:00', max_capacity: 20, location: '', is_active: true
  })
  const [submitting, setSubmitting] = useState(false)

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

      if (userData.role !== 'admin') { router.push('/member'); return }

      setUser(session.user)
      fetchData()
    }
    checkAuth()
  }, [router])

  const fetchData = async () => {
    const { data } = await supabase.from('classes').select('*').order('day_of_week')
    setClasses(data || [])
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.start_time || !form.end_time) {
      alert('Please fill in class name and times')
      return
    }
    setSubmitting(true)

    const classData = {
      name: form.name,
      description: form.description,
      day_of_week: parseInt(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
      max_capacity: parseInt(form.max_capacity) || 20,
      location: form.location,
      is_active: form.is_active
    }

    if (editClass) {
      const { error } = await supabase
        .from('classes')
        .update(classData)
        .eq('id', editClass.id)

      if (!error) {
        alert('Class updated!')
        setShowModal(false)
        setEditClass(null)
        resetForm()
        fetchData()
      } else {
        alert('Error: ' + error.message)
      }
    } else {
      const { error } = await supabase
        .from('classes')
        .insert([classData])

      if (!error) {
        alert('Class created!')
        setShowModal(false)
        resetForm()
        fetchData()
      } else {
        alert('Error: ' + error.message)
      }
    }

    setSubmitting(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this class?')) return
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (!error) fetchData()
  }

  const openEdit = (cls) => {
    setEditClass(cls)
    setForm({
      name: cls.name,
      description: cls.description || '',
      day_of_week: cls.day_of_week,
      start_time: cls.start_time?.substring(0, 5) || '09:00',
      end_time: cls.end_time?.substring(0, 5) || '10:00',
      max_capacity: cls.max_capacity || 20,
      location: cls.location || '',
      is_active: cls.is_active
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setForm({ name: '', description: '', day_of_week: 1, start_time: '09:00', end_time: '10:00', max_capacity: 20, location: '', is_active: true })
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
          <h1 className="text-xl sm:text-2xl font-bold text-white">Manage Classes</h1>
          <div className="flex gap-2">
            <button onClick={() => router.push('/admin')} className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm">
              Back to Dashboard
            </button>
            <button onClick={() => { resetForm(); setEditClass(null); setShowModal(true) }} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm">
              + New Class
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Total Classes</p>
            <p className="text-lg sm:text-2xl font-bold text-white">{classes.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Active</p>
            <p className="text-lg sm:text-2xl font-bold text-green-500">{classes.filter(c => c.is_active).length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">This Week</p>
            <p className="text-lg sm:text-2xl font-bold text-orange-500">
              {classes.filter(c => c.day_of_week === new Date().getDay()).length}
            </p>
          </div>
        </div>

        {/* Classes by Day */}
        {[1, 2, 3, 4, 5, 6, 0].map(day => {
          const dayClasses = classes.filter(c => c.day_of_week === day)
          if (dayClasses.length === 0) return null
          return (
            <div key={day} className="mb-6">
              <h3 className="text-lg font-bold text-white mb-3">{days[day]}</h3>
              <div className="space-y-3">
                {dayClasses.map(cls => (
                  <div key={cls.id} className="bg-gray-900 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-bold text-lg">{cls.name}</h4>
                        {!cls.is_active && <span className="bg-gray-600 text-gray-300 text-xs px-2 py-0.5 rounded">Inactive</span>}
                      </div>
                      {cls.description && <p className="text-gray-400 text-sm">{cls.description}</p>}
                      <div className="flex flex-wrap gap-3 text-sm text-gray-400 mt-1">
                        <span>&#9201; {cls.start_time?.substring(0, 5)} - {cls.end_time?.substring(0, 5)}</span>
                        <span>&#128101; {cls.current_bookings || 0}/{cls.max_capacity}</span>
                        {cls.location && <span>📍 {cls.location}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(cls)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(cls.id)} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {classes.length === 0 && (
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-xl">No classes created yet.</p>
            <button onClick={() => setShowModal(true)} className="mt-4 bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600">
              Create First Class
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              {editClass ? 'Edit Class' : 'Create New Class'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Class Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. Morning Yoga" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" rows={2} placeholder="Describe the class..." />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Day of Week *</label>
                <select value={form.day_of_week} onChange={(e) => setForm({...form, day_of_week: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700">
                  {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Start Time *</label>
                  <input type="time" value={form.start_time} onChange={(e) => setForm({...form, start_time: e.target.value})}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">End Time *</label>
                  <input type="time" value={form.end_time} onChange={(e) => setForm({...form, end_time: e.target.value})}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Max Capacity</label>
                  <input type="number" value={form.max_capacity} onChange={(e) => setForm({...form, max_capacity: e.target.value})}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" min={1} />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Location</label>
                  <input type="text" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. Studio A" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-gray-400 text-sm">Active:</label>
                <button type="button" onClick={() => setForm({...form, is_active: !form.is_active})}
                  className={`w-12 h-6 rounded-full transition ${form.is_active ? 'bg-orange-500' : 'bg-gray-600'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setEditClass(null) }} className="flex-1 bg-gray-700 text-white py-3 rounded font-bold hover:bg-gray-600">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 bg-orange-500 text-white py-3 rounded font-bold hover:bg-orange-600 disabled:opacity-50">
                {submitting ? 'Saving...' : editClass ? 'Update Class' : 'Create Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}