# AGENTS.md

Instructions for coding agents working in this repository.

## Project
- Goal: Frontend-only “make the target number” puzzle game (given numbers + operations `+ - * /`).
- Platform: Mobile-first Web (no backend).
- Navigation: Single-screen app (no URL routing); screens controlled by app state.

## Tech Stack
- Build: Vite
- UI: React + TypeScript
- Styling: Tailwind CSS (via `@tailwindcss/vite`)
- Animation: Framer Motion
- Package manager: `npm` (preferred)

## Local Commands
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Architecture
- Use a simple screen state machine instead of routing:
  - `screen: 'title' | 'play' | 'results' | 'settings'` (extend as needed)
  - Transitions should be explicit events (e.g. `START_GAME`, `SUBMIT_MOVE`, `WIN`, `RESET`).
- Prefer `useReducer` for game state; switch to a small store (e.g. Zustand) only if reducers become unwieldy.
- Keep gameplay logic in pure functions (no React imports) so it’s easy to test and reuse.

## Game Rules
- Round: exactly 3 distinct numbers, each in `1..9`, used exactly once.
- Operators: exactly 2 operators chosen from `+ - * /` (operators may repeat).
- Expression shape: `a op1 b op2 c` only (no parentheses).
- Evaluation: standard precedence (`*` and `/` before `+` and `-`), left-to-right within the same precedence.
- Fractions: allowed; division may produce non-integers (use exact rational arithmetic, not floats).
- Target: integer in `1..99`.
- Guarantee solvable: choose a `target` whose `game_logic/answers/<target>.txt` has ≥1 line, then choose one solution line and use its three numbers (shuffled) as the given numbers for the round.
- Win: player’s expression evaluates exactly to the target.

## Puzzle Generation
- Use precomputed solutions under `game_logic/answers/`:
  - choose a random target `1..99` whose file has ≥1 solution line
  - pick one solution line and extract its 3 numbers (shuffle for display)
  - store the sampled solution line for optional “show solution” UX

## UI / UX (Main Screen)
- Overall: centered, card-based layout; polished mobile puzzle app feel (NYT/Wordle-like: clean, trustworthy, restrained).
- Top row (inside main card):
  - Left: `Reset` button.
  - Center: solved puzzle count.
  - Right: audio control button (volume/slider icon) that opens/contains the combined toggle+volume slider control.
- Reset: clicking `Reset` sets solved count to `0`.
- Central slots: 5 horizontal slots:
  - Slots 1/3/5 are number slots (square).
  - Slots 2/4 are operator slots (circle).
  - Shapes must be visually distinct and readable on mobile.
- Tile tray (bottom area): draggable tiles:
  - number tiles are square
  - operator tiles (`+ − × ÷`) are circular/rounded
  - users drag tiles into the matching slot type to build `a op1 b op2 c`
  - tiles can be removed by dragging back out to the tray
- Correct expression:
  - increment solved count by 1
  - briefly shake the placed tiles (subtle animation)
  - start a new puzzle immediately after the animation
- Components: prefer `shadcn/ui`-style components/patterns where practical (Card, Button, Slider, Dialog/Popover), while keeping bundle size and mobile performance in mind.

## UI/Animation Guidelines
- Tailwind-first styling; avoid large bespoke CSS unless necessary.
- Centralize common motion patterns (variants/easings) so screens feel consistent.
- Use `AnimatePresence` for screen transitions; keep animations fast and responsive.
- Prefer motion that stays smooth on mid-range mobile (animate `transform`/`opacity`, avoid layout-thrashing).

## Audio (Background Music)
- Background music file: `public/music.mp3`.
- Autoplay: do not attempt to start audio on page load (mobile browsers block it); start/resume only after an explicit user gesture (e.g. tapping “Start” or a music toggle).
- Controls: provide a single combined audio control (music on/off toggle + volume slider `0.0`–`1.0` in the same UI area); no need to display the numeric value.
- Persistence: save user preference (muted + volume) to `localStorage` and restore on next visit.
- UX: keep audio controls reachable on mobile (tap targets ≥ ~44px) and avoid disruptive volume jumps (fade in/out when toggling).

## Mobile-First
- Primary target: smartphones and tablets; desktop is secondary.
- Layout: responsive by default; avoid fixed widths/heights and prefer flexible stacks.
- Touch: ensure tap targets are at least ~44px, avoid hover-only interactions, and support drag/press states.
- Safe areas: account for notches and home indicators using `env(safe-area-inset-*)` when needed.
- Performance: optimize for mid-range mobile; avoid layout-thrashing animations (prefer `transform`/`opacity`), keep motion subtle, and respect `prefers-reduced-motion`.

## Code Conventions
- TypeScript: keep types explicit at module boundaries; avoid `any`.
- Naming:
  - React components: `PascalCase.tsx`
  - Hooks: `useSomething.ts`
  - Utilities: `camelCase.ts`
- Keep files small and focused; prefer composition over deep prop drilling.

## Assets
- Put static assets in `public/` when they must keep stable URLs; otherwise import from `src/assets/`.
- Keep assets lightweight; document any attribution requirements in the asset folder.

## Quality Gate
- Before finishing a change: `npm run build` and `npm run lint` should pass.
