# Sandhi: speak it, sign it

Sandhi helps people in India draft and check contracts. You talk (or type) the way you would to a lawyer, Sandhi asks the right questions, drafts a contract under Indian law, checks it clause by clause, finds loopholes in contracts you already have, and seals the final text with a fingerprint so any later change is caught.

Built for the **AI for Lawyers** hackathon, problem statement PS-03 (Smart Contract Creation).

- Live site: https://sandhi-nine.vercel.app
- Every answer cites the law library (48 provisions). Nothing is invented: unknown IDs are stripped before they reach the screen.
- Sandhi is an assistant, not a lawyer. Wherever the automatic check is not enough, the page says: **"Please have an advocate review this before you sign."**

## What it does

| Screen | What you get |
|---|---|
| **Talk and draft** | A spoken or typed interview, live legal warnings, a streamed contract with a "why" note under each clause, a legal check, blanks to fill in, then **Seal**, **PDF**, text and JSON export |
| **Check a contract** | Paste text or add photos. Get a safety score, loopholes (worst first) with safer wording, missing protections, and a one-click redraft |
| **Verify a copy** | Paste a copy and a fingerprint to see if it is word-for-word the sealed contract, and exactly which lines differ if not |
| **Law library** | Every provision Sandhi cites, searchable, with plain-words consequences |

## Demo mode and live mode

- **Demo mode** (no `ANTHROPIC_API_KEY`): free. Answers come from built-in samples and rules. A banner says so on every screen. Use it to test everything.
- **Live mode** (key set): the real AI answers. The fast model handles chat and obligations; the smart model handles drafting, legal checks and reviews.

Switching is only a setting. See `env.example`.

## How it is built

```
Browser (Next.js app)                      Server (Next.js route handlers, Vercel)
  Talk / Check / Verify / Law   ---->      /api/chat        interview turn
  voice in (Web Speech) / out              /api/draft       streamed contract text
  seal, export, print                      /api/legal-check clause-by-clause check
                                           /api/review      streamed loophole report (JSON Lines)
                                           /api/obligations obligations for smart contracts
                                           /api/status      demo or live
                                                |
                                      guard.ts: rate limit, size limit, schema check, daily cap
                                      provider.ts: the only file that calls the AI (key stays here)
                                      schemas.ts: sanitisers remove invented IDs and premature "draft now"
```

Key folders (all under `src/`):

- `app/api/*`: the server routes. `lib/ai/`: provider, prompts, schemas, guard, demo-mode mocks.
- `components/talk`, `check`, `verify`: the screens. `lib/seal.ts`, `lib/contract.ts`: seal and contract format.
- `data/lawLibrary.ts`: the 48 provisions.

The contract format is plain text the page parses (`TITLE:`, `## N. Heading`, `> why: ...`, `SIGN:`, `===BEFORE YOU SIGN===`, `[[to be filled: ...]]`). The seal fingerprints the canonical form (title, clauses and signature lines; no "why" notes).

## Run it

You need Node.js 20.9 or newer.

```bash
npm install
npm run dev          # http://localhost:3000, demo mode
```

For the live site, push to GitHub and let Vercel build it. Add keys under **Vercel > Project > Settings > Environment Variables**, never in files.

## Checks

```bash
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm test             # 68 unit tests: seal, contract format, rate limit, AI safety layer, voice helpers, law library
npm run build        # production build
```

Before any demo, also work through `docs/LAW_VERIFICATION.md` (13 provisions still to be checked against India Code).

## Settings

All settings are in `env.example`. The important ones:

| Setting | What it does |
|---|---|
| `ANTHROPIC_API_KEY` | Turns on the real AI. Empty = demo mode |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Makes the rate limit hold across all servers |
| `SANDHI_DAILY_AI_CAP` | Most real-AI requests per day (default 2000) |

## Privacy

There is no database. In live mode, what you type or say, contracts you paste and photos you add are sent to the AI provider to write the answer. Sealed contracts stay in your own browser. Logs never contain contract text. Details in `SECURITY.md`.

## Limits worth knowing

- PDF and Word uploads are not supported yet: paste the text or add photos.
- Voice uses the browser's built-in voice and works best in Chrome, Edge and Safari. Hindi and Telugu voices depend on the device.
- The seal proves the words are unchanged. It is not a signature, an e-stamp or a registration.
- The law library is a summary and is not updated live.
