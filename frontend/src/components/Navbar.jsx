import { Link, useNavigate } from 'react-router-dom'

function Navbar() {
  const navigate = useNavigate()
  const isLoggedIn = !!localStorage.getItem('token')

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <nav className="flex items-center justify-between bg-white shadow px-6 py-4 mb-6">
      <Link to="/topics" className="text-lg font-bold text-indigo-600">
        Interview Prep Chatbot
      </Link>
      <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
        <Link to="/topics" className="hover:text-indigo-600">Topics</Link>
        <Link to="/history" className="hover:text-indigo-600">History</Link>
        <Link to="/pricing" className="hover:text-indigo-600">Pricing</Link>
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  )
}

export default Navbar
