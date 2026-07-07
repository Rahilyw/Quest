# RAHIL.BUILDS — The Bench (Month-Two Pipeline)
> The remaining 14 ideas: 12 expanded, 2 cut (with what to salvage).
> These slot into August using the same cadence: 2 reels (Tue/Fri) + 1–2 carousels (Sun/Wed) per week.

---

## Verdict table

| # | Idea | Verdict | Pillar | Format |
|---|------|---------|--------|--------|
| 4 | RAG explained | ✅ Expand | Teach | Field Notes carousel + reel |
| 8 | AI temperature | ✅ Expand (as THEN/NOW No.002) | Teach | THEN/NOW reel |
| 9 | Sentinel/Bolt prompts → skills, loops, plugins | ✅ Expand | Teach | Reel + checklist carousel |
| 10 | Microsoft Foundry | ❌ Cut | — | Salvage: one slide in the platforms post |
| 11 | Google AI Studio + dev program | ✅ Expand | Teach | Reel + carousel |
| 12 | Vertex AI | ❌ Cut | — | Salvage: merged into #11's platforms slide |
| 14 | Claude Code skills I use daily | ✅ Expand | Build+Teach | Reel |
| 15 | GitHub Student Developer Pack | ✅ Expand | Teach | Carousel (save-magnet) |
| 16 | Claude connectors | ✅ Expand (as MCP Part 2) | Teach | Reel + carousel |
| 17 | Antigravity + Cursor + Claude in tandem | ✅ Expand | Build+Signal | Spec Sheet reel + carousel |
| 19 | AI news for students | ✅ Expand (as recurring series) | Signal | Reel series |
| 20 | AI resources I actually use | ✅ Expand | Teach | Carousel (save-magnet) |
| 22 | Trying GitHub's most-starred repos | ✅ Expand (as a series) | Teach+Signal | Reel series |
| 23 | .md files explained | ✅ Expand | Teach | Field Notes carousel |

**Why Foundry (10) and Vertex (12) are cut:** both are enterprise platforms with sign-up friction, billing setup, and almost zero "I did this last night in my dorm" energy. Your audience is students on free tiers. Neither survives the litmus test — a Foundry walkthrough could not hang on a wall. Salvage: one comparison slide inside the Google AI Studio post ("the big platforms, and why you only need the free one"), which lets you sound informed about all three without spending a whole post on either. Revisit only if you land an internship where you use one daily — then it becomes a Build post with receipts, which is a different (better) post.

---

## The 12, expanded

### 04 · RAG, explained to university kids
**Pillar 02 · Field Notes No.003 · Early August (after agents + MCP have warmed the audience)**

The angle that beats every other RAG explainer: **open-book exam vs closed-book exam.** A plain LLM answers from memory (closed book — confident, sometimes wrong, cutoff date). RAG lets it look things up first (open book). Every student instantly gets this. No vector-space math on slide one.

**Carousel (Field Notes structure, 7 slides):**
- S1: Cover — "RAG: WHY AI STOPPED MAKING THINGS UP" — Playfair on cream, torn-paper strip
- S2: Q1 What is it — the open-book/closed-book split, drawn as two exam papers (halftone, hand-drawn ticks and crosses)
- S3: Q2 Why you care — "this is how ChatGPT reads your PDF, how NotebookLM works, how every 'chat with your docs' app exists." Connect it to tools they already use — RAG stops being abstract
- S4: Q3 How it works — THE diagram: your question → search the documents → stuff the best bits into the prompt → answer with receipts. Four boxes, arrows, mono labels. No embeddings talk until the caption
- S5: The secret slide — "vector search = finding notes by meaning, not keywords." One example: searching "why did my code crash" finds a note titled "null pointer exceptions"
- S6: Q4 Where it bites you — garbage in, garbage out; chunking gone wrong; "it can only be as smart as your documents"
- S7: CTA + resources — your genuinely-ranked top 3 free tutorials (this is the save-trigger; you promised "top resources online" in the original idea — deliver exactly 3, ranked, with one-line reasons)

**Companion reel (30s):** you build a toy RAG over your own lecture notes on screen, sped up. "I gave AI my lecture notes and now it answers like it attended." End on it citing an actual page.

**Hooks:**
- "AI used to take every exam closed-book. RAG handed it the textbook."
- "How ChatGPT actually reads your PDF (it's not what you think)."
- "I made an AI that only answers from MY lecture notes."

**Prep:** build the toy demo over real notes from one of your courses (screen-record everything). Vet the 3 tutorials personally — recommending one you haven't done is the fastest way to burn trust.

---

### 08 · AI temperature — THEN/NOW No.002
**Pillar 02 · THEN/NOW reel · August, ~2 weeks after No.001**

Too thin for a standalone explainer (the July doc said so), exactly right as the second entry in your franchise. The prop: an old dial thermostat or a radio with an analog dial (charity shop, same run as the MCP cables).

**Reel beat sheet (25–30s):**
1. Hook (0–3s): close-up, your hand turning a physical dial. "This dial exists inside every AI you use."
2. THEN: analog dial — one knob, predictable at one end, chaotic at the other
3. Match-cut NOW: temperature slider in an API playground, same gesture
4. The demo that carries the post: same prompt, temp 0 vs temp 1.5, side by side on cream cards. Temp 0: same answer every time. Temp 1.5: word salad. Show, don't tell
5. The teach beat: "Low temp for code and facts. High temp for brainstorms and names. That's the whole lesson."
6. End card: "THEN/NOW · No.002"

**Hooks:**
- "Your AI has a chaos dial. Most people never touch it."
- "Same prompt. Two answers. One number changed."
- "The one AI setting that explains why ChatGPT sometimes loses its mind."

**Prep:** buy the dial prop. Record the temp-0/temp-1.5 comparison in Google AI Studio (free, visual slider — and it quietly sets up post #11). Pick a prompt where the difference is funny, not subtle.

---

### 09 · Steal these prompts — turning great prompts into skills, loops, and plugins
**Pillar 02 · Reel + checklist carousel · Mid-August (after #14 establishes what a "skill" is)**

The real idea underneath "Jules sentinel prompt plus Bolt prompt": **great system prompts are portable.** Find a prompt that makes one AI great → extract the pattern → install it as a reusable skill/loop/plugin in YOUR stack. That's a genuinely advanced workflow almost nobody is teaching, framed as something anyone can do.

**Reel beat sheet (45s):**
1. Hook: "The best AI companies write million-dollar prompts. They're sitting in public repos."
2. Show the artifact: scroll a real leaked/published system prompt (Jules' sentinel, Bolt's) — highlight 2 specific lines and say WHY they work ("look — it tells the model what NOT to do first")
3. The move: lift the pattern → paste into a skill file → now Claude Code does it on every run
4. Live proof: trigger your new skill, show it firing
5. CTA: "The 4-step extraction checklist is in the carousel."

**Carousel:** "PROMPT HEIST — FIELD MANUAL" styling (vintage instruction-manual aesthetic, mono numbered steps). S2: where to find great prompts (repos, docs, published system prompts). S3: what to look for (constraints, role, output format, refusal rules). S4: skill vs loop vs plugin — one-line definitions, when each fits. S5: the 4-step port checklist (save slide). S6: the ethics/reality line — "patterns aren't secrets; verbatim copying of proprietary prompts is a jerk move. Steal like an engineer: learn the structure, write your own."

**Hooks:**
- "I steal prompts from billion-dollar AI companies. Legally."
- "Bolt's system prompt taught me more than my prompt engineering course."
- "Great artists steal. Great AI engineers read system prompts."

**Prep:** pick the 2 specific lines you'll highlight and have a real reason each works. Actually build the ported skill and use it for a week first so the demo is honest. Keep the sourcing clean — use officially published or openly licensed prompts.

---

### 11 · Google AI Studio + the free dev program (and why you can skip the big platforms)
**Pillar 02 · Reel + carousel · Mid-August**

The frame: **"the free tier that's actually a full lab."** This post also absorbs Foundry and Vertex as a single comparison slide, which makes you look informed rather than sponsored.

**Reel beat sheet (40s):**
1. Hook: "Google gives students a full AI lab for free and nobody's using it."
2. Speed-tour: AI Studio — try models instantly, the temperature/settings playground (callback to THEN/NOW No.002), get an API key in one click, free tier limits that are genuinely usable
3. "How I'm using it": one real thing from YOUR workflow (prototyping prompts before they go into Quest!/your pipeline — whatever is true)
4. The platforms beat (Foundry/Vertex salvage): "You'll hear about Vertex and Azure Foundry. Those are for when a company pays you. This is for now." One comparison card, three logos, one line each
5. CTA: "Free-tier setup steps in the carousel."

**Carousel:** setup walkthrough + a "WHAT'S ACTUALLY FREE" spec table (mono, ✓/✕ columns — the save slide) + the student dev program perks if you're in it.

**Hooks:**
- "Google is handing students a free AI lab. Here's the door."
- "Stop paying for AI APIs before you've used the free ones."
- "Vertex? Foundry? AI Studio? A student's guide to which Google/Microsoft AI thing you actually need."

**Prep:** confirm current free-tier limits the week you post (they change; a stale number in a tutorial is a credibility hit). Screenshot your own real usage in AI Studio.

---

### 14 · Claude Code skills I use every day
**Pillar 01+02 · Reel · Early August (sets up #9)**

Straight from your real setup — this is a Build post wearing a Teach hat. Show 3 skills max (restraint rule applies to content too): e.g. your learning-buddy skill, plus the two you genuinely trigger most.

**Reel beat sheet (40s):**
1. Hook: "I taught my AI three tricks and now I can't work without them."
2. Per skill (~10s each): the trigger phrase typed on screen → what happens → the one-line "why this saves me an hour"
3. The learning-buddy skill is your emotional closer — an AI that refuses to give you the answer and Socratically teaches you instead is a genuinely surprising beat for people who think AI = cheating
4. CTA: "Want the skill files? Comment SKILLS." (pinned comment or auto-DM with a gist link)

**Hooks:**
- "My AI refuses to give me answers. I built it that way."
- "3 custom AI skills I use more than any app on my phone."
- "You're using Claude like a chatbot. I use it like a team."

**Prep:** clean up the 3 skill files into a shareable gist BEFORE posting (the comment CTA only works if fulfillment is instant). Record each trigger fresh — real terminal, real output.

---

### 15 · The GitHub Student Developer Pack — free stuff audit
**Pillar 02 · Carousel · Early August — save-magnet #2**

The pack bundles thousands of dollars of free tools for anyone with a student email. Your angle: **an audit, not an ad.** Most pack posts list everything; you rank what's actually worth claiming.

**Carousel (7 slides, vintage mail-order-catalog styling — "FREE TO STUDENTS" starburst, hand-cut coupon edges):**
- S1: Cover — "YOUR STUDENT EMAIL IS WORTH $[real number you tally]. MOST OF YOU NEVER CASH IT."
- S2: What the pack is + the 2-minute eligibility check
- S3–4: THE TOP 5, ranked, with the dollar value and the one-line honest reason ("Copilot Pro free — this alone is $100/yr")
- S5: The trap slide — perks that auto-bill after the student period, trials in disguise. Nobody else includes this; it's your trust differentiator
- S6: MONO CHECKLIST — claim order, links, time required (the save slide)
- S7: CTA — "Send this to a fresher. Their email is worth more than they think."

**Hooks:**
- "Your university email is worth $[n] and you're using it for lecture PDFs."
- "GitHub gives students thousands in free tools. I ranked what's actually worth it."
- "The free student pack audit nobody sponsored."

**Prep:** claim/verify the top 5 yourself with your own student email, screenshot each. Tally a defensible dollar figure — that number is the hook, so be able to show the math in comments.

---

### 16 · Claude connectors — MCP Part 2: okay, but what do I DO with it?
**Pillar 02 · Reel + carousel · August, 2–3 weeks after the July MCP post**

The July MCP post explains the protocol; this one is the payoff. Frame: **"last month I told you about the USB port. Here's what I plugged in."** Sequel framing rewards followers and converts new viewers back to the original (drop the link in comments).

**Reel beat sheet (40s):**
1. Hook: "I gave my AI access to my calendar, my email, and my database. Here's what happened."
2. Three real connector demos, ~8s each, from YOUR actual setup — e.g.: Claude reads the Supabase schema and writes a migration; Claude checks your calendar and plans your build week; one more that's visually obvious
3. The trust beat: "Rule I follow: read access freely, write access grudgingly. Here's the one connector I refused." (name it and say why — this beat is the whole post's credibility)
4. CTA: "Setup for each one in the carousel."

**Carousel:** one connector per slide, spec-callout styling — what it connects, 3 setup steps, the permission it asks for, your safety note. Final slide: the read/write rule as a poster-worthy card.

**Hooks:**
- "Your AI can finally touch your real life. Choose carefully what it touches."
- "I connected Claude to everything I own. One connector didn't make the cut."
- "MCP was the port. These are the plugs."

**Prep:** pick 3 connectors you demonstrably use (your Supabase MCP is real and visual — lead with it). Rehearse the demos; live-tool demos fail on camera, so record real runs, don't fake and don't improvise.

---

### 17 · Antigravity + Cursor + Claude Code in tandem — the relay team
**Pillar 01+03 · Spec Sheet reel + carousel · Late August — the pipeline post's sequel**

July's tier list said "wrong question — they're teammates." This post is the proof: your actual multi-tool pipeline, presented like a relay team on a vintage athletics program. Each tool runs its leg; the baton is your repo.

**Reel beat sheet (50–60s):**
1. Hook: "Everyone's fighting about which AI coding tool is best. I made mine work together."
2. The relay diagram (Spec Sheet styling): which tool takes which leg — e.g. one for exploration/planning, one for in-editor iteration, Claude Code for the pipeline runs and review. Map YOUR real division of labor, not a theoretical one
3. The handoff mechanics — the actual interesting part nobody covers: how context moves between tools (the repo itself, .md files, specs). One concrete example: "Cursor edits it, my Claude pipeline reviews it, the spec file is the baton"
4. The honest beat: what this costs per month, and when one tool alone is enough ("if you're on your first project, you don't need this — one tool, free tier, go")
5. CTA: "Full relay map in the carousel. And the tier list from last month is pinned if you're picking your first one."

**Carousel:** the relay map as a foldout-poster-style spec sheet — tools as team members with mono stat blocks (role, cost, strengths, "hands off when…"). This is the post 02 + post 09-tier-list crossover; your content compounds.

**Hooks:**
- "Stop picking one AI tool. Build a relay team."
- "My code passes through 3 different AIs before I ship it."
- "Cursor vs Claude vs Antigravity is the wrong fight. Here's the alliance."

**Prep:** this only works if the tandem workflow is real and rehearsed — run it for 2+ weeks first. Note the .md-files handoff mechanic here also plants the seed for post #23.

---

### 19 · AI news, but for students — recurring Signal series
**Pillar 03 · Reel series, 1–2×/month · Start late August, only after the audience exists**

The format: **"THE BULLETIN"** — vintage newspaper/newsreel styling, dateline in Space Mono, red accent for the date stamp. Your filter is the moat: not "OpenAI announced X" but "here's what X changes about your degree, your internship hunt, your projects."

**Repeatable beat sheet (30–40s):**
1. Cold open: the week's ONE story (resist roundups — one story, fully translated, beats five headlines)
2. "What happened" in two sentences, zero jargon
3. "What it means for you if you're a student" — the segment that IS the series. Concrete: does this change what you should learn? build? put on a resume?
4. Your one-line take (this is Pillar 03 — have a spine, make it quotable)
5. End card: "THE BULLETIN · No.###"

**Hooks (formula: [news event] + "what it actually means for students"):**
- "Everyone's covering [X]. Nobody's telling students what it changes."
- "[Company] just [did thing]. Here's whether your degree still matters. (Yes. But—)"

**Prep:** build the BULLETIN template once. Batch-friendly: when news drops, you can go from script to posted in ~2 hours because the frame is pre-built. Discipline rule: skip weeks with no story that passes the "changes something for students" bar — a forced bulletin dilutes the series.

---

### 20 · The AI resources I actually use — free-course audit
**Pillar 02 · Carousel · Mid-August — save-magnet #3**

Anthropic's courses, Google's tutorials, the handful of things that actually moved you. Same audit ethic as #15: **ranked, personal, receipts.** The differentiator vs. every "10 FREE AI COURSES 🤯" post: you show YOUR completion screenshots and say what each one actually got you.

**Carousel (7 slides, vintage library-card / university-syllabus styling — stamped card edges, mono catalog numbers):**
- S1: Cover — "MY AI SYLLABUS — everything free, everything I actually finished"
- S2–5: One resource per slide: what it teaches, hours it really takes, "what I built because of it," and a letter grade. Include one negative grade — a famous resource you found overrated. The negative review is what makes the positive ones believable
- S6: The order to take them in (beginner → your level) — the save slide
- S7: CTA — "Save this. It's the syllabus I wish I had in first year."

**Hooks:**
- "I finished the free AI courses so you can skip the bad ones."
- "My entire AI education cost $0. Here's the syllabus, in order."
- "One of the most recommended AI courses on the internet is a waste of your time."

**Prep:** only include resources you genuinely finished — screenshot completion/certificates. Choose the overrated pick carefully: punch up (famous resource), critique specifically, stay fair.

---

### 22 · Trying GitHub's most-starred repos — series
**Pillar 02+03 · Reel series · Start late August, alternate with #08's viral apps series**

Same engine as the viral-apps series (and it reuses the verdict stamps): everyone stars trending repos, nobody actually sets them up. You do the setup on camera, hit the real errors, and issue a verdict. "gstack" or whatever tops trending that week — the series survives any individual repo.

**Repeatable beat sheet (45–60s, one repo per episode):**
1. Hook: "This repo got [n] stars this month. I bet most of them never ran it."
2. The claim: what the README promises, in one line
3. THE SETUP, honestly: sped-up install, and — critically — the first error you hit and the fix. The error IS the content; that's what no tutorial shows and exactly why people watch
4. The moment of truth: does it do the thing?
5. Stamp verdict + "who should actually use this" (one specific persona)

**Hooks:**
- "[n],000 stars. Zero setup guides that work. I fixed that."
- "I set up GitHub's most hyped repo so you don't lose a Saturday to it."
- "Star-to-actually-works ratio: investigated."

**Prep:** pick episode 1's repo by what's genuinely trending the week you film (evergreen enough to survive a week's delay). Record the ENTIRE setup including failures — the temptation to cut the errors is exactly wrong. Budget a real Saturday per episode; this is your highest-effort, highest-payoff series.

---

### 23 · The .md files that run my projects
**Pillar 02 · Field Notes carousel · Late August (after #17 plants the "files as baton" idea)**

claude.md, readme.md, product.md, design.md, skill.md — the angle: **"the instruction manuals my AI reads before it touches my code."** Markdown files as the paper trail of an AI-first project. This is peak brand: literal documents, on a paper-themed feed.

**Carousel (Field Notes structure, 7 slides — style each file as a physical manila-folder tab, hand-labeled, slight rotation):**
- S1: Cover — "MY CODEBASE HAS A PAPER TRAIL" — folder tabs fanned out on cream
- S2: README.md — for humans; the front door
- S3: CLAUDE.md — for the AI; house rules, "how we do things here." Show 3 real lines from YOUR CLAUDE.md (real Quest! rules — the specificity is the value)
- S4: product.md / design.md — the spec files; the pipeline's baton (callback to #02 and #17)
- S5: skill.md — teaching the AI a repeatable trick (callback to #14)
- S6: The system view — the diagram: which file each stage of your pipeline reads. One drawing that ties the whole month together
- S7: CTA — "Starter templates for all five: comment DOCS."

**Hooks:**
- "My AI reads the manual before it writes code. I wrote the manual. Here it is."
- "5 text files run my entire project. No, really."
- "The most important code in my app isn't code."

**Prep:** sanitize and template your real files into a shareable gist for the comment CTA. Slide 6's diagram doubles as a future standalone post — design it at poster quality (litmus test: it should literally hang on a wall).

---

## Rough August slotting

Same rhythm — Reels Tue/Fri, carousels Sun (+optional Wed). Ordering respects dependencies (skills before prompt-heist, MCP sequel after the July original, relay team after the tier list):

| Week | Reel 1 (Tue) | Reel 2 (Fri) | Carousel (Sun) | Optional (Wed) |
|------|-------------|--------------|----------------|----------------|
| Aug 3–9 | **#14 Daily Claude skills** | **Quest! Build Log EP.03** | **#15 Student Dev Pack audit** | — |
| Aug 10–16 | **#08 THEN/NOW No.002: temperature** | **#04 RAG demo reel** | **#04 RAG Field Notes** | **#20 AI syllabus** |
| Aug 17–23 | **#16 Connectors (MCP Pt 2)** | **#09 Prompt heist** | **#16 Connectors setup carousel** | **#11 AI Studio carousel** (reel Fri wk4 if needed) |
| Aug 24–30 | **#22 Starred repos EP.01** | **#17 Relay team** | **#23 The .md paper trail** | **#17 Relay map carousel** |

**#19 THE BULLETIN** floats — launch it the first week a story genuinely earns it; it replaces that week's weakest slot rather than adding a post.

**Series inventory after two months:** Build Log (EP.01–03) · THEN/NOW (No.001–002) · Field Notes (No.001–004) · Viral Apps (EP.01) · Starred Repos (EP.01) · The Bulletin (No.001) — six repeatable franchises, every one refillable forever. That's the machine.
