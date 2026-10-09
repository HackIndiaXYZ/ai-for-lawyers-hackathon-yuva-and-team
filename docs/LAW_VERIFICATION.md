# Law library: entries still to be checked

Sandhi's law library has **48 provisions**. **13 of them** were written from general knowledge and have **not** yet been checked against the official text. They are marked `verify: true` in `src/data/lawLibrary.ts`, and the app shows a "verify" badge on them.

**Do this before any demo or real use.** It takes about one hour.

## How to check one entry

1. Open India Code: <https://www.indiacode.nic.in/> (the Government of India's official database of Acts).
2. Search for the Act named in the table below and open the section.
3. Read the section. Compare it with the two columns **What Sandhi says** and **What can happen**.
4. If they agree, tick the box. If something is wrong or out of date, fix the wording in `src/data/lawLibrary.ts`.
5. When an entry is correct, change `verify: true` to `verify: false` for that ID, then save to both repos.

Where a provision replaced an older law (for example the Bharatiya Nyaya Sanhita 2023 replaced the Indian Penal Code), confirm the new section number, not the old one. Where a state law is involved (Telangana), also check the Telangana government's gazette for amendments.

## The entries

| Done | ID | Act | Section | Title |
|---|---|---|---|---|
| [ ] | `CON-300A` | Constitution of India | Article 300A | Right to property |
| [ ] | `TPA-108` | Transfer of Property Act 1882 | s.108 | Landlord and tenant duties |
| [ ] | `TRC-10` | Telangana Buildings (Lease, Rent and Eviction) Control Act 1960 | s.10 | Eviction of tenants |
| [ ] | `MTA-2021` | Model Tenancy Act 2021 | whole Act (model law) | The central model tenancy law |
| [ ] | `CPA-2` | Consumer Protection Act 2019 | s.2(46) | Unfair contracts with consumers |
| [ ] | `BNS-318` | Bharatiya Nyaya Sanhita 2023 | s.318 | Cheating |
| [ ] | `BNS-316` | Bharatiya Nyaya Sanhita 2023 | s.316 | Criminal breach of trust |
| [ ] | `BNS-336` | Bharatiya Nyaya Sanhita 2023 | s.336 | Forgery |
| [ ] | `BSA-94` | Bharatiya Sakshya Adhiniyam 2023 | ss.94 and 95 (earlier Evidence Act ss.91 and 92) | Written terms prevail over oral promises |
| [ ] | `MVA-50` | Motor Vehicles Act 1988 | ss.50 and 51 | Transferring a vehicle |
| [ ] | `GRA-4` | Payment of Gratuity Act 1972 | s.4 | Gratuity |
| [ ] | `LAB-CODES` | Labour codes | Codes on Wages, Industrial Relations, Social Security and OSH | The new labour codes |
| [ ] | `DPDP-ACT` | Digital Personal Data Protection Act 2023 | whole Act | Personal data |

## Details, one by one

### `CON-300A`: Right to property

- **Act:** Constitution of India
- **Section:** Article 300A
- **What Sandhi says:** No person can be deprived of property except by authority of law. A private clause cannot let one party seize property or evict someone without following the legal process.
- **What can happen:** Locking out a tenant, seizing goods or taking possession without a court or lawful process can be challenged and may be unlawful.
- **Check:** [ ] section number is right   [ ] wording is accurate   [ ] not repealed or replaced   [ ] set `verify: false`

### `TPA-108`: Landlord and tenant duties

- **Act:** Transfer of Property Act 1882
- **Section:** s.108
- **What Sandhi says:** The landlord must disclose known material defects and allow quiet possession. The tenant must pay rent, use the property properly and not damage it. Ordinary wear and tear is not the tenant's liability.
- **What can happen:** Charging a tenant for old damage, or entering at will, can breach the landlord's own duties.
- **Check:** [ ] section number is right   [ ] wording is accurate   [ ] not repealed or replaced   [ ] set `verify: false`

### `TRC-10`: Eviction of tenants

- **Act:** Telangana Buildings (Lease, Rent and Eviction) Control Act 1960
- **Section:** s.10
- **What Sandhi says:** In areas where it applies, a landlord can evict only on the grounds listed in the Act, such as non-payment of rent, subletting, misuse or genuine own need, and only through the Rent Controller. Buildings above a notified rent level may fall outside the Act, so check whether it applies.
- **What can happen:** Where the Act applies, a clause allowing eviction 'at any time' cannot override these grounds.
- **Check:** [ ] section number is right   [ ] wording is accurate   [ ] not repealed or replaced   [ ] set `verify: false`

### `MTA-2021`: The central model tenancy law

- **Act:** Model Tenancy Act 2021
- **Section:** whole Act (model law)
- **What Sandhi says:** A model law for states to adopt. It proposes a written tenancy agreement, a residential security deposit of at most two months' rent, and three months' written notice for a rent increase. It binds only where a state enacts it, and to our knowledge Telangana has not.
- **What can happen:** Where it is not in force these limits are guidance, but a very high or non-refundable deposit is a sign of an unfair term.
- **Check:** [ ] section number is right   [ ] wording is accurate   [ ] not repealed or replaced   [ ] set `verify: false`

### `CPA-2`: Unfair contracts with consumers

- **Act:** Consumer Protection Act 2019
- **Section:** s.2(46)
- **What Sandhi says:** In contracts for goods and services with consumers, terms are unfair if they cause a significant imbalance, such as excessive security deposits, disproportionate penalties, refusal to accept early repayment, or unilateral termination without cause. This generally does not cover a landlord and tenant.
- **What can happen:** A consumer commission can declare such terms null and void.
- **Check:** [ ] section number is right   [ ] wording is accurate   [ ] not repealed or replaced   [ ] set `verify: false`

### `BNS-318`: Cheating

- **Act:** Bharatiya Nyaya Sanhita 2023
- **Section:** s.318
- **What Sandhi says:** Cheating by dishonestly inducing someone to hand over money or property is a criminal offence. The BNS replaced the Indian Penal Code from 1 July 2024 (the old IPC s.420).
- **What can happen:** Taking an advance or deposit on a false promise can lead to criminal prosecution, with imprisonment of up to seven years for the aggravated form.
- **Check:** [ ] section number is right   [ ] wording is accurate   [ ] not repealed or replaced   [ ] set `verify: false`

### `BNS-316`: Criminal breach of trust

- **Act:** Bharatiya Nyaya Sanhita 2023
- **Section:** s.316
- **What Sandhi says:** Dishonestly misusing property or money entrusted to you, such as a deposit or client funds, is a criminal offence (old IPC s.406).
- **What can happen:** It can lead to imprisonment and a fine in addition to civil recovery.
- **Check:** [ ] section number is right   [ ] wording is accurate   [ ] not repealed or replaced   [ ] set `verify: false`

### `BNS-336`: Forgery

- **Act:** Bharatiya Nyaya Sanhita 2023
- **Section:** s.336
- **What Sandhi says:** Creating a false document or signature to cause damage or to support a claim is forgery (old IPC ss.463 to 471).
- **What can happen:** Forged or backdated documents can lead to prosecution and can make the contract unenforceable.
- **Check:** [ ] section number is right   [ ] wording is accurate   [ ] not repealed or replaced   [ ] set `verify: false`

### `BSA-94`: Written terms prevail over oral promises

- **Act:** Bharatiya Sakshya Adhiniyam 2023
- **Section:** ss.94 and 95 (earlier Evidence Act ss.91 and 92)
- **What Sandhi says:** When the terms of a contract are in writing, oral evidence generally cannot be used to contradict, vary or add to them.
- **What can happen:** Anything promised verbally but left out of the written contract may be impossible to enforce.
- **Check:** [ ] section number is right   [ ] wording is accurate   [ ] not repealed or replaced   [ ] set `verify: false`

### `MVA-50`: Transferring a vehicle

- **Act:** Motor Vehicles Act 1988
- **Section:** ss.50 and 51
- **What Sandhi says:** The seller must report the transfer to the registering authority within 14 days, and the buyer must apply for transfer of the registration within 30 days. A vehicle under a hire-purchase or loan needs the financier's no-objection before transfer (s.51).
- **What can happen:** If the transfer is not recorded, the seller can stay answerable for challans and accidents, and the buyer may be unable to insure or resell.
- **Check:** [ ] section number is right   [ ] wording is accurate   [ ] not repealed or replaced   [ ] set `verify: false`

### `GRA-4`: Gratuity

- **Act:** Payment of Gratuity Act 1972
- **Section:** s.4
- **What Sandhi says:** An employee who completes five years of continuous service is entitled to gratuity on retirement, resignation or death (the five-year rule does not apply on death or disability). The right cannot be signed away. The labour codes may now restate this, so check the current provision.
- **What can happen:** A clause denying or waiving gratuity is ineffective.
- **Check:** [ ] section number is right   [ ] wording is accurate   [ ] not repealed or replaced   [ ] set `verify: false`

### `LAB-CODES`: The new labour codes

- **Act:** Labour codes
- **Section:** Codes on Wages, Industrial Relations, Social Security and OSH
- **What Sandhi says:** Parliament consolidated 29 labour laws into four codes. They were reported to come into force in November 2025, so older Acts such as the Minimum Wages Act, Payment of Wages Act and EPF Act may now be replaced or restated.
- **What can happen:** Check which provision applies today before relying on older section numbers or on a salary below the notified minimum wage.
- **Check:** [ ] section number is right   [ ] wording is accurate   [ ] not repealed or replaced   [ ] set `verify: false`

### `DPDP-ACT`: Personal data

- **Act:** Digital Personal Data Protection Act 2023
- **Section:** whole Act
- **What Sandhi says:** Personal data may be processed only for lawful purposes with the person's consent or another permitted ground, and the organisation handling it must keep it secure and use it only for the stated purpose. The rules under the Act are being phased in.
- **What can happen:** Careless handling of customer or employee data can attract heavy penalties under the Act.
- **Check:** [ ] section number is right   [ ] wording is accurate   [ ] not repealed or replaced   [ ] set `verify: false`

---
Sandhi is an assistant, not a lawyer. Even after these checks, a qualified advocate should review anything that matters.
