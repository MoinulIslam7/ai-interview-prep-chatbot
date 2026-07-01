import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client.js'
import Navbar from '../components/Navbar.jsx'

function Chat() {
  const { topic } = useParams()
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([]) // { role: 'user' | 'bot', content, score? }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    async function startSession() {
      setError('')
      try {
        const res = await api.post('/api/chat/start', { topic })
        setSessionId(res.data.session_id)
        setMessages([{ role: 'bot', content: res.data.question }])
      } catch (err) {
        setError(err.response?.data?.detail || 'Could not start session')
      }
    }
    startSession()
  }, [topic])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || !sessionId) return

    const userText = input.trim()
    setMessages((prev) => [...prev, { role: 'user', content: userText }])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const res = await api.post('/api/chat/message', {
        session_id: sessionId,
        content: userText,
      })
      setMessages((prev) => [...prev, { role: 'bot', content: res.data.reply, score: res.data.score }])
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not reach the AI. Is Ollama running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">{topic} Interview</h1>
          <Link to="/topics" className="text-sm text-indigo-600 hover:underline">
            End session
          </Link>
        </div>

        {error && (
          <p className="mb-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto rounded-lg bg-white p-4 shadow-inner">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.role === 'bot' && msg.score != null && (
                  <div className="mb-1 inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                    Score: {msg.score}/10
                  </div>
                )}
                <p>{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <p className="text-sm italic text-gray-400">Evaluating your answer...</p>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="mt-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer..."
            disabled={loading || !sessionId}
            className="flex-1 rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={loading || !sessionId}
            className="rounded bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

export default Chat
