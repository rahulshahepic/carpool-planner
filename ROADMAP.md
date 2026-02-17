# Carpool Planner — Roadmap

## Overview

A web application that helps coworkers find carpool partners for commuting to a shared workplace. Users sign in with Google, enter their home address and commute preferences, and the system suggests ranked matches based on route overlap and schedule compatibility.

The initial deployment targets carpooling to **Epic's Verona, WI campus**, but the work destination is app-level configuration so any workplace can use it.

---

## Key Design Decisions (needs your input)

| Decision | Recommendation | Alternatives |
|---|---|---|
| **Maps / Routing API** | Google Maps Platform (Directions, Distance Matrix, Geocoding) — well-documented, pay-per-use, native GCP integration | Open-source OSRM/Valhalla (free but self-hosted) |
| **Backend** | Python with FastAPI — good Google client library support, lightweight for Cloud Run | Node.js (Express or Next.js) |
| **Frontend** | React (Vite) — simple SPA served from the same Cloud Run service or a CDN bucket | Next.js (SSR adds complexity for this use case) |
| **Database** | Cloud SQL for PostgreSQL — structured relational data (users, preferences, matches) | Firestore (simpler ops, but harder for spatial/relational queries) |
| **Auth** | Google OAuth 2.0 via Google Identity Services | Firebase Auth (adds a dependency but simplifies token management) |

> **Action needed:** Confirm or change these before development starts. The roadmap below assumes the recommended stack.

---

## Architecture

```
┌──────────────┐       ┌──────────────────┐       ┌───────────────────┐
│  React SPA   │──────▶│  FastAPI backend  │──────▶│  Cloud SQL (PG)   │
│  (Vite)      │       │  on Cloud Run     │       │                   │
└──────────────┘       └────────┬─────────┘       └───────────────────┘
                                │
                   ┌────────────┼────────────┐
                   ▼            ▼            ▼
             Google OAuth  Google Maps   (future)
             (sign-in)     Platform      Cloud Scheduler
                           APIs          for batch matching
```

All components run on GCP. The FastAPI service is containerized and deployed to **Cloud Run**. Static frontend assets can be served from the same container or from a Cloud Storage bucket behind a CDN — either works for v1.

---

## Data Model (v1)

### User
| Field | Type | Notes |
|---|---|---|
| id | UUID | primary key |
| google_id | string | from OAuth, unique |
| email | string | Gmail address |
| display_name | string | from Google profile |
| home_address | string | free-text, geocoded on save |
| home_lat | float | geocoded latitude |
| home_lng | float | geocoded longitude |
| created_at | timestamp | |
| updated_at | timestamp | |

### CommutePreference
| Field | Type | Notes |
|---|---|---|
| id | UUID | primary key |
| user_id | FK → User | |
| direction | enum | `TO_WORK` or `FROM_WORK` |
| earliest_time | time | e.g. 07:00 |
| latest_time | time | e.g. 08:30 |
| days_of_week | int[] | 0=Mon … 4=Fri |
| role | enum | `DRIVER`, `RIDER`, `EITHER` |

### MatchResult (computed, cached)
| Field | Type | Notes |
|---|---|---|
| id | UUID | primary key |
| user_a_id | FK → User | |
| user_b_id | FK → User | |
| direction | enum | `TO_WORK` or `FROM_WORK` |
| detour_minutes | float | extra drive time for pickup |
| time_overlap_minutes | float | overlap of schedule windows |
| rank_score | float | combined score (lower = better) |
| computed_at | timestamp | when this match was calculated |

---

## Matching Algorithm (v1 — keep it simple)

The goal is to find pairs of users whose routes overlap enough that one could pick up the other without too much detour, and whose schedules are compatible.

### Steps

1. **Schedule overlap** — For each pair of users going the same direction, compute the overlap between their time windows. Discard pairs with zero overlap.

2. **Role compatibility** — At least one must be willing to drive (`DRIVER` or `EITHER`). If both are `RIDER`, skip.

3. **Detour cost** — Use the Google Maps **Distance Matrix API** (or Directions API) to estimate how many extra minutes a driver would spend picking up the rider:
   - `detour = (driver_home → rider_home → work) − (driver_home → work)`
   - Discard pairs where detour > configurable threshold (default: 15 min).

4. **Rank score** — Simple weighted sum:
   ```
   score = (detour_minutes × W_detour) − (time_overlap_minutes × W_overlap)
   ```
   Lower is better. Weights are tunable app config. This is intentionally naive — good enough to surface useful suggestions without overengineering.

5. **Present top N matches** per user, sorted by score.

### API cost management

- Geocode each address once on save, cache lat/lng.
- Pre-filter candidate pairs by straight-line (haversine) distance before calling the Distance Matrix API. If two homes are > 20 miles apart in opposite directions from work, skip the API call.
- Batch recomputation on a schedule (e.g., nightly) or on-demand when a user updates their profile. Don't recompute on every page load.

---

## Milestones

### Milestone 1 — Project Skeleton & Auth
- [ ] Initialize FastAPI project with Docker + Cloud Run config
- [ ] Initialize React (Vite) frontend
- [ ] Google OAuth sign-in flow (backend validates ID token, issues session)
- [ ] Basic user profile stored in Cloud SQL
- [ ] CI: lint + test on push
- [ ] Deploy to Cloud Run (staging)

### Milestone 2 — User Profile & Address
- [ ] Profile page: display name, email (from Google)
- [ ] Home address input with Google Places Autocomplete
- [ ] Geocode address on save (Google Geocoding API), store lat/lng
- [ ] Commute preferences form: direction, time window, days, driver/rider/either
- [ ] API endpoints: GET/PUT profile, GET/PUT preferences

### Milestone 3 — Matching Engine
- [ ] Implement schedule overlap + role compatibility filtering
- [ ] Haversine pre-filter for candidate pairs
- [ ] Distance Matrix API integration for detour calculation
- [ ] Rank scoring and storage in MatchResult table
- [ ] Batch recomputation trigger (manual endpoint for now)
- [ ] API endpoint: GET /matches (returns ranked list for current user)

### Milestone 4 — Match UI & Contact
- [ ] Matches page showing ranked carpool partners
- [ ] Each match card shows: name, approximate detour, schedule overlap, role
- [ ] "Interested" button that sends an email (or reveals contact info) to the other user
- [ ] Basic notification when someone expresses interest in carpooling with you

### Milestone 5 — Polish & Production Deploy
- [ ] App config for workplace destination (name, address, lat/lng) — not hard-coded
- [ ] Environment-based config (dev/staging/prod)
- [ ] Rate limiting and basic abuse prevention
- [ ] Privacy: users only see first name + general area until mutual match
- [ ] Production Cloud Run deployment with custom domain
- [ ] Monitoring and alerting (Cloud Logging / Cloud Monitoring)

---

## Future (out of scope for v1)

- **Campus sub-locations** — let users specify a building or parking lot on campus for finer-grained matching
- **Recurring schedule management** — "I work from home on Fridays" patterns
- **In-app messaging** — instead of email-based contact
- **Groups / ongoing carpools** — formalize a carpool group, track who's driving which day
- **Real-time pickup coordination** — "I'm leaving in 10 minutes" notifications
- **Carbon / cost savings dashboard**
- **Multi-workplace support** — one deployment serving multiple companies, each with their own destination config

---

## APIs & Services Required

| Service | Purpose | Pricing notes |
|---|---|---|
| Google OAuth 2.0 | Sign-in | Free |
| Google Maps Geocoding API | Convert address → lat/lng | $5 per 1,000 requests |
| Google Maps Distance Matrix API | Compute detour times | $5 per 1,000 elements |
| Google Places Autocomplete | Address input UX | $2.83 per 1,000 sessions (Autocomplete (New)) |
| GCP Cloud Run | Host backend + frontend | Pay per use, generous free tier |
| GCP Cloud SQL (PostgreSQL) | Database | ~$7/mo for smallest instance |

For a small user base (< 100 users), monthly API costs should be well under $20 assuming nightly batch matching and cached geocodes.

---

## Open Questions

1. **Google account address** — Google does not expose a user's home address via standard OAuth scopes. Users will need to enter it manually. The Places Autocomplete widget makes this painless.

2. **Privacy posture** — How much info should users see about potential matches before mutual opt-in? The roadmap assumes first-name + general area until both express interest.

3. **Notifications** — Email is simplest for v1. Should we plan for push notifications, or is email sufficient to start?

4. **Auth session management** — Simple JWT-based sessions, or use a library like `authlib`? JWT is the recommendation for a Cloud Run stateless deployment.
