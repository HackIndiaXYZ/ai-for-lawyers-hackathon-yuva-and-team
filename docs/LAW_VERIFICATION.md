# Law library: entries still to be checked

Sandhi's law library has **53 provisions**. **16 of them** are marked `verify: true` in `src/data/lawLibrary.ts`: they were written from general knowledge, or the sources found disagree, and the app shows a "Verify" badge on them.

**Cross-checked on 11 Oct 2026** (against published copies, because India Code blocks automated reading): ICA-74, TPA-105, TPA-106, TPA-107, TPA-108, REG-17, REG-23, REG-49, CRA-17, CRA-19. Their pages show the source. Please still confirm them on https://indiacode.gov.in before a real signing.

## How to check one entry
1. Open India Code: <https://www.indiacode.nic.in/> (it now redirects to indiacode.gov.in).
2. Search for the Act and open the section.
3. Compare it with what Sandhi says. If it agrees, change `verify: true` to `verify: false` for that ID in `src/data/lawLibrary.ts`. If not, fix the wording.
4. Where a newer law replaced an older one, confirm the NEW section number.

## The entries
| Done | ID | Act | Section | Title |
|---|---|---|---|---|
| [ ] | `CON-300A` | Constitution of India | Article 300A | Right to property |
| [ ] | `TRC-10` | Telangana Buildings (Lease, Rent and Eviction) Control Act 1960 | s.10 | Eviction of tenants |
| [ ] | `MTA-2021` | Model Tenancy Act 2021 | whole Act (model law) | The central model tenancy law |
| [ ] | `CPA-2` | Consumer Protection Act 2019 | s.2(46) | Unfair contracts with consumers |
| [ ] | `BNS-318` | Bharatiya Nyaya Sanhita 2023 | s.318 | Cheating |
| [ ] | `BNS-316` | Bharatiya Nyaya Sanhita 2023 | s.316 | Criminal breach of trust |
| [ ] | `BNS-336` | Bharatiya Nyaya Sanhita 2023 | s.336 | Forgery |
| [ ] | `BSA-94` | Bharatiya Sakshya Adhiniyam 2023 | ss.94 and 95 | Written terms prevail over oral promises |
| [ ] | `MVA-50` | Motor Vehicles Act 1988 | ss.50 and 51 | Transferring a vehicle |
| [ ] | `GRA-4` | Payment of Gratuity Act 1972 / Code on Social Security 2020 | s.4 / ss.53 to 58 | Gratuity (sources disagree on which governs) |
| [ ] | `LAB-CODES` | Labour codes | four codes | Notified 21 Nov 2025; state rules still pending |
| [ ] | `DPDP-ACT` | Digital Personal Data Protection Act 2023 | whole Act | Personal data |
| [ ] | `TPA-111` | Transfer of Property Act 1882 | s.111 | How a lease ends |
| [ ] | `SSC-53` | Code on Social Security 2020 | s.53 | Gratuity under the Code |
| [ ] | `MSMED-15` | MSMED Act 2006 | ss.15, 16 | Late payment to micro and small suppliers |
| [ ] | `TAX-TDS` | Income-tax Act 2025 and GST law | various | Tax on fees and rent (section numbers changed from 1 April 2026) |
