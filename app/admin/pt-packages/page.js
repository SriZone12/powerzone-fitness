'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function PTPackages() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    sessions_count: '',
    price: '',
    duration_days: ''
  })

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: userData } = await supabase
        .from('app_users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (userData.role !== 'admin') { router.push('/login'); return }

      setUser(session.user)
      fetchPackages()
    }
    checkAuth()
  }, [router])

  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('pt_packages')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setPackages(data)
    setLoading(false)
  }

  const openCreateModal = () => {
    setEditingPackage(null)
    setForm({ name: '', description: '', sessions_count: '', price: '', duration_days: '' })
    setShowModal(true)
  }

  const openEditModal = (pkg) => {
    setEditingPackage(pkg)
    setForm({
      name: pkg.name,
      description: pkg.description || '',
      sessions_count: pkg.sessions_count.toString(),
      price: pkg.price.toString(),
      duration_days: pkg.duration_days ? pkg.duration_days.toString() : ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.sessions_count || !form.price) {
      alert('Please fill in name, sessions, and price')
      return
    }

    setSubmitting(true)

    const packageData = {
      name: form.name,
      description: form.description,
      sessions_count: parseInt(form.sessions_count),
      price: parseFloat(form.price),
      duration_days: form.duration_days ? parseInt(form.duration_days) : null
    }

    if (editingPackage) {
      const { error } = await supabase
        .from('pt_packages')
        .update(packageData)
        .eq('id', editingPackage.id)

      if (error) {
        alert('Error: ' + error.message)
      } else {
        alert('Package updated!')
        setShowModal(false)
        fetchPackages()
      }
    } else {
      const { error } = await supabase
        .from('pt_packages')
        .insert([packageData])

      if (error) {
        alert('Error: ' + error.message)
      } else {
        alert('Package created!')
        setShowModal(false)
        fetchPackages()
      }
    }

    setSubmitting(false)
  }

  const handleToggleActive = async (id, currentStatus) => {
    const { error } = await supabase
      .from('pt_packages')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (!error) fetchPackages()
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this package?')) return

    const { error } = await supabase
      .from('pt_packages')
      .delete()
      .eq('id', id)

    if (!error) {
      alert('Package deleted!')
      fetchPackages()
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
          <h1 className="text-xl sm:text-2xl font-bold text-white">PT Packages</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin')}
              className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
            >
              Back to Admin
            </button>
            <button
              onClick={openCreateModal}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm"
            >
              + New Package
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Manage PT Packages</h2>

        {packages.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-xl mb-4">No PT packages yet</p>
            <button
              onClick={openCreateModal}
              className="bg-orange-500 text-white px-6 py-3 rounded font-bold hover:bg-orange-600"
            >
              Create First Package
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {packages.map((pkg) => (
              <div key={pkg.id} className={`bg-gray-900 rounded-lg p-6 ${!pkg.is_active ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${pkg.is_active ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'}`}>
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {pkg.description && (
                  <p className="text-gray-400 text-sm mb-4">{pkg.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sessions</span>
                    <span className="text-white font-bold">{pkg.sessions_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price</span>
                    <span className="text-orange-500 font-bold text-lg">रू{pkg.price}</span>
                  </div>
                  {pkg.duration_days && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Valid For</span>
                      <span className="text-white">{pkg.duration_days} days</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Per Session</span>
                    <span className="text-white">रू{Math.round(pkg.price / pkg.sessions_count)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(pkg)}
                    className="flex-1 bg-blue-500 text-white py-2 rounded text-sm hover:bg-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(pkg.id, pkg.is_active)}
                    className={`flex-1 py-2 rounded text-sm ${pkg.is_active ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-green-500 text-white hover:bg-green-600'}`}
                  >
                    {pkg.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    className="bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingPackage ? 'Edit Package' : 'Create New Package'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Package Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  placeholder="e.g. 12 Sessions with Trainer"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  placeholder="What's included in this package?"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Number of Sessions *</label>
                  <input
                    type="number"
                    value={form.sessions_count}
                    onChange={(e) => setForm({...form, sessions_count: e.target.value})}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                    placeholder="e.g. 12"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Price (रू) *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({...form, price: e.target.value})}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                    placeholder="e.g. 5000"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Valid For (days)</label>
                <input
                  type="number"
                  value={form.duration_days}
                  onChange={(e) => setForm({...form, duration_days: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  placeholder="e.g. 30 (leave blank for no expiry)"
                  min="1"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-700 text-white py-3 rounded font-bold hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={submitting}
                className="flex-1 bg-orange-500 text-white py-3 rounded font-bold hover:bg-orange-600 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingPackage ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}