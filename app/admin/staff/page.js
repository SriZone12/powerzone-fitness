'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminStaff() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

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
      fetchUsers()
    }
    checkAuth()
  }, [router])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('full_name')

    if (!error) setAllUsers(data)
    setLoading(false)
  }

  const handleRoleChange = async (userId, newRole) => {
    const { error } = await supabase
      .from('app_users')
      .update({ role: newRole })
      .eq('id', userId)

    if (!error) {
      alert('Role updated!')
      fetchUsers()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const toggleNewMember = async (userId, currentStatus) => {
    const { error } = await supabase
      .from('app_users')
      .update({ is_new_member: !currentStatus })
      .eq('id', userId)

    if (!error) {
      fetchUsers()
    }
  }

  const openProfile = (u) => {
    setSelectedUser(u)
    setShowModal(true)
  }

  const trainerList = allUsers.filter(u => u.role === 'trainer')
  const admins = allUsers.filter(u => u.role === 'admin')
  const members = allUsers.filter(u => u.role === 'member')

  const filteredUsers = filter === 'all' ? allUsers :
    filter === 'trainer' ? trainerList :
    filter === 'admin' ? admins :
    filter === 'member' ? members :
    allUsers

  const roleBadge = {
    admin: 'bg-red-600',
    trainer: 'bg-blue-600',
    member: 'bg-green-600'
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
          <h1 className="text-xl sm:text-2xl font-bold text-white">Trainer Management</h1>
          <button onClick={() => router.push('/admin')} className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Total Users</p>
            <p className="text-lg sm:text-2xl font-bold text-white">{allUsers.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Admins</p>
            <p className="text-lg sm:text-2xl font-bold text-red-500">{admins.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Trainers</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-500">{trainerList.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs sm:text-sm">Members</p>
            <p className="text-lg sm:text-2xl font-bold text-green-500">{members.length}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'all', label: 'All' },
            { key: 'admin', label: 'Admins' },
            { key: 'trainer', label: 'Trainers' },
            { key: 'member', label: 'Members' }
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded text-sm whitespace-nowrap ${filter === f.key ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
              {f.label} ({f.key === 'all' ? allUsers.length : f.key === 'admin' ? admins.length : f.key === 'trainer' ? trainerList.length : members.length})
            </button>
          ))}
        </div>

        <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className="border-b border-gray-700 hover:bg-gray-800">
                    <td className="p-3">
                      <p className="text-white font-bold">{u.full_name}</p>
                      {u.phone && <p className="text-gray-500 text-xs">{u.phone}</p>}
                    </td>
                    <td className="p-3 text-gray-400 text-sm">{u.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs text-white ${roleBadge[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {u.role === 'member' ? (
                        <button
                          onClick={() => toggleNewMember(u.id, u.is_new_member)}
                          className={`px-2 py-1 rounded text-xs font-bold text-white cursor-pointer ${
                            u.is_new_member ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                        >
                          {u.is_new_member ? 'New' : 'Existing'}
                        </button>
                      ) : (
                        <span className="text-gray-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => openProfile(u)}
                          className="bg-gray-700 text-white px-3 py-1 rounded text-xs hover:bg-gray-600">
                          View
                        </button>
                        {u.id !== user?.id && (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="bg-gray-700 text-white px-2 py-1 rounded text-xs border border-gray-600"
                          >
                            <option value="member">Member</option>
                            <option value="trainer">Trainer</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">User Profile</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-400 text-sm">Name</p>
                  <p className="text-white font-bold">{selectedUser.full_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Role</p>
                  <span className={`px-2 py-0.5 rounded text-xs text-white ${roleBadge[selectedUser.role]}`}>{selectedUser.role}</span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Phone</p>
                  <p className="text-white">{selectedUser.phone}</p>
                </div>
              </div>
              {selectedUser.age && (
                <div className="border-t border-gray-700 pt-3">
                  <h4 className="text-white font-bold mb-2">Physical Info</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-400">Age: </span><span className="text-white">{selectedUser.age}</span></div>
                    <div><span className="text-gray-400">Gender: </span><span className="text-white capitalize">{selectedUser.gender}</span></div>
                    <div><span className="text-gray-400">Height: </span><span className="text-white">{selectedUser.height}</span></div>
                    <div><span className="text-gray-400">Weight: </span><span className="text-white">{selectedUser.weight}</span></div>
                  </div>
                </div>
              )}
              {selectedUser.emergency_contact_name && (
                <div className="border-t border-gray-700 pt-3">
                  <h4 className="text-white font-bold mb-2">Emergency Contact</h4>
                  <p className="text-sm text-white">{selectedUser.emergency_contact_name} - {selectedUser.emergency_contact_phone}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-700 text-white py-3 rounded font-bold hover:bg-gray-600">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
