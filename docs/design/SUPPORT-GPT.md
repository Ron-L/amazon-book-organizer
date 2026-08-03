# AI-powered user support via a Custom GPT

_Moved verbatim from TODO.md during the 6.12.0 TODO restructure (2026-08-03). Pre-launch. Replaces tutorial videos 2–8._

---

Create a shareable Custom GPT as an interactive help resource.
- Pre-load with ReaderWrangler documentation (README, user guide, etc.) as knowledge files
- Set system instructions to scope it as a ReaderWrangler support assistant
- Add link to Help menu in the app so users land directly in a ready-to-go ChatGPT session
- Works with free tier ChatGPT accounts — no setup required from users
- Evaluate Claude Projects equivalent if/when shareable project links become available

## Build notes + manual set (2026-07-03 discussion)

- **Cost model:** a Custom GPT hosted on ChatGPT bills *you* ~$0/user — users chat on their own ChatGPT quota; your only cost is a ~$20/mo authoring seat (to create/edit, not per user). Alternative = embed a chat widget via the AI API with our own key → we pay per use, but support Q&A is cheap (~$0.001–0.02/question; ~$0.02–0.40 to onboard a new user; pennies/mo steady). Verify current pricing + free-tier terms at build time — they shift.
- **Framing (honest):** the model is rented and identical whether we host it or a user DIYs (pastes our docs into any chatbot). Our value is convenience / scoping / freshness / consistency — NOT a differentiator. The **real asset is the docs**; they serve humans, the assistant, and DIY users equally. Write the manual for humans first; the GPT is a cheap hat bolted on later.
- **Knowledge-file format:** retrieval (RAG) works on chunks, so favor **self-contained, well-headed sections** and **question-shaped FAQ entries** (best match for user questions). Plain language, define terms, include the alternate phrasings users actually type.
- **Manual set** (mostly repurposed Phase 9 docs): (1) Getting Started / first-run; (2) Fetching — bookmarklet + relay, *highest support volume*; (3) organizing mental model — Folders / Book Lists / Searches / Collections, "when to use which" (the USER-GUIDE lead); (4) how-to recipes (FAQ-shaped); (5) Backup & Restore; (6) Sync & devices; (7) Troubleshooting; (8) Privacy & Security. **New high-leverage additions:** (9) **Glossary**; (10) **"What ReaderWrangler is NOT / current limits"** — the single best hallucination-killer (explicit not-yet-features list). Plus **system instructions** (persona/scope: cite the docs, admit uncertainty, never invent features).
