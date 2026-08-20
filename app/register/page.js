'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Register() {
  const router = useRouter()
  const [roleType, setRoleType] = useState(null)
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [existingMemberClaim, setExistingMemberClaim] = useState(false)

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    medicalConditions: '',
    fitnessGoals: '',
    specialization: '',
    experience: '',
    bio: ''
  })

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError) {
      setError(authError.message)
      setSubmitting(false)
      return
    }

    if (!data.user) {
      setError('Registration failed. Please try again.')
      setSubmitting(false)
      return
    }

    const roleValue = roleType === 'member' ? 'member' : 'trainer'

    const insertData = {
      id: data.user.id,
      email: form.email,
      full_name: form.fullName,
      phone: form.phone,
      role: roleValue,
      account_status: roleType === 'trainer' ? 'pending' : 'active',
      is_new_member: roleType === 'member' ? !existingMemberClaim : true,
      admission_fee_paid: false,
      existing_member_claim: roleType === 'member' ? existingMemberClaim : false,
      claim_status: roleType === 'member' && existingMemberClaim ? 'pending' : 'none',
      age: form.age ? parseInt(form.age) : null,
      gender: form.gender || null,
    }

    if (roleType === 'member') {
      insertData.height = form.height || null
      insertData.weight = form.weight || null
      insertData.address = form.address || null
      insertData.emergency_contact_name = form.emergencyContactName || null
      insertData.emergency_contact_phone = form.emergencyContactPhone || null
      insertData.medical_conditions = form.medicalConditions || null
      insertData.fitness_goals = form.fitnessGoals || null
    }

    if (roleType === 'trainer') {
      insertData.specialization = form.specialization || null
      insertData.experience = form.experience || null
      insertData.bio = form.bio || null
      insertData.address = form.address || null
    }

    const { error: dbError } = await supabase
      .from('app_users')
      .insert([insertData])

    if (dbError) {
      setError('Account created but profile save failed: ' + dbError.message)
      setSubmitting(false)
      return
    }

    setRegistered(true)
    setSubmitting(false)
  }

  const isStep1Valid = form.fullName && form.email && form.phone && form.password
  const isStep2Valid = form.age && form.gender && form.height && form.weight && form.emergencyContactName && form.emergencyContactPhone
  const isTrainerFormValid = form.fullName && form.email && form.phone && form.password && form.specialization

  if (registered && roleType === 'trainer') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-gray-900 p-6 sm:p-8 rounded-lg w-full max-w-md text-center">
          <div className="text-5xl mb-4">🏋️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Application Submitted!</h1>
          <p className="text-gray-400 mb-2">Your trainer application is <span className="text-yellow-500 font-bold">pending admin review</span>.</p>
          <p className="text-gray-500 text-sm mb-6">The gym owner will review your qualifications and activate your account. You will be able to login once approved.</p>
          <button onClick={() => router.push('/login')}
            className="w-full bg-orange-500 text-white p-3 rounded font-bold hover:bg-orange-600">
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (registered && roleType === 'member') {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-gray-900 p-6 sm:p-8 rounded-lg w-full max-w-lg">
        <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">Powerzone Fitness</h1>

        {/* Role Selection Screen */}
        {!roleType && (
          <div>
            <h2 className="text-lg text-gray-400 text-center mb-6">Join Our Fitness Community</h2>

            <button onClick={() => setRoleType('member')}
              className="w-full bg-orange-500 text-white p-4 rounded-lg font-bold hover:bg-orange-600 mb-4 text-left">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💪</span>
                <div>
                  <p className="text-lg">Continue as Member</p>
                  <p className="text-orange-200 text-sm font-normal">Join the gym and start your fitness journey</p>
                </div>
              </div>
            </button>

            <button onClick={() => setRoleType('trainer')}
              className="w-full bg-blue-600 text-white p-4 rounded-lg font-bold hover:bg-blue-700 mb-6 text-left">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏋️</span>
                <div>
                  <p className="text-lg">Continue as Trainer</p>
                  <p className="text-blue-200 text-sm font-normal">Submit your application — needs admin approval</p>
                </div>
              </div>
            </button>

            <p className="text-gray-400 text-center text-sm">
              Already have an account?{' '}
              <a href="/login" className="text-orange-500 hover:underline">Login</a>
            </p>
          </div>
        )}

        {/* MEMBER REGISTRATION (3-step wizard) */}
        {roleType === 'member' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg text-gray-400">Member Registration</h2>
              <button onClick={() => { setRoleType(null); setStep(1); setError('') }}
                className="text-gray-500 hover:text-white text-sm">← Back</button>
            </div>

            <div className="flex items-center justify-center mb-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}>1</div>
              <div className={`w-12 h-1 ${step >= 2 ? 'bg-orange-500' : 'bg-gray-700'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}>2</div>
              <div className={`w-12 h-1 ${step >= 3 ? 'bg-orange-500' : 'bg-gray-700'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 3 ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}>3</div>
            </div>

            {error && <div className="bg-red-500 text-white p-3 rounded mb-4 text-sm">{error}</div>}

            <form onSubmit={handleRegister}>
              {step === 1 && (
                <div>
                  <h3 className="text-white font-bold mb-4">Basic Information</h3>
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Full Name *</label>
                    <input type="text" value={form.fullName} onChange={(e) => updateForm('fullName', e.target.value)}
                      className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. Ram Bahadur" required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Email *</label>
                    <input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)}
                      className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. ram@gmail.com" required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Phone *</label>
                    <input type="tel" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)}
                      className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. 98XXXXXXXX" required />
                  </div>
                  <div className="mb-6">
                    <label className="block text-gray-400 text-sm mb-1">Password *</label>
                    <input type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)}
                      className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="Minimum 6 characters" required />
                  </div>
                  <button type="button" onClick={() => setStep(2)} disabled={!isStep1Valid}
                    className="w-full bg-orange-500 text-white p-3 rounded font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    Next: Physical Info
                  </button>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 className="text-white font-bold mb-4">Physical Information</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Age *</label>
                      <input type="number" value={form.age} onChange={(e) => updateForm('age', e.target.value)}
                        className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. 25" min="10" max="100" required />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Gender *</label>
                      <select value={form.gender} onChange={(e) => updateForm('gender', e.target.value)}
                        className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" required>
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Height *</label>
                      <input type="text" value={form.height} onChange={(e) => updateForm('height', e.target.value)}
                        className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. 172 cm" required />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Weight *</label>
                      <input type="text" value={form.weight} onChange={(e) => updateForm('weight', e.target.value)}
                        className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. 70 kg" required />
                    </div>
                  </div>
                  <h3 className="text-white font-bold mb-4">Emergency Contact</h3>
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Contact Name *</label>
                    <input type="text" value={form.emergencyContactName} onChange={(e) => updateForm('emergencyContactName', e.target.value)}
                      className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. Sita Bahadur" required />
                  </div>
                  <div className="mb-6">
                    <label className="block text-gray-400 text-sm mb-1">Contact Phone *</label>
                    <input type="tel" value={form.emergencyContactPhone} onChange={(e) => updateForm('emergencyContactPhone', e.target.value)}
                      className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. 98XXXXXXXX" required />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)}
                      className="flex-1 bg-gray-700 text-white p-3 rounded font-bold hover:bg-gray-600">Back</button>
                    <button type="button" onClick={() => setStep(3)} disabled={!isStep2Valid}
                      className="flex-1 bg-orange-500 text-white p-3 rounded font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed">
                      Next: Optional
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h3 className="text-white font-bold mb-4">Additional Information (Optional)</h3>
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Address</label>
                    <input type="text" value={form.address} onChange={(e) => updateForm('address', e.target.value)}
                      className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. Kathmandu, Nepal" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Medical Conditions</label>
                    <textarea value={form.medicalConditions} onChange={(e) => updateForm('medicalConditions', e.target.value)}
                      className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. Knee injury, asthma, none" rows={3} />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Fitness Goals</label>
                    <textarea value={form.fitnessGoals} onChange={(e) => updateForm('fitnessGoals', e.target.value)}
                      className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. Weight loss, muscle gain" rows={3} />
                  </div>

                  <div className="bg-blue-900 border-l-4 border-blue-500 rounded p-4 mb-6">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={existingMemberClaim}
                        onChange={(e) => setExistingMemberClaim(e.target.checked)}
                        className="mt-1 w-4 h-4"
                      />
                      <div>
                        <p className="text-white font-bold text-sm">I am already a member of Powerzone Fitness</p>
                        <p className="text-blue-300 text-xs mt-1">Check this if you have already paid admission fee and/or have an existing membership at the gym. Admin will verify and approve your claim.</p>
                      </div>
                    </label>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 mb-6">
                    <h4 className="text-white font-bold text-sm mb-2">Registration Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <p className="text-gray-400">Name: <span className="text-white">{form.fullName}</span></p>
                      <p className="text-gray-400">Phone: <span className="text-white">{form.phone}</span></p>
                      <p className="text-gray-400">Age: <span className="text-white">{form.age}</span></p>
                      <p className="text-gray-400">Gender: <span className="text-white">{form.gender}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(2)}
                      className="flex-1 bg-gray-700 text-white p-3 rounded font-bold hover:bg-gray-600">Back</button>
                    <button type="submit" disabled={submitting}
                      className="flex-1 bg-orange-500 text-white p-3 rounded font-bold hover:bg-orange-600 disabled:opacity-50">
                      {submitting ? 'Registering...' : 'Complete Registration'}
                    </button>
                  </div>
                </div>
              )}
            </form>

            <p className="text-gray-400 text-center mt-4 text-sm">
              Already have an account?{' '}
              <a href="/login" className="text-orange-500 hover:underline">Login</a>
            </p>
          </div>
        )}

        {/* TRAINER APPLICATION (single-page, job-application style) */}
        {roleType === 'trainer' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg text-gray-400">Trainer Application</h2>
              <button onClick={() => { setRoleType(null); setError('') }}
                className="text-gray-500 hover:text-white text-sm">← Back</button>
            </div>

            <div className="bg-blue-900 border-l-4 border-blue-500 rounded p-3 mb-5">
              <p className="text-blue-300 text-sm">Your application will be reviewed by the gym owner. You can login only after approval.</p>
            </div>

            {error && <div className="bg-red-500 text-white p-3 rounded mb-4 text-sm">{error}</div>}

            <form onSubmit={handleRegister}>
              <h3 className="text-white font-bold mb-3">Personal Details</h3>

              <div className="mb-3">
                <label className="block text-gray-400 text-sm mb-1">Full Name *</label>
                <input type="text" value={form.fullName} onChange={(e) => updateForm('fullName', e.target.value)}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. Ram Bahadur" required />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="ram@gmail.com" required />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Phone *</label>
                  <input type="tel" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="98XXXXXXXX" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Age</label>
                  <input type="number" value={form.age} onChange={(e) => updateForm('age', e.target.value)}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. 28" min="18" max="65" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Gender</label>
                  <select value={form.gender} onChange={(e) => updateForm('gender', e.target.value)}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-gray-400 text-sm mb-1">Password *</label>
                <input type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="Minimum 6 characters" required />
              </div>

              <div className="mb-3">
                <label className="block text-gray-400 text-sm mb-1">Address</label>
                <input type="text" value={form.address} onChange={(e) => updateForm('address', e.target.value)}
                  className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. Kathmandu, Nepal" />
              </div>

              <div className="border-t border-gray-700 mt-4 pt-4">
                <h3 className="text-white font-bold mb-3">Professional Details</h3>

                <div className="mb-3">
                  <label className="block text-gray-400 text-sm mb-1">Specialization *</label>
                  <select value={form.specialization} onChange={(e) => updateForm('specialization', e.target.value)}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" required>
                    <option value="">Select your specialization</option>
                    <option value="weight_training">Weight Training</option>
                    <option value="cardio">Cardio & Endurance</option>
                    <option value="yoga">Yoga & Flexibility</option>
                    <option value="crossfit">CrossFit</option>
                    <option value="martial_arts">Martial Arts</option>
                    <option value="zumba">Zumba & Dance Fitness</option>
                    <option value="rehabilitation">Rehabilitation & Recovery</option>
                    <option value="general">General Fitness</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-gray-400 text-sm mb-1">Years of Experience</label>
                  <input type="text" value={form.experience} onChange={(e) => updateForm('experience', e.target.value)}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700" placeholder="e.g. 3 years" />
                </div>

                <div className="mb-3">
                  <label className="block text-gray-400 text-sm mb-1">Certifications / Achievements</label>
                  <textarea value={form.fitnessGoals} onChange={(e) => updateForm('fitnessGoals', e.target.value)}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                    placeholder="e.g. ACE Certified, Nepal Bodybuilding Champion 2024" rows={2} />
                </div>

                <div className="mb-6">
                  <label className="block text-gray-400 text-sm mb-1">About Yourself</label>
                  <textarea value={form.bio} onChange={(e) => updateForm('bio', e.target.value)}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
                    placeholder="Tell us about your training philosophy and experience..." rows={3} />
                </div>
              </div>

              <button type="submit" disabled={submitting || !isTrainerFormValid}
                className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>

            <p className="text-gray-400 text-center mt-4 text-sm">
              Already have an account?{' '}
              <a href="/login" className="text-orange-500 hover:underline">Login</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
