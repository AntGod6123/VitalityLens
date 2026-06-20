# VitalityLens

VitalityLens is a cross-platform (iOS & Android) health and fitness application built with React Native / Expo. It documents and visualises your life goals to increase longevity and functionality — starting with a best-in-class workout tracking system and expanding into nutrition, body composition, and AI-assisted medical document management.

---

## Vision

Most fitness apps track *what* you did. VitalityLens tells you *where you're going* — showing your actual physiological progress against evidence-based models of human potential. The app separates body composition into **Fat-Free Mass Index (FFMI)** and **Fat Mass Index (FMI)** rather than the misleading single BMI number, so you can visualise muscle gain and fat loss independently.

---

## Feature Roadmap

### Phase 1 — Workout Tracking (current focus)

| Feature | Description |
|---|---|
| **Workout Logger** | Log exercises, sets, reps, weight, RPE, and duration per session |
| **AI Workout Builder** | Guided plan builder inspired by [NatFitPro](https://natfitpro.com/workout-builder/) |
| **Progressive Overload Tracker** | Database of per-exercise weekly increment targets; alerts when to increase load |
| **Muscle Growth Projections** | Charts expected muscle gain over time against natural potential ceilings (Berkhan/Martin/Casey Butt models) |
| **Exercise Library** | Searchable database filterable by muscle group and equipment |
| **Injury Dashboard** | Active injuries automatically remove unsafe exercises from the builder via AI |

### Phase 2 — Body Composition & Metrics

| Feature | Description |
|---|---|
| **Body Measurements** | Height, weight, waist, hip, neck, arm, thigh, calf — logged over time |
| **BMR / RMR (Katch-McArdle)** | Calculated from lean body mass; formula from [OmniCalculator](https://www.omnicalculator.com/health/bmr-katch-mcardle) |
| **TDEE** | Total Daily Energy Expenditure using activity multiplier |
| **VO2max Estimate** | Rockport Walk Test and other field-test estimates |
| **DEXA Input** | Manual entry of DEXA scan results for highest-accuracy body composition |
| **FFMI** | Fat-Free Mass Index — normalised to height, benchmarked against natural limits per [Menno Henselmans](https://mennohenselmans.com/ffmi-calculator/) |
| **FMI** | Fat Mass Index — FM(kg)/height(m)² — a novel split of BMI that visualises fat mass independently of muscle mass |
| **Natural Potential Calculator** | Expected maximum LBM based on height and frame size per [NatFitPro](https://natfitpro.com/natural-muscle-potential-calculator/) |
| **Goal Tracker** | Weight loss & muscle gain goals with progress bars toward FFMI/FMI targets |

### Phase 3 — Nutrition & Supplementation

| Feature | Description |
|---|---|
| **Food Log** | Daily macro and calorie tracking per meal |
| **Supplement Log** | Dose, timing, and brand tracking for supplements |
| **Macro Targets** | Auto-calculated protein/carb/fat targets from TDEE and body composition goals |
| **Micronutrient Tracking** | Optional detailed vitamin/mineral logging |

### Phase 4 — Medical & AI

| Feature | Description |
|---|---|
| **Medical Document Upload** | PDF and image upload of medical records, lab results, imaging reports |
| **AI Summarisation** | Claude AI extracts conditions, workout restrictions, and quality-of-life recommendations from documents |
| **Injury-Aware Filtering** | AI cross-references active injuries with exercise database to remove contraindicated movements |
| **QoL Recommendations** | Personalised longevity recommendations based on body composition + medical history |
| **Future: Image Analysis** | Progress photos fed into AI for visual body composition assessment |

---

## Body Composition Model

VitalityLens replaces BMI with a two-index system:

```
Weight (kg)
├── Lean Body Mass (LBM)
│   └── FFMI = LBM / height(m)²        ← muscle quality score
└── Fat Mass (FM)
    └── FMI  = FM  / height(m)²         ← fat level score
```

### FFMI Reference Bands (Kouri et al.)

| FFMI | Category |
|---|---|
| < 18 | Below Average |
| 18–20 | Average |
| 20–22 | Above Average |
| 22–24 | Excellent |
| 24–26 | Superior (near natural ceiling) |
| > 26 | Suspected enhancement |

### FMI Healthy Ranges (approximate)

| Sex | Lean | Healthy | Overfat |
|---|---|---|---|
| Male | 3–6 | 6–9 | > 9 |
| Female | 5–9 | 9–13 | > 13 |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 51+) |
| Language | TypeScript |
| Navigation | React Navigation v6 (stack + bottom tabs) |
| State | Redux Toolkit |
| Charts | Victory Native / React Native Chart Kit |
| Storage | AsyncStorage + SQLite (via Expo SQLite) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| Document Processing | Expo Document Picker + PDF parsing |
| Auth | Expo SecureStore + planned backend auth |

---

## Project Structure

```
VitalityLens/
├── src/
│   ├── types/              # Shared TypeScript interfaces (BodyMeasurement, WorkoutSession, etc.)
│   ├── constants/          # Colours, fonts, FFMI/FMI bands, activity levels
│   ├── store/
│   │   ├── index.ts        # Redux store configuration
│   │   └── slices/         # bodySlice, workoutSlice, nutritionSlice, medicalSlice
│   ├── navigation/
│   │   └── types.ts        # Navigator param lists
│   ├── screens/
│   │   ├── Auth/           # Welcome, SignIn, SignUp, Onboarding
│   │   ├── Dashboard/      # Home overview with key metrics
│   │   ├── Workout/        # Logger, Builder, Exercise Library, Projections
│   │   ├── Body/           # Measurements, FFMI/FMI, Energy Metrics, DEXA
│   │   ├── Nutrition/      # Food & supplement logging, macro targets
│   │   ├── Medical/        # Document upload, injury dashboard, AI recommendations
│   │   └── Progress/       # Long-term charts and goal tracking
│   ├── components/
│   │   ├── common/         # Buttons, inputs, modals, loaders
│   │   ├── charts/         # FFMI gauge, FMI gauge, progress charts
│   │   ├── forms/          # Measurement forms, workout entry forms
│   │   └── cards/          # Metric cards, session cards, document cards
│   ├── hooks/
│   │   └── useAppSelector.ts  # Typed Redux hooks
│   ├── services/
│   │   └── aiService.ts    # Claude API integration (summarisation, filtering, recommendations)
│   └── utils/
│       └── bodyComposition.ts  # BMR, TDEE, FFMI, FMI, VO2max, natural potential calculations
├── assets/                 # Icons, splash screen, fonts
├── app.json                # Expo config
├── package.json
└── tsconfig.json
```

---

## Calculation References

- **BMR/RMR (Katch-McArdle):** `BMR = 370 + (21.6 × LBM_kg)` — [omnicalculator.com](https://www.omnicalculator.com/health/bmr-katch-mcardle)
- **FFMI:** `FFMI = LBM_kg / height_m²` with normalisation `+6.1×(1.8−h)` — [mennohenselmans.com](https://mennohenselmans.com/ffmi-calculator/)
- **FMI:** `FMI = FM_kg / height_m²` — novel split for cleaner body composition visualisation
- **Natural Potential (Berkhan/Martin):** `Peak LBM (kg) ≈ height_cm − 100` at ~5% BF
- **Natural Potential (Casey Butt):** Wrist + ankle circumference formula for max muscular bodyweight
- **TDEE multipliers:** Sedentary 1.2 → Extra Active 1.9
- **VO2max (Rockport):** Field-test heart-rate based estimate

---

## Getting Started

> Prerequisites: Node 20+, Expo CLI, iOS Simulator or Android Emulator (or Expo Go on device)

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

### Environment Variables

Create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=your_key_here
```

---

## Contributing

1. Branch from `main` using the naming convention `feature/<short-description>`
2. All new calculation utilities go in `src/utils/` with unit tests
3. All new TypeScript types go in `src/types/index.ts`
4. Run `npx tsc --noEmit` before pushing

---

## License

MIT
