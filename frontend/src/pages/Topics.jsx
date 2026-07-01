import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client.js'
import Navbar from '../components/Navbar.jsx'

const TOPIC_LABELS = {
  DSA: 'Data Structures & Algorithms',
  OS: 'Operating Systems',
  DBMS: 'Database Management Systems',
  OOP: 'Object-Oriented Programming',
  CN: 'Computer Networks',
}

function Topics() {
  const [topics, setTopics] = useState([])
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get('/api/chat/topics')
      .then((res) => setTopics(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load topics'))
  }, [])

  function handleSelect(topic, locked) {
    if (locked) return
    navigate(`/chat/${topic}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="mb-2 text-2xl font-bold text-gray-800">Choose a Topic</h1>
        <p className="mb-6 text-gray-600">
          Pick a topic to start a mock interview session.
        </p>

        {error && (
          <p className="mb-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {topics.map(({ topic, locked }) => (
            <button
              key={topic}
              onClick={() => handleSelect(topic, locked)}
              disabled={locked}
              className={`rounded-lg border p-6 text-left shadow-sm transition ${
                locked
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : 'bg-white hover:border-indigo-400 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{topic}</span>
                {locked && (
                  <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                    Pro only
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm">{TOPIC_LABELS[topic]}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Topics
