# The Indian law rulebook

Sandhi now has a **rulebook**: for each kind of document, a list of what Indian law expects it to contain, what it must never contain, and what only a person can do. It lives in `src/data/rulebook.ts`. Every rule points at provisions in the law library, so the page can show where it comes from.

## What it does
1. **Before drafting (live AI):** the rulebook is added to the drafting instructions. The AI must include each required element, leave out void clauses (and say why in "Before you sign"), and list the person's own to-dos.
2. **After drafting (demo and live):** the draft is checked against the same rulebook and an **Indian law checklist** appears under the contract: *Included*, *Missing*, *Not allowed here* or *You must check*. If anything is missing or not allowed, the "Please have an advocate review this before you sign" banner shows.
3. **Law library tab:** provisions cross-checked this session show the date and where they were checked.

## What it covers
- Every document: parties, payment/value, dispute resolution (no one-sided or court-barring clauses, s.28), governing law, severability, signatures and two witnesses, no penalty beyond reasonable compensation (s.74), stamping.
- Rent: property, rent, deposit, term, notice (TPA s.106), landlord/tenant duties (s.108), returning possession, no eviction at will, registration for leases over a year (TPA s.107, Registration Act ss.17, 23, 49), Telangana rent law check.
- Freelance: scope, fee and payment time, copyright assignment in a signed writing naming work, rights, period and territory (Copyright Act s.19), independent contractor, no post-contract non-compete (s.27), GST/TDS, micro/small enterprise payment limits.
- NDA: definition, exclusions, duty, term, return, disclosure required by law, no ban on doing business, no fixed penalties, personal data.
- Employment: role, pay (minimum wage), probation, notice, leave, statutory benefits, work created, no post-employment non-compete, no waiver of gratuity/PF, bond limits.
- Sale: item, price and payment, handover, title, condition, and for vehicles transfer of registration (Forms 29/30, 14 and 30 days) and challans.

## What it does NOT do
- It does not contain all of Indian law. It covers the five document types Sandhi supports.
- It matches wording automatically. A clause can pass and still need a lawyer.
- It never quotes a stamp-duty rate. Rates change and the sources found disagreed with each other, so the checklist tells the person to confirm with the Telangana Registration and Stamps Department.
- Gratuity: sources disagree on whether the 1972 Act or the Code on Social Security 2020 governs after the labour codes (reported in force from 21 Nov 2025). The checklist says so instead of guessing.

## Adding or changing a rule
Edit `src/data/rulebook.ts`. A rule has an id, a kind (`clause`, `forbid` or `confirm`), a title, what is needed, library IDs, and patterns for clause and forbid rules. Run `npm test`: it checks that every cited ID exists and that the sample drafts pass their own rulebook.
