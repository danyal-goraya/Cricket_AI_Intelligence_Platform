import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

function PlayerAnalytics() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [aliases, setAliases] = useState({})
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [playerData, setPlayerData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('batting')

  const API = import.meta.env.VITE_API_URL

  useEffect(() => {
    fetch(`${API}/players/aliases`)
      .then(res => res.json())
      .then(setAliases)
      .catch(() => {})
  }, [])

  const friendlyName = (backendName) => {
    return aliases[backendName]?.[0] || backendName
  }

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      fetch(`${API}/players/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => setResults(Array.isArray(data) ? data : []))
        .catch(() => setResults([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const selectPlayer = (name) => {
    setSelectedPlayer(name)
    setPlayerData(null)
    setResults([])
    setQuery('')
    setLoading(true)
    setActiveTab('batting')

    fetch(`${API}/players/${encodeURIComponent(name)}`)
      .then(res => res.json())
      .then(data => {
        setPlayerData(data.error ? null : data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const phaseChartData = (phaseStats) => {
    if (!phaseStats) return []
    return [
      { phase: 'Powerplay', value: phaseStats.powerplay?.strike_rate ?? phaseStats.powerplay?.economy ?? 0 },
      { phase: 'Middle', value: phaseStats.middle?.strike_rate ?? phaseStats.middle?.economy ?? 0 },
      { phase: 'Death', value: phaseStats.death?.strike_rate ?? phaseStats.death?.economy ?? 0 }
    ]
  }

  const formChartData = (recentForm) => {
    if (!recentForm) return []
    return recentForm.map((runs, i) => ({ innings: i + 1, runs }))
  }

  const bat = playerData?.batting
  const bowl = playerData?.bowling

  return (
    <div className="page">
      <div className="eyebrow">Player Analytics</div>
      <h1 className="title">Scouting Report</h1>
      <p className="subtitle">
        Search any player from 1,700+ profiles for a deep breakdown — phase-wise form, risk profile, and head-to-head matchups.
      </p>

      <div className="panel">
        <div className="player-search-box">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a player (e.g. Virat, Babar, Rashid)"
            className="player-search-input"
          />
        </div>

        {results.length > 0 && (
          <div className="match-results" style={{ marginTop: '12px' }}>
            {results.map(name => (
              <div key={name} className="match-result" onClick={() => selectPlayer(name)}>
                <span>{friendlyName(name)}</span>
                {friendlyName(name) !== name && <span className="match-date">{name}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="panel replay-panel" style={{ textAlign: 'center', color: 'rgba(242,237,225,0.5)' }}>
          Loading scouting report…
        </div>
      )}

      {playerData && !loading && (
        <div className="panel replay-panel player-report">
          <div className="player-report-header">
            <div className="eyebrow">{selectedPlayer && friendlyName(selectedPlayer)}</div>
            {bat && bowl && <div className="player-badge">All-Rounder</div>}
          </div>

          {bat && bowl && (
            <div className="player-tabs">
              <button
                className={`player-tab ${activeTab === 'batting' ? 'active' : ''}`}
                onClick={() => setActiveTab('batting')}
              >
                Batting
              </button>
              <button
                className={`player-tab ${activeTab === 'bowling' ? 'active' : ''}`}
                onClick={() => setActiveTab('bowling')}
              >
                Bowling
              </button>
            </div>
          )}

          {(activeTab === 'batting' || !bowl) && bat && (
            <div className="player-section">
              <div className="player-stat-row">
                <div className="player-stat">
                  <div className="player-stat-value">{bat.total_runs}</div>
                  <div className="player-stat-label">Runs</div>
                </div>
                <div className="player-stat">
                  <div className="player-stat-value">{bat.average}</div>
                  <div className="player-stat-label">Average</div>
                </div>
                <div className="player-stat">
                  <div className="player-stat-value">{bat.strike_rate}</div>
                  <div className="player-stat-label">Strike Rate</div>
                </div>
              </div>

              <div className="player-subsection-title">Phase-wise Strike Rate</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={phaseChartData(bat.phase_stats)}>
                  <XAxis dataKey="phase" tick={{ fill: 'rgba(242,237,225,0.5)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(242,237,225,0.4)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#0B2E1F', border: '1px solid rgba(242,237,225,0.2)' }} />
                  <Bar dataKey="value" fill="#E8A33D" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="risk-profile">
                <div className="risk-item">
                  <div className="risk-label">Boundary %</div>
                  <div className="risk-bar-track">
                    <div className="risk-bar-fill boundary" style={{ width: `${bat.boundary_pct}%` }} />
                  </div>
                  <div className="risk-value">{bat.boundary_pct}%</div>
                </div>
                <div className="risk-item">
                  <div className="risk-label">Dot Ball %</div>
                  <div className="risk-bar-track">
                    <div className="risk-bar-fill dot" style={{ width: `${bat.dot_pct}%` }} />
                  </div>
                  <div className="risk-value">{bat.dot_pct}%</div>
                </div>
              </div>

              <div className="matchup-cards">
                <div className="matchup-card nemesis">
                  <div className="matchup-label">⚔ Nemesis</div>
                  <div className="matchup-name">{bat.nemesis || '—'}</div>
                  <div className="matchup-detail">{bat.nemesis_dismissals} dismissals</div>
                </div>
                <div className="matchup-card victim">
                  <div className="matchup-label">🎯 Favorite Victim</div>
                  <div className="matchup-name">{bat.favorite_victim || '—'}</div>
                  <div className="matchup-detail">{bat.favorite_victim_sr} SR against</div>
                </div>
              </div>

              <div className="venue-row">
                <div className="venue-item">
                  <div className="venue-label">Best Venue</div>
                  <div className="venue-name">{bat.best_venue || '—'}</div>
                </div>
                <div className="venue-item">
                  <div className="venue-label">Toughest Venue</div>
                  <div className="venue-name">{bat.worst_venue || '—'}</div>
                </div>
              </div>

              {bat.recent_form && bat.recent_form.length > 0 && (
                <>
                  <div className="player-subsection-title">Recent Form (last {bat.recent_form.length} innings)</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={formChartData(bat.recent_form)}>
                      <Line type="monotone" dataKey="runs" stroke="#E8A33D" strokeWidth={2} dot={{ r: 3, fill: '#E8A33D' }} />
                      <Tooltip contentStyle={{ background: '#0B2E1F', border: '1px solid rgba(242,237,225,0.2)' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}

          {activeTab === 'bowling' && bowl && (
            <div className="player-section">
              <div className="player-stat-row">
                <div className="player-stat">
                  <div className="player-stat-value">{bowl.total_wickets}</div>
                  <div className="player-stat-label">Wickets</div>
                </div>
                <div className="player-stat">
                  <div className="player-stat-value">{bowl.economy}</div>
                  <div className="player-stat-label">Economy</div>
                </div>
                <div className="player-stat">
                  <div className="player-stat-value">{bowl.bowling_average ?? '—'}</div>
                  <div className="player-stat-label">Average</div>
                </div>
              </div>

              <div className="player-subsection-title">Phase-wise Economy</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={phaseChartData(bowl.phase_stats)}>
                  <XAxis dataKey="phase" tick={{ fill: 'rgba(242,237,225,0.5)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(242,237,225,0.4)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#0B2E1F', border: '1px solid rgba(242,237,225,0.2)' }} />
                  <Bar dataKey="value" fill="#A13D2B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="matchup-cards">
                <div className="matchup-card victim">
                  <div className="matchup-label">🎯 Favorite Victim</div>
                  <div className="matchup-name">{bowl.favorite_victim || '—'}</div>
                  <div className="matchup-detail">{bowl.favorite_victim_dismissals} dismissals</div>
                </div>
                <div className="matchup-card nemesis">
                  <div className="matchup-label">⚔ Nemesis</div>
                  <div className="matchup-name">{bowl.nemesis || '—'}</div>
                  <div className="matchup-detail">{bowl.nemesis_sr} SR against</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PlayerAnalytics