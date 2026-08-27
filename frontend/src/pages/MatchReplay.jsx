import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useLocation } from 'react-router-dom'
function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const point = payload[0].payload

  return (
    <div style={{
      background: '#0B2E1F',
      border: '1px solid rgba(242,237,225,0.2)',
      borderRadius: '4px',
      padding: '10px 14px',
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '12px',
      color: '#F2EDE1'
    }}>
      <div style={{ color: '#E8A33D', marginBottom: '4px' }}>
        Over {point.over}, Ball {((point.ball - 1) % 6) + 1}
      </div>
      <div>Score: {point.score}/{point.wickets}</div>
      <div>Win Probability: {point.win_probability}%</div>
      {point.is_wicket && <div style={{ color: '#A13D2B' }}>🔴 Wicket fell this ball</div>}
    </div>
  )
}

function MatchReplay() {
  const [teams, setTeams] = useState([])
  const [years, setYears] = useState([])
  const [team, setTeam] = useState('')
  const [opponent, setOpponent] = useState('')
  const [year, setYear] = useState('')
  const [results, setResults] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [replayData, setReplayData] = useState(null)
  const [visiblePoints, setVisiblePoints] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loadError, setLoadError] = useState(null)

  const API = import.meta.env.VITE_API_URL
  const location = useLocation()
  useEffect(() => {
    fetch(`${API}/matches/filters`)
      .then(res => res.json())
      .then(data => {
        setTeams(data.teams || [])
        setYears(data.years || [])
      })
      .catch(err => console.error('Failed to load filters:', err))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (team) params.append('team', team)
    if (opponent) params.append('opponent', opponent)
    if (year) params.append('year', year)

    fetch(`${API}/matches/search?${params.toString()}`)
      .then(res => res.json())
      .then(data => setResults(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to search matches:', err))
  }, [team, opponent, year])
  // Auto-select a match if navigated here from the Moment Leaderboard
  useEffect(() => {
    const openMatchId = location.state?.openMatchId
    if (openMatchId) {
      selectMatch({ match_id: openMatchId, team_1: '', team_2: '' })
    }
  }, [location.state])
  const selectMatch = (match) => {
    setSelectedMatch(match)
    setReplayData(null)
    setVisiblePoints([])
    setCurrentIndex(0)
    setIsPlaying(false)
    setLoadError(null)

    fetch(`${API}/replay/${match.match_id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.timeline) {
          setReplayData(data)
        } else {
          setLoadError('Could not load this match\'s data. Please try another match.')
          console.error('Replay data missing timeline:', data)
        }
      })
      .catch(err => {
        setLoadError('Could not connect to the API. Please try again.')
        console.error('Failed to fetch replay data:', err)
      })
  }

  useEffect(() => {
    if (!isPlaying || !replayData || !replayData.timeline) return
    if (currentIndex >= replayData.timeline.length) {
      setIsPlaying(false)
      return
    }

    const timer = setTimeout(() => {
      setVisiblePoints(replayData.timeline.slice(0, currentIndex + 1))
      setCurrentIndex(currentIndex + 1)
    }, 150)

    return () => clearTimeout(timer)
  }, [isPlaying, currentIndex, replayData])

  const stepForward = () => {
    if (!replayData || !replayData.timeline || currentIndex >= replayData.timeline.length) return
    setVisiblePoints(replayData.timeline.slice(0, currentIndex + 1))
    setCurrentIndex(currentIndex + 1)
  }

  const stepBack = () => {
    if (!replayData || !replayData.timeline || currentIndex <= 0) return
    setCurrentIndex(currentIndex - 1)
    setVisiblePoints(replayData.timeline.slice(0, currentIndex - 1))
  }

  const reset = () => {
    setCurrentIndex(0)
    setVisiblePoints([])
    setIsPlaying(false)
  }

  const latest = visiblePoints[visiblePoints.length - 1]

  return (
    <div className="page">
      <div className="eyebrow">Historical Match Replay</div>
      <h1 className="title">Relive a Chase</h1>
      <p className="subtitle">
        Pick a real match and watch win probability swing ball-by-ball, exactly as it happened.
      </p>

      <div className="panel">
        <div className="filter-row">
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">Team</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={opponent} onChange={(e) => setOpponent(e.target.value)}>
            <option value="">Opponent</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">Year</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="match-results">
          {results.length === 0 && <p className="empty-note">No matches found for these filters.</p>}
          {results.map(m => (
            <div
              key={m.match_id}
              className={`match-result ${selectedMatch?.match_id === m.match_id ? 'selected' : ''}`}
              onClick={() => selectMatch(m)}
            >
              <span>{m.team_1} vs {m.team_2}</span>
              <span className="match-date">{m.date}</span>
            </div>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="shot-error" style={{ marginTop: '20px' }}>{loadError}</div>
      )}

      {selectedMatch && !replayData && !loadError && (
        <div className="panel replay-panel" style={{ textAlign: 'center', color: 'rgba(242,237,225,0.5)' }}>
          Loading match data…
        </div>
      )}

      {replayData && replayData.timeline && (
        <div className="panel replay-panel">
          <div className="replay-header">
            <div>
              <div className="result-label">{replayData.chasing_team} chasing {replayData.target}</div>
              <div className="scoreboard-number replay-score">
                {latest ? `${latest.score}/${latest.wickets}` : '0/0'}
              </div>
            </div>
            <div className="replay-prob">
              <div className="result-label">Win Probability</div>
              <div className={`scoreboard-number replay-prob-number ${latest && latest.win_probability < 40 ? 'low' : ''}`}>
                {latest ? `${latest.win_probability}%` : '—'}
              </div>
            </div>
          </div>

          {replayData.turning_point && (
            <div className="turning-point">
              <div className="turning-point-label">⚡ Turning Point</div>
              <div className="turning-point-text">
                Over {replayData.turning_point.over}, Ball {replayData.turning_point.ball_in_over} —
                win probability swung from <strong>{replayData.turning_point.before_probability}%</strong> to{' '}
                <strong>{replayData.turning_point.after_probability}%</strong>
                {replayData.turning_point.was_wicket
                  ? ' after a wicket fell.'
                  : replayData.turning_point.runs_this_ball >= 4
                    ? ` after a boundary (${replayData.turning_point.runs_this_ball} runs).`
                    : '.'}
              </div>
            </div>
          )}

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={visiblePoints}>
              <XAxis
                dataKey="ball"
                tick={{ fill: 'rgba(242,237,225,0.4)', fontSize: 11 }}
                tickFormatter={(ball) => `Ov ${Math.ceil(ball / 6)}`}
                interval={17}
              />
              <YAxis domain={[0, 100]} tick={{ fill: 'rgba(242,237,225,0.4)', fontSize: 11 }} />
              <ReferenceLine y={50} stroke="rgba(242,237,225,0.15)" />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="win_probability"
                stroke="#E8A33D"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              {replayData.turning_point &&
                replayData.timeline &&
                visiblePoints.length > replayData.turning_point.timeline_index && (
                <ReferenceLine
                  x={replayData.timeline[replayData.turning_point.timeline_index].ball}
                  stroke="#A13D2B"
                  strokeDasharray="3 3"
                />
              )}
            </LineChart>
          </ResponsiveContainer>

          <div className="replay-controls">
            <button className="control-btn" onClick={reset}>⟲ Reset</button>
            <button className="control-btn" onClick={stepBack}>← Step</button>
            <button
              className="calc-button replay-play"
              onClick={() => setIsPlaying(!isPlaying)}
              style={{ background: isPlaying ? 'var(--leather)' : 'var(--amber)' }}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button className="control-btn" onClick={stepForward}>Step →</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MatchReplay