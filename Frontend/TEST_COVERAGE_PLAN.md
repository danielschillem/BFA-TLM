# Frontend Test Coverage Plan

## Objective

Increase confidence on critical user journeys and reduce regressions while refactoring large modules.

## Current Gaps

- Large critical components (`src/pages/consultations/ConsultationRoom.jsx`, `src/App.jsx`) with limited scenario coverage.
- API surface in `src/api/index.js` historically centralized and hard to validate by domain.
- Few tests around degraded-network and auth edge-cases.

## Priority Journeys (P0)

1. **Authentication**
   - Login success/failure
   - 2FA pending flow and verification
   - Session expiration/logout sync

2. **Teleconsultation**
   - Join room success/failure
   - Auto reconnect behavior
   - Auto fallback to audio-only on weak network
   - End consultation transitions

3. **Admin Monitoring**
   - 24h/7d visio metrics retrieval
   - Empty and populated states
   - Trend chart rendering

## Coverage Targets

- P0 journeys: **>= 80% statement coverage** on touched modules.
- Global frontend coverage in CI:
  - Statements: **>= 55%** initial gate, then 65%.
  - Branches: **>= 45%** initial gate, then 55%.

## Test Strategy by Layer

- **Unit tests**
  - Pure helpers (example: `visioMetrics.js`).
  - Data mappers/formatters.

- **Component tests (RTL + Vitest)**
  - Auth forms/pages.
  - Admin stats widgets.
  - Visio UI subcomponents extracted from consultation room.

- **Integration tests (mocked API)**
  - Full page flows with React Query + routing.
  - Error and retry states.

## 30-Day Execution Plan

1. Add tests for extracted visio subcomponents (`ConsultationRoomAtoms`).
2. Add coverage for `AdminStats` period switch and trend.
3. Add tests for auth session sync and 2FA edge paths.
4. Add CI coverage thresholds (`npm run test:coverage`) and fail on regression.

## Definition of Done

- New feature merged only with tests for happy path + one failure path.
- No net decrease in coverage on modified files.
- Critical journeys listed above have at least one integration test each.

