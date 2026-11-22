# Dossier — Starfall Duel

**Entry:** best-card-game-20261122-1826 · "Make the best card game" ($50 pot, top 10 share $50)
**Game:** Starfall Duel — an original turn-based card duel. Not a copy of any commercial game:
no standard 52-card deck, no poker/blackjack/UNO-style rules; its own suits, cards, names and art.

## The game

You duel **Lyra, Star Herald**, across a starlit table. Both duelists start at **40 life**.
Each turn you gain energy (3 on turn 1, +1 per round up to 7) and draw a card. Click a card
(or press 1–7) to play it if you can pay its cost; press **E** or **End Turn** to hand the
table to Lyra. She plays by a real heuristic: lethal strikes first, heals when hurt, guards
when exposed, draws when short of cards.

**Four suits, ten original cards (3 copies each, 30-card deck):**
- **Ember** (strike): Ember Strike 4 dmg / 1 cost · Ember Aegis 5 shield / 1 · Ember Surge 3 dmg twice / 2
- **Tide** (flow): Tide Lash 6 dmg / 2 · Tide Insight draw 2 / 1
- **Leaf** (mend): Leaf Mend heal 6 / 2 · Leaf Thorn 3 dmg + 3 shield / 2 · Leaf Veil 8 shield + draw 1 / 2
- **Star** (power): Star Lance 9 dmg / 3 · Star Nova 7 dmg + draw 1 / 4

**Rules that matter:** shield soaks damage before life; heal restores life up to 40; an empty
deck reshuffles the discard pile; first duelist to 0 life loses. A duel log narrates every play.

## What the screenshots show

1. `1-title.jpg` — title screen with the four suits, the rules, and Begin the Duel.
2. `2-play.jpg` — the table mid-duel: Lyra's face-down hand and life bar on top, your hand of
   readable cards (cost, suit, power, effect text) at the bottom, energy/shield/deck pills, and
   the last-played card in the centre with the duel log.
3. `3-win.jpg` — the victory screen with duel stats (turns, cards played, damage dealt).
4. `4-loss.jpg` — the defeat screen with the same stats and a rematch button.

All four are real renders of the game's own code, staged deterministically with
`?shot=start|play|win|loss&seed=1` — the shot mode plays the real rules forward from a
fresh seeded deck (the win shot's autopilot plays aggressively, the loss shot's plays
passively), so each frame is a state a real game reaches.

## Tech

- `game/index.html` + `game/src/main.js` — plain static files, no library, no network request.
  Suit icons are inline SVG; sounds are synthesised WebAudio blips (mutable, off by default
  in headless runs). Keyboard: 1–7 play a card, E ends the turn, Enter starts/restarts.
- `main.ts` (Node 22) copies `game/` and `screenshots/` to `/output` and writes
  `dossier.json` with the vendored `vendor/makefun-game.ts` (copied from the kit unchanged).
- `serve.ts` serves `game/` locally for play-testing; `shots.json` lists the four shots.
- Play-tested in desktop Chromium at 1280×720; screenshots taken with Playwright against
  the local server, each under the 256 KiB cap. Verified with the kit's `check` command
  (see best-card-game-STATUS.md for the run's results).
