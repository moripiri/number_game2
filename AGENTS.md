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
- Solutions live under `game_logic/answers/k3/`, `game_logic/answers/k4/`, `game_logic/answers/k5/`.
- Difficulty mapping:
  - Easy → `k=3` → `game_logic/answers/k3/`
  - Medium → `k=4` → `game_logic/answers/k4/`
  - Hard → `k=5` → `game_logic/answers/k5/`
- Round (by difficulty):
  - number count = `k` (distinct numbers, each used exactly once)
  - operator count = `k-1` (chosen from `+ - * /`, repeats allowed)
  - expression slots = `2*k-1` (index 0,2,4,... numbers; 1,3,5,... operators)
- Expression shape: no parentheses; evaluate with standard precedence (`*` and `/` before `+` and `-`), left-to-right within the same precedence.
- Fractions: allowed; division may produce non-integers (use exact rational arithmetic, not floats).
- Target: integer derived from the filename (`<target>.txt`).
- Guarantee solvable:
  1) choose a target file with ≥1 line
  2) pick one solution line
  3) extract numbers from the line
  4) shuffle numbers for the given tiles
- Win: player’s expression evaluates exactly to the target (do not compare to stored solution line).

## Puzzle Generation
- Use precomputed solutions under `game_logic/answers/k{3|4|5}/` based on difficulty:
  - scan the difficulty directory for target files with ≥1 solution line
  - pick one target file at random
  - pick one solution line at random
  - extract the ordered numbers from the line, then shuffle for tiles
  - set target from the filename (not from the expression text)

## UI / UX (Main Screen)
- Overall: centered, card-based layout; polished mobile puzzle app feel (NYT/Wordle-like: clean, trustworthy, restrained).
- Top row (inside main card):
  - Left: `Reset` button.
  - Center: solved puzzle count.
  - Right: audio control button (volume/slider icon) that opens/contains the combined toggle+volume slider control.
- Reset: clicking `Reset` sets solved count to `0`.
- Central slots: `2*k-1` horizontal slots:
  - Slots 0,2,4,... are number slots (square).
  - Slots 1,3,5,... are operator slots (circle).
  - Shapes must be visually distinct and readable on mobile.
- Target appears at the end of the expression row; target container height matches number slot height.
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
 - Difficulty selector:
   - add a top-right selector (Easy / Medium / Hard)
   - changing difficulty immediately starts a new puzzle from the corresponding `k` directory

## UI/Animation Guidelines
- Tailwind-first styling; avoid large bespoke CSS unless necessary.
- Centralize common motion patterns (variants/easings) so screens feel consistent.
- Use `AnimatePresence` for screen transitions; keep animations fast and responsive.
- Prefer motion that stays smooth on mid-range mobile (animate `transform`/`opacity`, avoid layout-thrashing).

## Audio
- Background music file: `public/music.mp3`.
- Autoplay: do not attempt to start audio on page load (mobile browsers block it); start/resume only after an explicit user gesture.
- Controls: two sliders in the audio panel:
  - BGM volume (`0.0`–`1.0`) stored as `ng_bgm_volume`
  - SFX volume (`0.0`–`1.0`) stored as `ng_sfx_volume`
- Volume `0` mutes the respective channel.
- UX: keep audio controls reachable on mobile (tap targets ≥ ~44px) and avoid disruptive volume jumps.

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
