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
            A computer vision pipeline: MediaPipe extracts 33 body keypoints from a batting photo, which are normalized and converted into joint angles to stay robust across camera angles and zoom levels. A custom PyTorch neural network then classifies the shot — drive, leg glance/flick, pull, or sweep — reaching 87% accuracy across 3,600+ labeled images.
          </p>
        </div>
      </div>

      <div className="about-section">
        <div className="about-number">04</div>
        <div>
          <h3>The Platform</h3>
          <p>
            A FastAPI backend serves both models over a REST API, connected to a React frontend for the live, interactive experience you're using now. Every prediction you see — from a win probability swing to a shot classification — happens through a real, trained model responding in real time, not a lookup table.
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
      </div>
    </div>
  )
}

export default About