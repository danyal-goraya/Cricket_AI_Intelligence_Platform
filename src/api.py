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

shot_model = ShotClassifier(input_size=72, num_classes=4)
shot_model.load_state_dict(torch.load("../models/shot_classifier_v2.pth", map_location="cpu"))
shot_model.eval()

shot_label_encoder = joblib.load("../models/shot_label_encoder.pkl")
shot_feature_scaler = joblib.load("../models/shot_feature_scaler.pkl")

mp_pose = mp.solutions.pose
pose_detector = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.3)

import json
import os

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
with open("../data/precomputed_replays.json") as f:
    PRECOMPUTED_REPLAYS = json.load(f)

@app.get("/replay/{match_id}")
def get_match_replay(match_id: str):
    replay = PRECOMPUTED_REPLAYS.get(match_id)
    if replay is None:
        return {"error": "Match not found"}
    return replay
@app.post("/classify-shot")
async def classify_shot(file: UploadFile = File(...)):
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