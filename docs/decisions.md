Chose venue-based features over direct pitch data since no reliable pitch dataset exists — documented tradeoff.
Cricsheet data has inconsistent fields across matches (e.g., city not always present); handled with safe key access instead of assuming a fixed schema.
Shot classifier achieves 81% test accuracy across 4 classes (baseline: 25%). Confusion primarily occurs between drive and legglance-flick (both front-foot shots with similar bat-extension motion), while sweep is most distinguishable (90% precision) due to its distinct kneeling posture. This suggests static pose keypoints capture gross body position well but have limited resolution for fine-grained wrist/bat-angle differences — a natural motivation for the video/LSTm upgrade path discussed as future work.
Upgraded shot classifier from raw pose coordinates (81% accuracy) to normalized, angle-based features (87% accuracy) after observing real-world misclassifications caused by camera zoom/position sensitivity. Fix: centered poses on hip midpoint, scaled by torso length, added 6 joint angles (elbow, knee, hip), and applied StandardScaler before training. This is a textbook example of addressing domain shift between test-set and real-world performance
# Technical Decisions Log

A record of the real engineering decisions, tradeoffs, and fixes made throughout this project — not just what was built, but why.

## Data Pipeline

**Data source:** Cricsheet.org, chosen over building a custom scraper. It provides clean, structured ball-by-ball data for 3,517 international T20 matches spanning 100+ countries and 20+ years, eliminating a major data-collection bottleneck and letting effort go into modeling instead of scraping.

**Schema inconsistency handling:** Cricsheet data has inconsistent fields across matches (e.g., `city` not always present). Handled with safe key access (`.get()` with defaults) instead of assuming a fixed schema — a normal characteristic of real-world data, not a sign of a broken pipeline.

**Legal-ball vs delivery-count bug:** Early win-probability calculations incorrectly treated every delivery (including wides/no-balls) as one of 120 legal balls, causing win probability to incorrectly snap to 0% near the end of some innings. Fixed by deriving match-end state (`runs_needed == 0` → 100%, `wickets_in_hand <= 0` → 0%) directly from game state rather than a hardcoded ball-count threshold.

## Win Probability Model

**Model choice:** XGBoost over more complex alternatives, trained on 362,000+ real ball-by-ball chase situations (runs needed, balls remaining, wickets in hand, current/required run rate). Achieved 83% accuracy and 0.92 AUC on held-out test data — validated further with manual sanity checks (e.g., a near-impossible chase correctly returned single-digit win probability).

**Feature scope:** Deliberately excluded weather and true pitch-condition data, since neither exists in Cricsheet. Venue was used as an implicit proxy for pitch behavior instead — the same technique real cricket analytics companies use without physical pitch sensors.

## Computer Vision — Shot Classifier

**Dataset choice:** Used a pre-labeled Kaggle image dataset (drive, leg-glance/flick, pullshot, sweep — ~4,700 images) instead of self-collecting and hand-labeling. This was a deliberate scoping decision: labeling data is low-learning-value grunt work, whereas building the actual pose-estimation and neural network pipeline is the point of the exercise.

**Pose extraction:** MediaPipe Pose, using `min_detection_confidence=0.3` after discovering the default threshold silently rejected ~22% of real, valid batting images (unusual angles, low resolution, motion blur) — a normal characteristic of real-world sports photography, not a data quality failure.

**v1 → v2 model upgrade (raw coordinates → normalized joint angles):** The first model (raw x/y/z landmark coordinates, 81% test accuracy) performed noticeably worse on real uploaded photos than on the test set — a classic domain-shift problem, since raw coordinates are sensitive to camera zoom and framing. Fixed by re-engineering features: centering each pose on the hip midpoint, scaling by torso length, and adding 6 joint angles (elbow, knee, hip) — all scaled via `StandardScaler` before training. This raised test accuracy to 87% and produced visibly more reliable real-world predictions, at the cost of retraining and rebuilding the inference pipeline to match exactly.

**Confusion pattern:** Drive and leg-glance/flick are the most commonly confused pair (both front-foot, similar bat-extension motion), while sweep is the most reliably distinguished (90%+ precision) due to its distinct kneeling posture. This is an honest, expected limitation of a static-pose-only approach — resolving finer wrist/bat-angle differences would likely require video + sequence modeling (LSTM), noted as a natural extension.

**Closed-set classifier limitation:** The model has no "not a valid batting shot" category — it is mathematically forced to output a prediction across its 4 known classes regardless of input, meaning non-cricket photos still receive a confident-sounding label. Mitigated (not solved) by flagging low-confidence predictions (`< 35%`) as likely non-batting photos in the UI, rather than presenting every prediction as equally trustworthy. A true fix would require a 5th "not a valid shot" training class or a separate binary pre-filter model.

## Deployment

**Backend/frontend split:** FastAPI (Render, free tier) + React (Vercel, free tier), chosen over adding a separate Laravel backend once it became clear one Python service could handle both data and ML serving — simpler to deploy and maintain on free infrastructure, without losing demonstrated full-stack breadth.

**Python version pinning:** Render defaulted to Python 3.14, which had no compatible build of the exact MediaPipe version (`0.10.21`) the model was trained and validated against. Fixed by explicitly setting `PYTHON_VERSION=3.11.9` via Render's environment variables (not `runtime.txt`, which is a Heroku-specific convention Render doesn't read).

**PyTorch CPU-only build:** The default `pip install torch` pulled in full CUDA/GPU libraries (several GB), which combined with the rest of the stack, exceeded Render's 512MB free-tier memory limit and caused repeated out-of-memory crashes (exit code 137). Fixed by correctly specifying `--extra-index-url https://download.pytorch.org/whl/cpu` on its own line in `requirements.txt` (a single inline `--index-url` per package does not work as expected).

**Lazy-loading heavy models:** Even after switching to CPU-only PyTorch, loading both the XGBoost model and the full MediaPipe + PyTorch shot-classifier stack at server startup was still memory-tight. Fixed by lazy-loading the shot-classifier resources only on first actual use of `/classify-shot`, keeping baseline memory usage low for the more frequently used win-probability and replay endpoints.

**Match replay data — from live recomputation to precomputed lookup:** The `/replay/{match_id}` endpoint originally recalculated an entire match's win-probability timeline live from raw JSON on every request, which required deploying all 3,517 raw match files (~273MB) to the server. Replaced with a precomputation step (run once, offline) that saves each match's full timeline to its own small file. This cut deployment size dramatically and made replay responses near-instant, at the cost of needing to re-run precomputation if the underlying model changes.

**Per-file vs single-blob storage:** An intermediate version stored all precomputed replays in one 42MB JSON file, loaded fully into memory at startup — this alone was enough to push memory usage over the free-tier limit once parsed into Python objects (a JSON file typically expands 3-5x in memory). Fixed by splitting into one small file per match, read from disk only on demand, keeping memory usage flat regardless of total data volume.

**CORS configuration:** `allow_origins` must explicitly list every frontend domain that will call the API (both `localhost:5173` for local development and the live Vercel URL for production) — a common but easy-to-forget step when moving from local development to a live deployment.

**SPA routing on Vercel:** React Router routes worked when navigated to from within the app, but returned 404 on direct page load or browser refresh, since Vercel's server has no actual file at those paths. Fixed with a `vercel.json` rewrite rule serving `index.html` for all routes, letting React Router handle routing client-side as intended.

**Route ordering bug:** `/players/compare` was defined after `/players/{player_name}` in the FastAPI route list. Since `compare` also technically matches the `{player_name}` path pattern, requests to `/players/compare` were being intercepted by the player-lookup route (searching for a player literally named "compare") before ever reaching the intended endpoint. Fixed by ensuring more specific static routes are always declared before dynamic path-parameter routes of the same prefix.

**Force-adding gitignored data files:** Since `data/` is gitignored (correctly, to keep raw datasets out of version control), every new small data file the API needs at runtime (match index, player stats, venue reports, precomputed replays) had to be explicitly force-added with `git add -f` — a recurring gotcha worth remembering for any future data file additions.

## Player Analytics

**Qualification threshold:** Players required 200+ balls faced/bowled to be included in analytics, filtering out small-sample noise (e.g., a player who scored a lucky 30 in their only innings) while still covering 1,700+ players.

**Phase definitions:** Powerplay (overs 1-6), middle (7-15), death (16-20) — standard T20 analytical convention, used consistently across batting phase splits, bowling phase splits, and venue pitch reports.

**Name-search gap and fix:** Cricsheet records players in scorecard format (initials + surname, e.g., "V Kohli"), which doesn't match how casual users search (e.g., "Virat"). Solved with two complementary techniques: a curated alias list for globally recognizable players ("Virat Kohli" → "V Kohli"), and fuzzy string matching (`difflib.get_close_matches`) as a fallback that scales to all 1,700+ players without manual mapping, catching typos and near-misses generically.

**"Clutch rating" methodology:** Defined pressure situations using the same runs-needed/required-run-rate framework as the win-probability model itself (required rate significantly exceeding current rate, in the back half of an innings), then compared each player's strike rate in pressure vs. comfortable situations. A rating of 100 means no change under pressure; above 100 means genuinely improved performance when it matters — deliberately reusing the project's own situational logic rather than inventing a separate, disconnected metric.

## Moment of the Match

**Filtering trivial swings:** An early version of the "most dramatic turning points" leaderboard was dominated by matches simply ending (probability jumping to 100% on the winning run) — technically a large swing, but not meaningful drama. Fixed by excluding turning points in the final 2 overs entirely, surfacing genuine mid-innings twists (a shock collapse in over 12, an unexpected assault in over 15) instead of predictable end-of-chase moments.

**Moment classification:** Turning points are auto-tagged (collapse / assault / squeeze / boundary) by examining the pattern of deliveries immediately surrounding the swing — multiple wickets nearby → collapse, several boundaries in a short window → assault, a single high-pressure wicket → squeeze — giving the leaderboard categorical structure without manual labeling.