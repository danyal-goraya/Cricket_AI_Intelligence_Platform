from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import torch
import torch.nn as nn
import mediapipe as mp
import cv2
from fastapi import File, UploadFile
import json
import os


def calculate_angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba = a - b
    bc = c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    cosine = np.clip(cosine, -1.0, 1.0)
    return np.degrees(np.arccos(cosine))

def extract_pose_features(landmarks):
    points = {i: np.array([landmarks[i].x, landmarks[i].y]) for i in range(33)}

    hip_mid = (points[23] + points[24]) / 2
    shoulder_mid = (points[11] + points[12]) / 2
    torso_length = np.linalg.norm(shoulder_mid - hip_mid) + 1e-6

    normalized = {i: (points[i] - hip_mid) / torso_length for i in range(33)}

    norm_features = []
    for i in range(33):
        norm_features.extend(normalized[i])

    angles = [
        calculate_angle(points[11], points[13], points[15]),
        calculate_angle(points[12], points[14], points[16]),
        calculate_angle(points[23], points[25], points[27]),
        calculate_angle(points[24], points[26], points[28]),
        calculate_angle(points[11], points[23], points[25]),
        calculate_angle(points[12], points[24], points[26]),
    ]

    return norm_features + angles

class ShotClassifier(nn.Module):
    def __init__(self, input_size=132, num_classes=4):
        super(ShotClassifier, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_size, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes)
        )

    def forward(self, x):
        return self.network(x)
    
app = FastAPI(title="Cricket AI - Win Probability API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://cricket-ai-intelligence.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the trained model once, when the server starts
model = joblib.load("../models/win_probability_model.pkl")

class MatchSituation(BaseModel):
    runs_needed: int
    balls_remaining: int
    wickets_in_hand: int
    current_run_rate: float
    required_run_rate: float

@app.get("/")
def read_root():
    return {"message": "Cricket AI Win Probability API is running"}

@app.post("/predict")
def predict_win_probability(situation: MatchSituation):
    features = np.array([[
        situation.runs_needed,
        situation.balls_remaining,
        situation.wickets_in_hand,
        situation.current_run_rate,
        situation.required_run_rate
    ]])

    probability = model.predict_proba(features)[0][1]

    return {
        "win_probability": round(float(probability) * 100, 2),
        "input": situation.dict()
    }

_shot_model = None
_shot_label_encoder = None
_shot_feature_scaler = None
_pose_detector = None

def get_shot_classifier_resources():
    global _shot_model, _shot_label_encoder, _shot_feature_scaler, _pose_detector
    if _shot_model is None:
        _shot_model = ShotClassifier(input_size=72, num_classes=4)
        _shot_model.load_state_dict(torch.load("../models/shot_classifier_v2.pth", map_location="cpu"))
        _shot_model.eval()
        _shot_label_encoder = joblib.load("../models/shot_label_encoder.pkl")
        _shot_feature_scaler = joblib.load("../models/shot_feature_scaler.pkl")
        _pose_detector = mp.solutions.pose.Pose(static_image_mode=True, min_detection_confidence=0.3)
    return _shot_model, _shot_label_encoder, _shot_feature_scaler, _pose_detector
with open("../data/player_stats.json") as f:
    PLAYER_STATS = json.load(f)

with open("../data/player_index.json") as f:
    PLAYER_INDEX = json.load(f)

with open("../data/player_aliases.json") as f:
    PLAYER_ALIASES = json.load(f)

from difflib import get_close_matches

@app.get("/players/search")
def search_players(q: str = ""):
    if not q or len(q) < 2:
        return []
    q_lower = q.lower()

    exact_matches = set()
    for name in PLAYER_INDEX:
        if q_lower in name.lower():
            exact_matches.add(name)

    for official_name, aliases in PLAYER_ALIASES.items():
        for alias in aliases:
            if q_lower in alias.lower():
                exact_matches.add(official_name)

    if exact_matches:
        return sorted(exact_matches)[:15]

    # Fuzzy fallback: catches typos or close spellings, works for ALL 1,726 players
    close = get_close_matches(q, PLAYER_INDEX, n=10, cutoff=0.6)
    return close
@app.get("/players/aliases")
def get_player_aliases():
    return PLAYER_ALIASES
@app.get("/players/compare")
def compare_players(player1: str, player2: str):
    p1 = PLAYER_STATS.get(player1)
    p2 = PLAYER_STATS.get(player2)

    if p1 is None or p2 is None:
        return {"error": "One or both players not found"}

    return {
        "player1": p1,
        "player2": p2
    }
@app.get("/players/{player_name}")
def get_player_stats(player_name: str):
    stats = PLAYER_STATS.get(player_name)
    if stats is None:
        return {"error": "Player not found"}
    return stats

DATA_FOLDER = "../data/t20s_male_json"

with open("../data/match_index.json") as f:
    MATCH_INDEX = json.load(f)

@app.get("/matches/search")
def search_matches(team: str = "", opponent: str = "", year: str = ""):
    results = MATCH_INDEX

    if team:
        team_lower = team.lower()
        results = [
            m for m in results
            if team_lower in m['team_1'].lower() or team_lower in m['team_2'].lower()
        ]

    if opponent:
        opponent_lower = opponent.lower()
        results = [
            m for m in results
            if opponent_lower in m['team_1'].lower() or opponent_lower in m['team_2'].lower()
        ]

    if year:
        results = [
            m for m in results
            if m['date'] and m['date'].startswith(year)
        ]

    if not team and not opponent and not year:
        return MATCH_INDEX[:20]

    return results[:20]

@app.get("/matches/filters")
def get_filter_options():
    teams = set()
    years = set()

    for m in MATCH_INDEX:
        teams.add(m['team_1'])
        teams.add(m['team_2'])
        if m['date']:
            years.add(m['date'][:4])

    return {
        "teams": sorted(teams),
        "years": sorted(years, reverse=True)
    }
REPLAYS_FOLDER = "../data/replays"

@app.get("/replay/{match_id}")
def get_match_replay(match_id: str):
    filepath = os.path.join(REPLAYS_FOLDER, f"{match_id}.json")
    if not os.path.exists(filepath):
        return {"error": "Match not found"}
    with open(filepath) as f:
        return json.load(f)
with open("../data/moment_leaderboard.json") as f:
    MOMENT_LEADERBOARD = json.load(f)

with open("../data/venue_reports.json") as f:
    VENUE_REPORTS = json.load(f)

@app.get("/leaderboard/moments")
def get_moment_leaderboard(moment_type: str = "", team: str = ""):
    results = MOMENT_LEADERBOARD

    if moment_type:
        results = [m for m in results if m['moment_type'] == moment_type]

    if team:
        team_lower = team.lower()
        results = [
            m for m in results
            if any(team_lower in t.lower() for t in m['teams'])
        ]

    return results

@app.get("/venues/{venue_name}")
def get_venue_report(venue_name: str):
    report = VENUE_REPORTS.get(venue_name)
    if report is None:
        return {"error": "Venue not found"}
    return report
@app.post("/classify-shot")
async def classify_shot(file: UploadFile = File(...)):
    shot_model, shot_label_encoder, shot_feature_scaler, pose_detector = get_shot_classifier_resources()

    contents = await file.read()

    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return {"error": "Could not read the uploaded image. Please try a different file."}

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    result = pose_detector.process(img_rgb)

    if not result.pose_landmarks:
        return {"error": "No batting pose detected in this image. Try a clearer, full-body shot."}

    features = extract_pose_features(result.pose_landmarks.landmark)
    features_scaled = shot_feature_scaler.transform([features])
    input_tensor = torch.FloatTensor(features_scaled)

    with torch.no_grad():
        outputs = shot_model(input_tensor)
        probabilities = torch.softmax(outputs, dim=1)[0]

    predictions = []
    for i, class_name in enumerate(shot_label_encoder.classes_):
        predictions.append({
            "shot": class_name,
            "confidence": round(float(probabilities[i]) * 100, 2)
        })

    predictions.sort(key=lambda x: x['confidence'], reverse=True)

    top_confidence = predictions[0]['confidence']
    is_confident = top_confidence >= 55

    return {
        "predicted_shot": predictions[0]['shot'],
        "confidence": top_confidence,
        "is_confident": is_confident,
        "all_predictions": predictions
    }
@app.post("/simulate")
def simulate_chase(payload: dict):
    target = payload.get("target", 0)
    deliveries = payload.get("deliveries", [])
    total_balls_in_innings = 120

    current_score = 0
    wickets_fallen = 0
    balls_bowled = 0
    timeline = []

    for d in deliveries:
        if wickets_fallen >= 10:
            break

        balls_bowled += 1
        runs = d.get("runs", 0)
        is_wicket = d.get("is_wicket", False)
        current_score += runs
        if is_wicket:
            wickets_fallen += 1

        runs_needed = max(target - current_score, 0)
        balls_remaining = max(total_balls_in_innings - balls_bowled, 0)
        wickets_in_hand = 10 - wickets_fallen

        if runs_needed == 0:
            win_prob = 100.0
        elif wickets_in_hand <= 0:
            win_prob = 0.0
        else:
            balls_for_rate = max(balls_remaining, 1)
            current_run_rate = (current_score / balls_bowled) * 6 if balls_bowled > 0 else 0
            required_run_rate = (runs_needed / balls_for_rate) * 6
            features = np.array([[runs_needed, balls_for_rate, wickets_in_hand, current_run_rate, required_run_rate]])
            win_prob = round(float(model.predict_proba(features)[0][1]) * 100, 2)

        timeline.append({
            "over": ((balls_bowled - 1) // 6) + 1,
            "ball": balls_bowled,
            "score": current_score,
            "wickets": wickets_fallen,
            "runs_this_ball": runs,
            "is_wicket": is_wicket,
            "win_probability": win_prob
        })

        if runs_needed == 0:
            break

    all_out = wickets_fallen >= 10

    return {
        "timeline": timeline,
        "target": target,
        "all_out": all_out
    }
