function About() {
  return (
    <div className="page">
      <div className="eyebrow">How It Works</div>
      <h1 className="title">Under the Hood</h1>
      <p className="subtitle">
        Cricket AI combines classic machine learning, computer vision, and full-stack engineering into one platform. Here's how each piece works.
      </p>

      <div className="about-section">
        <div className="about-number">01</div>
        <div>
          <h3>The Data</h3>
          <p>
            Built on 3,517 international T20 matches sourced from Cricsheet.org, spanning over 100 countries and 20+ years — from full international sides to associate cricket nations rarely covered by mainstream analytics tools. Every ball of every match, from over 793,000 deliveries, was processed into structured, queryable data.
          </p>
        </div>
      </div>

      <div className="about-section">
        <div className="about-number">02</div>
        <div>
          <h3>Win Probability Model</h3>
          <p>
            A gradient-boosted classifier (XGBoost) trained on 362,000+ real match situations — runs needed, balls remaining, wickets in hand, and run rates. It learned to predict chase outcomes with 92% AUC, without being told any cricket rules directly. It simply learned the patterns from history.
          </p>
        </div>
      </div>

      <div className="about-section">
        <div className="about-number">03</div>
        <div>
          <h3>AI Shot Classifier</h3>
          <p>
            A computer vision pipeline: MediaPipe extracts 33 body keypoints from a batting photo, normalized and converted into joint angles to stay robust across camera angles and zoom levels. A custom PyTorch neural network classifies the shot — drive, leg glance/flick, pull, or sweep — reaching 87% accuracy across 3,600+ labeled images.
          </p>
        </div>
      </div>

      <div className="about-section">
        <div className="about-number">04</div>
        <div>
          <h3>Player Analytics</h3>
          <p>
            Every qualifying batter and bowler — 1,700+ players — gets a full scouting report: phase-wise performance across powerplay, middle, and death overs, boundary and dot-ball risk profiles, historical matchups against specific opponents, venue performance, and recent form. All computed directly from ball-by-ball history, the same way real analysts build player profiles.
          </p>
        </div>
      </div>

      <div className="about-section">
        <div className="about-number">05</div>
        <div>
          <h3>Moment of the Match</h3>
          <p>
            No editor picked these highlights — the win probability model did. By scanning every ball of every match for the sharpest mid-innings swings, it automatically surfaces the most dramatic collapses, assaults, and squeezes in the dataset, each one auto-classified by pattern, not by hand.
          </p>
        </div>
      </div>

      <div className="about-section">
        <div className="about-number">06</div>
        <div>
          <h3>Rewrite History</h3>
          <p>
            Pick any real match, change the outcome of any ball, and watch the model recalculate everything that follows in real time. It's a live demonstration that the model isn't just a static number — it responds meaningfully to the exact kind of "what if" a fan would actually ask.
          </p>
        </div>
      </div>

      <div className="about-section">
        <div className="about-number">07</div>
        <div>
          <h3>The Platform</h3>
          <p>
            A FastAPI backend serves every model over a REST API, connected to a React frontend for the live, interactive experience you're using now. Every prediction you see — from a win probability swing to a shot classification — happens through a real, trained model responding in real time, not a lookup table.
          </p>
        </div>
      </div>

      <div className="tech-stack-row">
        <span className="tech-pill">Python</span>
        <span className="tech-pill">PyTorch</span>
        <span className="tech-pill">XGBoost</span>
        <span className="tech-pill">MediaPipe</span>
        <span className="tech-pill">FastAPI</span>
        <span className="tech-pill">React</span>
        <span className="tech-pill">Recharts</span>
      </div>
    </div>
  )
}

export default About