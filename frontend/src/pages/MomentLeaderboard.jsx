import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const MOMENT_CONFIG = {
  collapse: { icon: '💥', label: 'Collapse', color: '#A13D2B', description: 'Multiple wickets fell in quick succession' },
  assault: { icon: '⚡', label: 'Assault', color: '#E8A33D', description: 'A sudden burst of boundaries shifted momentum' },
  squeeze: { icon: '🎯', label: 'Squeeze', color: '#1B5E3A', description: 'A single wicket at a critical, pressure-filled moment' },
  boundary: { icon: '🔥', label: 'Boundary', color: '#E8A33D', description: 'One big hit instantly changed the outlook' }
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
        No editor picked these. Your AI model watched 3,500+ matches ball-by-ball and found the moments where a team's fate flipped fastest — the shocks nobody saw coming.
      </p>

      <div className="moment-legend">
        {Object.entries(MOMENT_CONFIG).map(([key, cfg]) => (
          <div key={key} className="moment-legend-item">
            <span className="moment-legend-icon" style={{ color: cfg.color }}>{cfg.icon}</span>
            <div>
              <div className="moment-legend-label" style={{ color: cfg.color }}>{cfg.label}</div>
              <div className="moment-legend-desc">{cfg.description}</div>
            </div>
          </div>
        ))}
      </div>

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

           {!loading && moments.length === 0 && (
        <p className="empty-note">No moments found for this filter.</p>
      )}

      {!loading && moments.length > 0 && (
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