import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function PlayerComparison() {
  const [aliases, setAliases] = useState({})
  const [query1, setQuery1] = useState('')
  const [query2, setQuery2] = useState('')
  const [results1, setResults1] = useState([])
  const [results2, setResults2] = useState([])
  const [player1Name, setPlayer1Name] = useState(null)
  const [player2Name, setPlayer2Name] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(false)

  const API = import.meta.env.VITE_API_URL

  useEffect(() => {
    fetch(`${API}/players/aliases`).then(res => res.json()).then(setAliases).catch(() => {})
  }, [])

  const friendlyName = (name) => aliases[name]?.[0] || name

  useEffect(() => {
    if (query1.length < 2) { setResults1([]); return }
    const t = setTimeout(() => {
      fetch(`${API}/players/search?q=${encodeURIComponent(query1)}`)
        .then(res => res.json()).then(d => setResults1(Array.isArray(d) ? d : []))
    }, 300)
    return () => clearTimeout(t)
  }, [query1])

  useEffect(() => {
    if (query2.length < 2) { setResults2([]); return }
    const t = setTimeout(() => {
      fetch(`${API}/players/search?q=${encodeURIComponent(query2)}`)
        .then(res => res.json()).then(d => setResults2(Array.isArray(d) ? d : []))
    }, 300)
    return () => clearTimeout(t)
  }, [query2])

  useEffect(() => {
    if (!player1Name || !player2Name) return
    setLoading(true)
    fetch(`${API}/players/compare?player1=${encodeURIComponent(player1Name)}&player2=${encodeURIComponent(player2Name)}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setComparison(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [player1Name, player2Name])

  const p1 = comparison?.player1?.batting
  const p2 = comparison?.player2?.batting

  const phaseCompareData = (field) => {
    if (!p1 || !p2) return []
    return ['powerplay', 'middle', 'death'].map(phase => ({
      phase: phase.charAt(0).toUpperCase() + phase.slice(1),
      [friendlyName(player1Name)]: p1.phase_stats[phase]?.strike_rate ?? 0,
      [friendlyName(player2Name)]: p2.phase_stats[phase]?.strike_rate ?? 0
    }))
  }

  const StatRow = ({ label, val1, val2, higherIsBetter = true }) => {
    const v1 = typeof val1 === 'number' ? val1 : 0
    const v2 = typeof val2 === 'number' ? val2 : 0
    const p1Better = higherIsBetter ? v1 > v2 : v1 < v2
    const p2Better = higherIsBetter ? v2 > v1 : v2 < v1
    return (
      <div className="compare-stat-row">
        <span className={`compare-stat-val ${p1Better ? 'winner' : ''}`}>{val1 ?? '—'}</span>
        <span className="compare-stat-label">{label}</span>
        <span className={`compare-stat-val ${p2Better ? 'winner' : ''}`}>{val2 ?? '—'}</span>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="eyebrow">Head to Head</div>
      <h1 className="title">Player Comparison</h1>
      <p className="subtitle">
        Compare any two players side by side — including who actually performs better when the pressure is on.
      </p>

      <div className="compare-search-grid">
        <div className="panel">
          <input
            className="player-search-input"
            placeholder="Search player 1"
            value={query1}
            onChange={(e) => { setQuery1(e.target.value); setPlayer1Name(null) }}
          />
          {results1.length > 0 && (
            <div className="match-results" style={{ marginTop: '10px' }}>
              {results1.map(name => (
                <div key={name} className="match-result" onClick={() => { setPlayer1Name(name); setQuery1(friendlyName(name)); setResults1([]) }}>
                  <span>{friendlyName(name)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <input
            className="player-search-input"
            placeholder="Search player 2"
            value={query2}
            onChange={(e) => { setQuery2(e.target.value); setPlayer2Name(null) }}
          />
          {results2.length > 0 && (
            <div className="match-results" style={{ marginTop: '10px' }}>
              {results2.map(name => (
                <div key={name} className="match-result" onClick={() => { setPlayer2Name(name); setQuery2(friendlyName(name)); setResults2([]) }}>
                  <span>{friendlyName(name)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="panel replay-panel" style={{ textAlign: 'center', color: 'rgba(242,237,225,0.5)' }}>
          Loading comparison…
        </div>
      )}

      {comparison && p1 && p2 && !loading && (
        <div className="panel replay-panel">
          <div className="compare-header">
            <div className="compare-header-name">{friendlyName(player1Name)}</div>
            <div className="compare-header-vs">VS</div>
            <div className="compare-header-name">{friendlyName(player2Name)}</div>
          </div>

          <div className="compare-stats">
            <StatRow label="Runs" val1={p1.total_runs} val2={p2.total_runs} />
            <StatRow label="Average" val1={p1.average} val2={p2.average} />
            <StatRow label="Strike Rate" val1={p1.strike_rate} val2={p2.strike_rate} />
            <StatRow label="Boundary %" val1={p1.boundary_pct} val2={p2.boundary_pct} />
            <StatRow label="Dot Ball %" val1={p1.dot_pct} val2={p2.dot_pct} higherIsBetter={false} />
          </div>

          {p1.pressure && p2.pressure && (
            <>
              <div className="player-subsection-title" style={{ marginTop: '28px' }}>⚡ Clutch Factor</div>
              <p style={{ fontSize: '13px', color: 'rgba(242,237,225,0.6)', marginTop: '-4px', marginBottom: '14px' }}>
                Strike rate under pressure vs. strike rate when comfortable. 100 = no change. Above 100 = thrives under pressure.
              </p>
              <div className="compare-stats">
                <StatRow label="Clutch Rating" val1={p1.pressure.clutch_rating} val2={p2.pressure.clutch_rating} />
                <StatRow label="Pressure SR" val1={p1.pressure.pressure_strike_rate} val2={p2.pressure.pressure_strike_rate} />
                <StatRow label="Comfortable SR" val1={p1.pressure.comfortable_strike_rate} val2={p2.pressure.comfortable_strike_rate} />
              </div>
            </>
          )}

          <div className="player-subsection-title" style={{ marginTop: '28px' }}>Phase-wise Strike Rate</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={phaseCompareData()}>
              <XAxis dataKey="phase" tick={{ fill: 'rgba(242,237,225,0.5)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'rgba(242,237,225,0.4)', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0B2E1F', border: '1px solid rgba(242,237,225,0.2)' }} />
              <Bar dataKey={friendlyName(player1Name)} fill="#E8A33D" radius={[3, 3, 0, 0]} />
              <Bar dataKey={friendlyName(player2Name)} fill="#1B5E3A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default PlayerComparison