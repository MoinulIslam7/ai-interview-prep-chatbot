import Navbar from '../components/Navbar.jsx'

// Display-only pricing page. No payment integration - just shows
// the difference between the Free and Pro tiers.
function Pricing() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="mb-2 text-2xl font-bold text-gray-800">Pricing</h1>
        <p className="mb-8 text-gray-600">Choose the plan that fits your prep needs.</p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Free tier */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">Free</h2>
            <p className="mb-4 text-3xl font-extrabold text-gray-900">$0</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✔ Access to 3 topics (DSA, OOP, CN)</li>
              <li>✔ AI-evaluated answers with score & feedback</li>
              <li>✔ Session history</li>
              <li className="text-gray-400">✘ OS & DBMS topics</li>
            </ul>
          </div>

          {/* Pro tier */}
          <div className="rounded-lg border-2 border-indigo-500 bg-white p-6 shadow-md">
            <h2 className="text-lg font-bold text-indigo-600">Pro</h2>
            <p className="mb-4 text-3xl font-extrabold text-gray-900">$9<span className="text-base font-medium text-gray-500">/mo</span></p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✔ Access to all 5 topics</li>
              <li>✔ AI-evaluated answers with score & feedback</li>
              <li>✔ Full session history</li>
              <li>✔ Priority support</li>
            </ul>
            <button
              disabled
              className="mt-6 w-full cursor-not-allowed rounded bg-indigo-300 py-2 font-medium text-white"
              title="Payments are not implemented in this demo"
            >
              Upgrade (coming soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Pricing
