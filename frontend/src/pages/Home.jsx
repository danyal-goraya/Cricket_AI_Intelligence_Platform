import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="page">
      <div className="eyebrow">Cricket Analytics Platform</div>
      <h1 className="title home-title">Cricket AI</h1>
      <p className="subtitle home-subtitle">
        A machine learning platform for cricket, built on 3,500+ international T20 matches — live win prediction, match replays, and AI-powered batting analysis.
      </p>

      <div className="feature-grid">
        <Link to="/predictor" className="feature-card">
          <div className="feature-eyebrow">Live Tool</div>
          <h3>Win Predictor</h3>
          <p>Enter any run-chase situation and get a live win probability, powered by a model trained on real match data.</p>
          <span className="feature-arrow">Try it →</span>
        </Link>

        <Link to="/replay" className="feature-card">
          <div className="feature-eyebrow">Live Tool</div>
          <h3>Match Replay</h3>
          <p>Relive real historical matches ball-by-ball, watching win probability swing exactly as it happened.</p>
          <span className="feature-arrow">Explore →</span>
        </Link>

        <Link to="/shot-coach" className="feature-card">
          <div className="feature-eyebrow">Live Tool</div>
          <h3>AI Shot Coach</h3>
          <p>Upload a batting clip and get AI-powered shot classification using pose estimation and neural networks.</p>
          <span className="feature-arrow">Explore →</span>
        </Link>
        <Link to="/players" className="feature-card">
          <div className="feature-eyebrow">Live Tool</div>
          <h3>Player Analytics</h3>
          <p>Search any of 1,700+ players for a deep scouting report — phase-wise form, risk profile, and head-to-head matchups.</p>
          <span className="feature-arrow">Explore →</span>
        </Link>
        <Link to="/rewrite-history" className="feature-card">
  <div className="feature-eyebrow">Live Tool</div>
  <h3>Rewrite History</h3>
  <p>Change any ball's outcome in a real match and watch your AI model react — see how one moment could have changed everything.</p>
  <span className="feature-arrow">Explore →</span>
</Link>
        <Link to="/moments" className="feature-card">
  <div className="feature-eyebrow">Live Tool</div>
  <h3>Moment of the Match</h3>
  <p>Browse the most dramatic mid-innings turnarounds ever recorded — auto-detected across 3,500+ matches.</p>
  <span className="feature-arrow">Explore →</span>
</Link>
<Link to="/compare" className="feature-card">
  <div className="feature-eyebrow">Live Tool</div>
  <h3>Head to Head</h3>
  <p>Compare any two players side by side — including a clutch rating showing who actually performs better under pressure.</p>
  <span className="feature-arrow">Explore →</span>
</Link>
      </div>

      <div className="stats-row">
        <div className="stat">
          <div className="stat-number">3,517</div>
          <div className="stat-label">Matches Analyzed</div>
        </div>
        <div className="stat">
          <div className="stat-number">793K</div>
          <div className="stat-label">Balls Processed</div>
        </div>
        <div className="stat">
          <div className="stat-number">92%</div>
          <div className="stat-label">Model AUC Score</div>
        </div>
      </div>
    </div>
  )
}

export default Home