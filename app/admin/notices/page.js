'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminNotices() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editNotice, setEditNotice] = useState(null)
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal', target_audience: 'all', is_active: true })
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState('all')

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
      if (userData.role !== 'admin') { router.push('/member'); return }

      setUser(session.user)
      fetchNotices()
    }
    checkAuth()
  }, [router])

  const fetchNotices = async () => {
    const { data, error } = await supabase
      .from('gym_notices')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setNotices(data)
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!form.title || !form.content) {
      alert('Please fill in title and content')
      return
    }
    setSubmitting(true)

    if (editNotice) {
      const { error } = await supabase
        .from('gym_notices')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', editNotice.id)

      if (!error) {
        alert('Notice updated!')
        setShowModal(false)
        setEditNotice(null)
        setForm({ title: '', content: '', priority: 'normal', target_audience: 'all', is_active: true })
        fetchNotices()
      } else {
        alert('Error: ' + error.message)
      }
    } else {
      const { error } = await supabase
        .from('gym_notices')
        .insert([{ ...form, created_by: user.id }])

      if (!error) {
        alert('Notice posted!')
        setShowModal(false)
        setForm({ title: '', content: '', priority: 'normal', target_audience: 'all', is_active: true })
        fetchNotices()
      } else {
        alert('Error: ' + error.message)
      }
    }

    setSubmitting(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this notice?')) return
    const { error } = await supabase.from('gym_notices').delete().eq('id', id)
    if (!error) fetchNotices()
  }

  const openEdit = (notice) => {
    setEditNotice(notice)
    setForm({
      title: notice.title,
      content: notice.content,
      priority: notice.priority,
      target_audience: notice.target_audience,
      is_active: notice.is_active
    })
    setShowModal(true)
  }

  const openNew = () => {
    setEditNotice(null)
    setForm({ title: '', content: '', priority: 'normal', target_audience: 'all', is_active: true })
    setShowModal(true)
  }

  const filtered = filter === 'all' ? notices : notices.filter(n => n.priority === filter)

  const priorityStyles = {
    low: 'border-l-gray-500 bg-gray-800',
    normal: 'border-l-blue-500 bg-gray-800',
    high: 'border-l-yellow-500 bg-yellow-900',
    urgent: 'border-l-red-500 bg-red-900'
  }

  const priorityBadge = {
    low: 'bg-gray-600',
    normal: 'bg-blue-600',
    high: 'bg-yellow-600',
    urgent: 'bg-red-600'
  }

  const audienceLabel = {
    all: 'Everyone',
    members: 'Members Only'
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
          <h1 className="text-xl sm:text-2xl font-bold text-white">Notice Board</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin')}
              className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
            >
              Back to Dashboard
            </button>
            <button
              onClick={openNew}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm"
            >
              + New Notice
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Total Notices</p>
            <p className="text-lg sm:text-2xl font-bold text-white">{notices.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Active</p>
            <p className="text-lg sm:text-2xl font-bold text-green-500">{notices.filter(n => n.is_active).length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Urgent</p>
            <p className="text-lg sm:text-2xl font-bold text-red-500">{notices.filter(n => n.priority === 'urgent').length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">This Week</p>
            <p className="text-lg sm:text-2xl font-bold text-orange-500">
              {notices.filter(n => {
                const d = new Date(n.created_at)
                const now = new Date()
                return (now - d) < 7 * 86400000
              }).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['all', 'urgent', 'high', 'normal', 'low'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded text-sm whitespace-nowrap ${filter === f ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              {f === 'all' ? `All (${notices.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${notices.filter(n => n.priority === f).length})`}
            </button>
          ))}
        </div>

        {/* Notices List */}
        {filtered.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-xl">
              {filter === 'all' ? 'No notices yet.' : `No ${filter} priority notices.`}
            </p>
            <button onClick={openNew} className="mt-4 bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600">
              Post First Notice
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(notice => (
              <div
                key={notice.id}
                className={`border-l-4 rounded-lg p-4 sm:p-6 ${priorityStyles[notice.priority]} ${!notice.is_active ? 'opacity-50' : ''}`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg sm:text-xl font-bold text-white">{notice.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs text-white ${priorityBadge[notice.priority]}`}>
                        {notice.priority}
                      </span>
                      {!notice.is_active && (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-600 text-gray-300">Inactive</span>
                      )}
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                        {audienceLabel[notice.target_audience]}
                      </span>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap">{notice.content}</p>
                    <p className="text-gray-500 text-xs mt-3">
                      Posted: {new Date(notice.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(notice)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(notice.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-white mb-4">
              {editNotice ? 'Edit Notice' : 'Post New Notice'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  placeholder="e.g. Gym Closed for Holiday"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Content *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({...form, content: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  placeholder="Write the notice content..."
                  rows={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({...form, priority: e.target.value})}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Target Audience</label>
                  <select
                    value={form.target_audience}
                    onChange={(e) => setForm({...form, target_audience: e.target.value})}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  >
                    <option value="all">Everyone</option>
                    <option value="members">Members Only</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-gray-400 text-sm">Active:</label>
                <button
                  type="button"
                  onClick={() => setForm({...form, is_active: !form.is_active})}
                  className={`w-12 h-6 rounded-full transition ${form.is_active ? 'bg-orange-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setEditNotice(null) }}
                className="flex-1 bg-gray-700 text-white py-3 rounded font-bold hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-orange-500 text-white py-3 rounded font-bold hover:bg-orange-600 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editNotice ? 'Update Notice' : 'Post Notice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}