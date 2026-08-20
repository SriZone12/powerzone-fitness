export default function Home() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4">
          Powerzone Fitness
        </h1>
        <p className="text-gray-400 text-lg sm:text-xl mb-8">
          Gym Management System
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/login"
            className="bg-orange-500 text-white px-8 py-3 rounded font-bold hover:bg-orange-600"
          >
            Login
          </a>
          <a
            href="/register"
            className="bg-gray-700 text-white px-8 py-3 rounded font-bold hover:bg-gray-600"
          >
            Register
          </a>
        </div>
      </div>
    </div>
  )
}