import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const MOMENT_CONFIG = {
  collapse: { icon: '💥', label: 'Collapse', color: '#A13D2B' },
  assault: { icon: '⚡', label: 'Assault', color: '#E8A33D' },
  squeeze: { icon: '🎯', label: 'Squeeze', color: '#1B5E3A' },
  boundary: { icon: '🔥', label: 'Boundary', color: '#E8A33D' }
}

function MomentLeaderboard() {
  const [moments, setMoments] = useState([])
  const [filterType, setFilterType] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const API = import.meta.env.VITE_API_URL

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterType) params.append('moment_type', filterType)

    fetch(`${API}/leaderboard/moments?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setMoments(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [filterType])

  const goToReplay = (matchId) => {
    navigate('/replay', { state: { openMatchId: matchId } })
  }

  return (
    <div className="page">
      <div className="eyebrow">Moment of the Match</div>
      <h1 className="title">Greatest Turnarounds</h1>
      <p className="subtitle">
        The most dramatic mid-innings swings across 3,500+ matches, auto-detected by tracking every shift in win probability.
      </p>

      <div className="moment-filters">
        <button
          className={`moment-filter-btn ${filterType === '' ? 'active' : ''}`}
          onClick={() => setFilterType('')}
        >
          All
        </button>
        {Object.entries(MOMENT_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            className={`moment-filter-btn ${filterType === key ? 'active' : ''}`}
            onClick={() => setFilterType(key)}
          >
            {cfg.icon} {cfg.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="panel" style={{ textAlign: 'center', color: 'rgba(242,237,225,0.5)' }}>
          Loading moments…
        </div>
      )}

      {!loading && (
        <div className="moment-list">
          {moments.map((m, i) => {
            const cfg = MOMENT_CONFIG[m.moment_type] || MOMENT_CONFIG.boundary
            return (
              <div
                key={m.match_id + i}
                className="moment-card"
                onClick={() => goToReplay(m.match_id)}
                style={{ borderLeftColor: cfg.color }}
              >
                <div className="moment-rank">#{i + 1}</div>
                <div className="moment-body">
                  <div className="moment-top-row">
                    <span className="moment-type-badge" style={{ color: cfg.color }}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="moment-swing">+{m.swing.toFixed(1)}% swing</span>
                  </div>
                  <div className="moment-teams">{m.teams[0]} vs {m.teams[1]}</div>
                  <div className="moment-detail">
                    Over {m.over}, Ball {m.ball_in_over} — probability jumped from{' '}
                    <strong>{m.before_probability}%</strong> to <strong>{m.after_probability}%</strong>
                    {m.was_wicket ? ' after a wicket.' : m.runs_this_ball >= 4 ? ` after a ${m.runs_this_ball === 6 ? 'six' : 'boundary'}.` : '.'}
                  </div>
                  {m.venue && <div className="moment-venue">📍 {m.venue}</div>}
                </div>
                <div className="moment-arrow">→</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MomentLeaderboard