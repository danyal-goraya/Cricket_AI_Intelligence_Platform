import { useState } from 'react'

function Predictor() {
  const [runsNeeded, setRunsNeeded] = useState(30)
  const [ballsRemaining, setBallsRemaining] = useState(24)
  const [wicketsInHand, setWicketsInHand] = useState(6)
  const [winProbability, setWinProbability] = useState(null)
  const [loading, setLoading] = useState(false)

  const getPrediction = async () => {
    setLoading(true)
    const currentRunRate = 6.0
    const requiredRunRate = (runsNeeded / ballsRemaining) * 6

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runs_needed: runsNeeded,
          balls_remaining: ballsRemaining,
          wickets_in_hand: wicketsInHand,
          current_run_rate: currentRunRate,
          required_run_rate: requiredRunRate
        })
      })
      const data = await response.json()
      setWinProbability(data.win_probability)
    } catch (error) {
      console.error('Error fetching prediction:', error)
      alert('Could not connect to the API. Make sure your FastAPI server is running.')
    }
    setLoading(false)
  }

  const commentary = (prob) => {
    if (prob === null) return ''
    if (prob >= 80) return 'Firmly in control of this chase.'
    if (prob >= 60) return 'Holding the upper hand.'
    if (prob >= 40) return 'This one is finely poised.'
    if (prob >= 20) return 'Facing an uphill battle.'
    return 'Needs something special here.'
  }

  return (
    <div className="page">
      <div className="eyebrow">Live Match Predictor</div>
      <h1 className="title">Predict a Chase</h1>
      <p className="subtitle">
        Enter a run-chase situation and get a live win probability from a model trained on 3,500+ international T20 matches.
      </p>

      <div className="panel">
        <div className="field">
          <div className="field-label">
            <span>Runs Needed</span>
            <span className="field-value">{runsNeeded}</span>
          </div>
          <input type="range" min="1" max="200" value={runsNeeded}
            onChange={(e) => setRunsNeeded(Number(e.target.value))} />
        </div>

        <div className="field">
          <div className="field-label">
            <span>Balls Remaining</span>
            <span className="field-value">{ballsRemaining}</span>
          </div>
          <input type="range" min="1" max="120" value={ballsRemaining}
            onChange={(e) => setBallsRemaining(Number(e.target.value))} />
        </div>

        <div className="field">
          <div className="field-label">
            <span>Wickets in Hand</span>
            <span className="field-value">{wicketsInHand}</span>
          </div>
          <input type="range" min="0" max="10" value={wicketsInHand}
            onChange={(e) => setWicketsInHand(Number(e.target.value))} />
        </div>

        <button className="calc-button" onClick={getPrediction} disabled={loading}>
          {loading ? 'Calculating…' : 'Calculate Win Probability'}
        </button>

        {winProbability !== null && (
          <div className="result">
            <div className="result-label">Win Probability</div>
            <div className={`scoreboard-number ${winProbability < 40 ? 'low' : ''}`}>
              {winProbability}%
            </div>
            <p className="commentary">{commentary(winProbability)}</p>

            <div className="pitch-bar">
              <div className="crease-line left" />
              <div className="crease-line right" />
              <div className="ball-marker" style={{ left: `${winProbability}%` }} />
            </div>
            <div className="pitch-bar-labels">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </div>

      <p className="footer-note">Powered by a gradient-boosted model trained on real ball-by-ball T20I data</p>
    </div>
  )
}

export default Predictor