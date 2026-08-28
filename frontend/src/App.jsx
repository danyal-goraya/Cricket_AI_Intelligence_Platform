import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Predictor from './pages/Predictor'
import './App.css'
import MatchReplay from './pages/MatchReplay'
import ShotCoach from './pages/ShotCoach'
import About from './pages/About'
import PlayerAnalytics from './pages/PlayerAnalytics'
import MomentLeaderboard from './pages/MomentLeaderboard'
import RewriteHistory from './pages/RewriteHistory'
function NavBar() {
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">Cricket AI</Link>
      <div className="nav-links">
        <Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link>
        <Link to="/predictor" className={isActive('/predictor') ? 'active' : ''}>Predictor</Link>
        <Link to="/replay" className={isActive('/replay') ? 'active' : ''}>Replay</Link>
        <Link to="/shot-coach" className={isActive('/shot-coach') ? 'active' : ''}>Shot Coach</Link>
        <Link to="/about" className={isActive('/about') ? 'active' : ''}>About</Link>
        <Link to="/players" className={isActive('/players') ? 'active' : ''}>Players</Link>
        <Link to="/moments" className={isActive('/moments') ? 'active' : ''}>Moments</Link>
        <Link to="/rewrite-history" className={isActive('/rewrite-history') ? 'active' : ''}>Rewrite History</Link>
      </div>
    </nav>
  )
}

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/predictor" element={<Predictor />} />
        <Route path="/replay" element={<MatchReplay />} />
        <Route path="/shot-coach" element={<ShotCoach />} />
        <Route path="/about" element={<About />} />
        <Route path="/players" element={<PlayerAnalytics />} />
        <Route path="/moments" element={<MomentLeaderboard />} />
        <Route path="/rewrite-history" element={<RewriteHistory />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App