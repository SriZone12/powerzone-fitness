'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminPlans() {
  const router = useRouter()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration_days: '',
    description: ''
  })

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const { data: userData } = await supabase
        .from('app_users')
        .select('role')
        .eq('id', session.user.id)
        .single()
      if (userData.role !== 'admin') {
        router.push('/login')
        return
      }
      fetchPlans()
    }
    checkAuth()
  }, [router])

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('membership_plan')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error) {
      setPlans(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const planData = {
      name: formData.name,
      price: parseFloat(formData.price),
      duration_days: parseInt(formData.duration_days),
      description: formData.description,
      is_active: true
    }

    if (editingPlan) {
      const { error } = await supabase
        .from('membership_plan')
        .update(planData)
        .eq('id', editingPlan.id)
      
      if (!error) {
        setShowModal(false)
        setEditingPlan(null)
        resetForm()
        fetchPlans()
      }
    } else {
      const { error } = await supabase
        .from('membership_plan')
        .insert([planData])
      
      if (!error) {
        setShowModal(false)
        resetForm()
        fetchPlans()
      }
    }
  }

  const handleEdit = (plan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      description: plan.description || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (planId) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      const { error } = await supabase
        .from('membership_plan')
        .delete()
        .eq('id', planId)
      
      if (!error) {
        fetchPlans()
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      duration_days: '',
      description: ''
    })
  }

  const openNewModal = () => {
    setEditingPlan(null)
    resetForm()
    setShowModal(true)
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
          <h1 className="text-xl sm:text-2xl font-bold text-white">Manage Membership Plans</h1>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-white">Membership Plans</h2>
          <button
            onClick={openNewModal}
            className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600"
          >
            + Add New Plan
          </button>
        </div>

        {/* Scrollable Table on All Devices */}
        <div className="bg-gray-900 rounded-lg overflow-hidden -mx-4 sm:mx-0">
          <div className="overflow-x-auto px-4 sm:px-0">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="p-4">Plan Name</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-gray-700 hover:bg-gray-800">
                    <td className="p-4 text-white font-bold">{plan.name}</td>
                    <td className="p-4 text-green-500">रू{plan.price}</td>
                    <td className="p-4 text-gray-400">{plan.duration_days} days</td>
                    <td className="p-4 text-gray-400">{plan.description || 'N/A'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-sm ${plan.is_active ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleEdit(plan)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-gray-400">
                      No plans created yet. Click &quot;Add New Plan&quot; to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-gray-500 text-xs mt-2 text-center sm:hidden">← Swipe to see more →</p>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingPlan ? 'Edit Plan' : 'Add New Plan'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-white mb-2">Plan Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  placeholder="e.g., Monthly Premium"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-white mb-2">Price (रू)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  placeholder="e.g., 1999"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-white mb-2">Duration (days)</label>
                <input
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({...formData, duration_days: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  placeholder="e.g., 30"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-white mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                  placeholder="What's included in this plan?"
                  rows="3"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                >
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}