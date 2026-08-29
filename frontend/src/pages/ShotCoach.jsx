import { useState } from 'react'

function ShotCoach() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const API = import.meta.env.VITE_API_URL

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setResult(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const analyzeShot = async () => {
    if (!selectedFile) return
    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch(`${API}/classify-shot`, {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error(error)
      setResult({ error: 'Could not connect to the API. Make sure your FastAPI server is running.' })
    }
    setLoading(false)
  }

  const shotDisplayName = (shot) => {
    const names = {
      'drive': 'Drive',
      'legglance-flick': 'Leg Glance / Flick',
      'pullshot': 'Pull Shot',
      'sweep': 'Sweep'
    }
    return names[shot] || shot
  }

  return (
    <div className="page">
      <div className="eyebrow">AI Shot Coach</div>
      <h1 className="title">Analyze a Shot</h1>
      <p className="subtitle">
        Upload a batting photo and get instant shot classification using pose estimation and a neural network trained on real match footage.
      </p>

      <div className="panel">
        <div
          className={`upload-zone ${isDragging ? 'dragging' : ''} ${previewUrl ? 'has-image' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="upload-preview" />
          ) : (
            <div className="upload-prompt">
              <div className="upload-icon">📷</div>
              <p>Drag a photo here, or click to browse</p>
              <span className="upload-hint">A clear, full-body batting shot works best</span>
            </div>
          )}
          <input
            id="file-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>

        {selectedFile && (
          <button className="calc-button" onClick={analyzeShot} disabled={loading}>
            {loading ? 'Analyzing…' : 'Analyze Shot'}
          </button>
        )}

        {result && result.error && (
          <div className="shot-error">{result.error}</div>
        )}

               {result && !result.error && (
          <div className="result">
            {result.is_likely_not_batting ? (
              <>
                <div className="result-label">Uncertain Result</div>
                <p className="commentary" style={{ marginTop: '8px' }}>
                  This doesn't look like a clear cricket batting stance — the model works best on photos where the batter is mid-shot, bat visible, full body in frame. Try uploading an actual batting photo for an accurate read.
                </p>
              </>
            ) : result.is_confident ? (
              <>
                <div className="result-label">Predicted Shot</div>
                <div className="scoreboard-number shot-result-name">
                  {shotDisplayName(result.predicted_shot)}
                </div>
                <p className="commentary">{result.confidence}% confidence</p>
              </>
            ) : (
              <>
                <div className="result-label">Best Guess (Low Confidence)</div>
                <div className="scoreboard-number shot-result-name low">
                  {shotDisplayName(result.predicted_shot)}
                </div>
                <p className="commentary">
                  The pose is a bit ambiguous — could also be {shotDisplayName(result.all_predictions[1].shot)}.
                </p>
              </>
            )}

            <div className="confidence-breakdown">
              {result.all_predictions.map((pred) => (
                <div key={pred.shot} className="confidence-row">
                  <span className="confidence-label">{shotDisplayName(pred.shot)}</span>
                  <div className="confidence-bar-track">
                    <div
                      className="confidence-bar-fill"
                      style={{ width: `${pred.confidence}%` }}
                    />
                  </div>
                  <span className="confidence-value">{pred.confidence}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="footer-note">Powered by pose estimation (MediaPipe) and a neural network trained on 3,600+ labeled batting images — 87% test accuracy</p>
    </div>
  )
}

export default ShotCoach