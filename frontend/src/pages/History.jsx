import { useEffect, useState } from 'react'
import api from '../api/client.js'
import Navbar from '../components/Navbar.jsx'

function History() {
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null) // session detail being viewed

  useEffect(() => {
    api
      .get('/api/history/sessions')
      .then((res) => setSessions(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load history'))
  }, [])

  async function viewSession(sessionId) {
    setError('')
    try {
      const res = await api.get(`/api/history/sessions/${sessionId}`)
      setSelected(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load session')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">Session History</h1>

        {error && (
          <p className="mb-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {sessions.length === 0 && !error && (
          <p className="text-gray-500">No sessions yet. Go start an interview!</p>
        )}

        <div className="space-y-3">
          {sessions.map((s) => (
            <button
              key={s.session_id}
              onClick={() => viewSession(s.session_id)}
              className="flex w-full items-center justify-between rounded-lg bg-white p-4 text-left shadow-sm hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-gray-800">{s.topic}</p>
                <p className="text-xs text-gray-500">
                  {new Date(s.started_at).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-indigo-600">
                  {s.average_score != null ? `Avg score: ${s.average_score}/10` : 'No score yet'}
                </p>
                <p className="text-xs text-gray-500">{s.question_count} question(s) answered</p>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">{selected.topic} Transcript</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                {selected.messages.map((m, idx) => (
                  <div key={idx} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                    <p
                      className={`inline-block rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                        m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {m.role === 'bot' && m.score != null && (
                        <span className="mr-2 rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-800">
                          {m.score}/10
                        </span>
                      )}
                      {m.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default History
