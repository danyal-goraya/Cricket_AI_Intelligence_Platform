import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const OUTCOME_OPTIONS = [
  { label: '0', runs: 0, is_wicket: false },
  { label: '1', runs: 1, is_wicket: false },
  { label: '2', runs: 2, is_wicket: false },
  { label: '3', runs: 3, is_wicket: false },
  { label: '4', runs: 4, is_wicket: false },
  { label: '6', runs: 6, is_wicket: false },
  { label: 'W', runs: 0, is_wicket: true }
]

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const real = payload.find(p => p.dataKey === 'real_probability')
  const edited = payload.find(p => p.dataKey === 'edited_probability')
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
      <div style={{ color: '#E8A33D', marginBottom: '4px' }}>Ball {point.ball}</div>
      {real && <div>Real history: {real.value}%</div>}
      {edited && <div style={{ color: '#E8A33D' }}>Your version: {edited.value}%</div>}
    </div>
  )
}

function RewriteHistory() {
  const [teams, setTeams] = useState([])
  const [years, setYears] = useState([])
  const [team, setTeam] = useState('')
  const [opponent, setOpponent] = useState('')
  const [year, setYear] = useState('')
  const [results, setResults] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [originalReplay, setOriginalReplay] = useState(null)
  const [edits, setEdits] = useState({})
  const [editedTimeline, setEditedTimeline] = useState(null)
  const [loading, setLoading] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [editingBall, setEditingBall] = useState(null)

  const API = import.meta.env.VITE_API_URL

  useEffect(() => {
    fetch(`${API}/matches/filters`)
      .then(res => res.json())
      .then(data => {
        setTeams(data.teams || [])
        setYears(data.years || [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (team) params.append('team', team)
    if (opponent) params.append('opponent', opponent)
    if (year) params.append('year', year)

    fetch(`${API}/matches/search?${params.toString()}`)
      .then(res => res.json())
      .then(data => setResults(Array.isArray(data) ? data : []))
      .catch(() => setResults([]))
  }, [team, opponent, year])

  const selectMatch = (match) => {
    setSelectedMatch(match)
    setOriginalReplay(null)
    setEditedTimeline(null)
    setEdits({})
    setLoading(true)

    fetch(`${API}/replay/${match.match_id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.timeline) {
          setOriginalReplay(data)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const applyEdit = (ballNumber, outcome) => {
    const newEdits = { ...edits, [ballNumber]: outcome }
    setEdits(newEdits)
    setEditingBall(null)
    runSimulation(newEdits)
  }

  const clearEdits = () => {
    setEdits({})
    setEditedTimeline(null)
  }

  const runSimulation = (currentEdits) => {
    if (!originalReplay) return
    setSimulating(true)

    const deliveries = originalReplay.timeline.map(b => {
      const edit = currentEdits[b.ball]
      if (edit) {
        return { runs: edit.runs, is_wicket: edit.is_wicket }
      }
      return { runs: b.runs_this_ball, is_wicket: b.is_wicket }
    })

    fetch(`${API}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: originalReplay.target, deliveries })
    })
      .then(res => res.json())
      .then(data => {
        setEditedTimeline(data)
        setSimulating(false)
      })
      .catch(() => setSimulating(false))
  }

  const chartData = originalReplay?.timeline.map((b, i) => ({
    ball: b.ball,
    real_probability: b.win_probability,
    edited_probability: editedTimeline?.timeline[i]?.win_probability ?? null
  })) || []

  const hasEdits = Object.keys(edits).length > 0
  const latestEdited = editedTimeline?.timeline[editedTimeline.timeline.length - 1]
  const latestReal = originalReplay?.timeline[originalReplay.timeline.length - 1]

  return (
    <div className="page">
      <div className="eyebrow">Rewrite History</div>
      <h1 className="title">What If?</h1>
      <p className="subtitle">
        Pick a real match, change any ball's outcome, and watch your AI model react — see exactly how one moment could have changed everything.
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

      {loading && (
        <div className="panel replay-panel" style={{ textAlign: 'center', color: 'rgba(242,237,225,0.5)' }}>
          Loading match…
        </div>
      )}

      {originalReplay && !loading && (
        <div className="panel replay-panel">
          <div className="replay-header">
            <div>
              <div className="result-label">{originalReplay.chasing_team} chasing {originalReplay.target}</div>
              <div className="scoreboard-number replay-score">
                {latestEdited ? `${latestEdited.score}/${latestEdited.wickets}` : `${latestReal.score}/${latestReal.wickets}`}
              </div>
            </div>
            <div className="replay-prob">
              <div className="result-label">{hasEdits ? 'Your Win Probability' : 'Win Probability'}</div>
              <div className={`scoreboard-number replay-prob-number ${(latestEdited?.win_probability ?? latestReal.win_probability) < 40 ? 'low' : ''}`}>
                {latestEdited ? `${latestEdited.win_probability}%` : `${latestReal.win_probability}%`}
              </div>
            </div>
          </div>

          {hasEdits && editedTimeline?.all_out && (
            <div className="shot-error">Your version: the team was bowled out before finishing the chase.</div>
          )}

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
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
                dataKey="real_probability"
                stroke="rgba(242,237,225,0.3)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
              />
              {hasEdits && (
                <Line
                  type="monotone"
                  dataKey="edited_probability"
                  stroke="#E8A33D"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>

          <div className="chart-legend">
            <span><span className="legend-swatch real"></span> Real history</span>
            {hasEdits && <span><span className="legend-swatch edited"></span> Your version</span>}
          </div>

          {hasEdits && (
            <button className="control-btn" style={{ width: '100%', marginTop: '12px' }} onClick={clearEdits}>
              ⟲ Reset to Real History
            </button>
          )}

          <div className="player-subsection-title" style={{ marginTop: '28px' }}>
            Tap any ball to change its outcome {simulating && '(recalculating…)'}
          </div>

          <div className="ball-list">
            {originalReplay.timeline.map((b) => {
              const edited = edits[b.ball]
              return (
                <div key={b.ball} className="ball-item-wrapper">
                  <button
                    className={`ball-item ${edited ? 'edited' : ''} ${b.is_wicket ? 'wicket' : ''}`}
                    onClick={() => setEditingBall(editingBall === b.ball ? null : b.ball)}
                  >
                    <span className="ball-item-num">{b.ball}</span>
                    <span className="ball-item-outcome">
                      {edited ? (edited.is_wicket ? 'W' : edited.runs) : (b.is_wicket ? 'W' : b.runs_this_ball)}
                    </span>
                  </button>

                  {editingBall === b.ball && (
                    <div className="ball-edit-popup">
                      {OUTCOME_OPTIONS.map(opt => (
                        <button
                          key={opt.label}
                          className="ball-edit-option"
                          onClick={() => applyEdit(b.ball, opt)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default RewriteHistory