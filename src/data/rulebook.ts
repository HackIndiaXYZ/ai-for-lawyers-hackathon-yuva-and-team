import type { ContractCode } from "./lawLibrary";

/**
 * Sandhi's rulebook: what Indian law expects a given kind of document to contain or avoid.
 * Every rule points at provisions in the law library, so the page can show where it comes from.
 *
 * - "clause": the draft must contain this. Sandhi checks for it and says if it is missing.
 * - "forbid": the draft must NOT contain this, because the law makes it void or unenforceable.
 * - "confirm": something only a person can do or check (stamping, registration, tax). Always shown.
 */
export type RuleKind = "clause" | "forbid" | "confirm";

export interface Rule {
  id: string;
  kind: RuleKind;
  title: string;
  /** For clause and forbid: what the document must say or avoid. For confirm: what the person must do. */
  need: string;
  /** IDs from the law library. */
  law: string[];
  /** The rule is met (clause) or broken (forbid) when ANY pattern matches the lower-cased clause text. */
  any?: RegExp[];
  /** The rule only matters when the text matches one of these (for example, a vehicle sale). */
  onlyIf?: RegExp[];
}

const COMMON: Rule[] = [
  { id: "parties", kind: "clause", title: "Both parties are named", need: "Names (and addresses) of every party and the role each plays.", law: ["ICA-10", "ICA-11"], any: [/\bbetween\b[^.]{0,400}\band\b/, /\(the \*\*/] },
  { id: "consideration", kind: "clause", title: "Payment or value is stated", need: "What each side gives in return, so the promise is not for nothing.", law: ["ICA-10", "ICA-25"], any: [/\brent of\b/, /\bfee\b/, /\bprice\b/, /\bsalary\b/, /\bconsideration\b/, /\bremuneration\b/, /\bmutual (promises|obligations)\b/, /\bpay(s|ment)?\b/] },
  { id: "disputes", kind: "clause", title: "How disputes are settled", need: "A fair arbitration or court clause. One side must not decide alone, and courts must not be shut out.", law: ["ARB-7", "ICA-28"], any: [/arbitrat/, /jurisdiction/, /courts? (at|of|in)\b/] },
  { id: "law", kind: "clause", title: "Governing law", need: "That the laws of India apply, with a named place for the courts.", law: ["CPC-16"], any: [/governed by the laws? of india/, /laws of india/] },
  { id: "severability", kind: "clause", title: "If one clause fails, the rest stands", need: "A severability line so one invalid clause does not undo the whole agreement.", law: ["ICA-23"], any: [/severab/, /rest (of this agreement )?remains? in force/, /remain(s)? in (full )?force/] },
  { id: "witnesses", kind: "clause", title: "Signatures and two witnesses", need: "Signature lines for each party and two witnesses.", law: ["BSA-94", "ITA-10A"], any: [/^sign:\s*witness 2/m] },
  { id: "void-remedies", kind: "forbid", title: "No clause that shuts out the courts or makes one side's decision final", need: "Remove wording such as \"the decision of the landlord/company is final\" or \"no court may hear disputes\".", law: ["ICA-28"], any: [/decision (of [^.\n]{0,40})?(shall be|is) final/, /sole discretion[^.\n]{0,40}final/, /no court (shall|may|can)/, /waives? (all|any) right to (approach|sue|go to) (a )?court/] },
  { id: "penalty", kind: "forbid", title: "No penalty beyond reasonable compensation", need: "Replace \"forfeit the entire deposit\" or a fixed heavy fine with compensation for proven loss.", law: ["ICA-74"], any: [/forfeit[^.\n]{0,50}(entire|whole|full|all)[^.\n]{0,30}(deposit|advance|amount|fee)/, /non-?refundable (security )?deposit/, /(entire|whole|full) (security )?deposit (is|shall be) forfeited/] },
  { id: "stamp", kind: "confirm", title: "Stamp the document properly", need: "Check today's stamp duty for this kind of document with the Telangana Registration and Stamps Department, and use stamp paper or an e-stamp for that amount BEFORE anyone signs. Rates change, so Sandhi does not quote one.", law: ["STAMP-35"] },
];

const RENT: Rule[] = [
  { id: "r-property", kind: "clause", title: "The property is described", need: "Full address and that the use is residential.", law: ["TPA-105"], any: [/\bpremises\b/, /\bproperty (at|situated)/, /residential/] },
  { id: "r-rent", kind: "clause", title: "Rent amount and due date", need: "How much, and by which day each month.", law: ["ICA-29", "TPA-108"], any: [/rent of/, /per month/] },
  { id: "r-deposit", kind: "clause", title: "Deposit and when it is returned", need: "Deposit amount, deductions allowed, and a refund deadline.", law: ["ICA-74", "MTA-2021"], any: [/security deposit/, /deposit of/] },
  { id: "r-term", kind: "clause", title: "How long the tenancy lasts", need: "Start date and length, which also decides whether registration is compulsory.", law: ["TPA-107", "REG-17"], any: [/runs for/, /\bterm\b/, /period of/, /\d+ months?/] },
  { id: "r-notice", kind: "clause", title: "Notice to end the tenancy", need: "A written notice period for both sides. The default is at least 15 days for a monthly tenancy.", law: ["TPA-106", "TPA-111"], any: [/written notice/, /notice (period|of)/, /days' notice/] },
  { id: "r-duties", kind: "clause", title: "Landlord and tenant duties", need: "Repairs, defects, use of the property, and wear and tear.", law: ["TPA-108"], any: [/repair/, /good condition/, /wear and tear/] },
  { id: "r-possession", kind: "clause", title: "Handing the property back", need: "The tenant returns possession at the end.", law: ["TPA-108", "TPA-111"], any: [/vacate/, /hand(ing)? (back|over)/, /possession/, /return the premises/] },
  { id: "r-evict", kind: "forbid", title: "No eviction \"at any time\" or without notice", need: "Remove wording that lets the landlord throw the tenant out immediately or at will.", law: ["TPA-106", "TRC-10"], any: [/(evict|vacate|terminate)[^.\n]{0,40}(immediately|at any time|without (any )?notice)/, /without (any )?notice[^.\n]{0,40}(evict|vacate|terminate)/] },
  { id: "r-register", kind: "confirm", title: "Registration if the lease is longer than a year", need: "A lease for more than one year, or one reserving a yearly rent, must be made by a registered instrument and presented within four months. Many residential agreements run for 11 months to stay under this. If you want longer, register it.", law: ["TPA-107", "REG-17", "REG-23", "REG-49"] },
  { id: "r-telangana", kind: "confirm", title: "Check whether the Telangana rent law applies", need: "The Telangana Buildings (Lease, Rent and Eviction) Control Act 1960 can limit eviction and rent where it applies. Ask an advocate whether it covers this building.", law: ["TRC-10"] },
  { id: "r-tax", kind: "confirm", title: "Tax on rent", need: "Tax may have to be deducted from rent in some cases. Ask a chartered accountant.", law: ["TAX-TDS"] },
];

const FREELANCE: Rule[] = [
  { id: "f-scope", kind: "clause", title: "The work and deliverables are described", need: "What will be delivered and when.", law: ["ICA-10"], any: [/deliverable/, /\bscope\b/, /\bservices\b/] },
  { id: "f-fee", kind: "clause", title: "Fee and payment timing", need: "The amount and a payment deadline or milestones.", law: ["ICA-73", "MSMED-15"], any: [/within \d+ days/, /milestone/, /due (on|date)/, /invoice/] },
  { id: "f-assign", kind: "clause", title: "Copyright is assigned in a signed writing", need: "The agreement must say the rights are assigned. Without this the freelancer keeps the copyright.", law: ["CRA-17", "CRA-19"], any: [/\bassigns?\b/, /assignment of/] },
  { id: "f-assign-detail", kind: "clause", title: "The assignment names the work, the rights, the period and the territory", need: "If the period is left out it is treated as five years, and if the territory is left out it covers India only.", law: ["CRA-19"], any: [/(period|perpetu|for (a term of )?\d+ years)[^]*?(territor|worldwide|india)/, /(territor|worldwide)[^]*?(period|perpetu|for \d+ years)/] },
  { id: "f-independent", kind: "clause", title: "Freelancer is not an employee", need: "A line saying the freelancer works independently.", law: ["CRA-17", "LAB-CODES"], any: [/independent contractor/, /not an employee/, /independent(ly)?\b/] },
  { id: "f-confid", kind: "clause", title: "Confidentiality", need: "Client information stays private.", law: ["ICA-27"], any: [/confidential/] },
  { id: "f-end", kind: "clause", title: "Ending the contract", need: "Notice and what is paid for work done.", law: ["ICA-73"], any: [/terminat/] },
  { id: "f-noncompete", kind: "forbid", title: "No ban on working for others after the contract ends", need: "A post-contract non-compete is void. Confidentiality and non-solicitation during the contract are the lawful tools.", law: ["ICA-27"], any: [/non-?compet/, /(after|following)[^.\n]{0,50}(termination|expiry|end)[^.\n]{0,80}(shall not|must not|will not)[^.\n]{0,40}(work|compete|engage|provide)/] },
  { id: "f-tax", kind: "confirm", title: "GST and tax deduction", need: "Say who bears GST and whether tax is deducted from the fee. Ask a chartered accountant.", law: ["TAX-TDS"] },
  { id: "f-msme", kind: "confirm", title: "If the freelancer is a registered micro or small enterprise", need: "Payment cannot be delayed beyond 45 days, and delay earns compound interest.", law: ["MSMED-15"] },
];

const NDA: Rule[] = [
  { id: "n-def", kind: "clause", title: "What counts as confidential", need: "A clear definition of the confidential information.", law: ["ICA-10"], any: [/confidential information/] },
  { id: "n-exclusions", kind: "clause", title: "What is not confidential", need: "Public, already-known and independently developed information is excluded.", law: ["ICA-23"], any: [/public domain/, /already known/, /independently developed/, /publicly available/] },
  { id: "n-duty", kind: "clause", title: "The duty not to disclose or misuse", need: "The receiving side keeps it secret and uses it only for the stated purpose.", law: ["ICA-10"], any: [/shall not disclose/, /not (to )?disclose/, /keep[^.\n]{0,30}confidential/] },
  { id: "n-term", kind: "clause", title: "How long it lasts", need: "A fixed period, so the duty is reasonable.", law: ["ICA-27", "ICA-74"], any: [/for a period of/, /\b\d+ years?\b/, /\bterm\b/] },
  { id: "n-return", kind: "clause", title: "Return or destroy on request", need: "Information is returned or destroyed when asked.", law: ["ICA-73"], any: [/return/, /destroy/] },
  { id: "n-compelled", kind: "clause", title: "Disclosure required by law", need: "Disclosure to a court or authority when the law requires it is allowed.", law: ["ICA-23"], any: [/required by law/, /court order/, /legal process/, /compelled/] },
  { id: "n-noncompete", kind: "forbid", title: "No ban on doing business", need: "An NDA cannot stop a person from carrying on a lawful business. Protect the information, not the trade.", law: ["ICA-27"], any: [/non-?compet/, /shall not (carry on|engage in|start)[^.\n]{0,60}(business|competing)/] },
  { id: "n-damages", kind: "forbid", title: "No fixed huge penalty", need: "Remove fixed penalty sums. Courts award reasonable compensation only.", law: ["ICA-74"], any: [/liquidated damages of[^.\n]{0,30}(crore|lakh)/, /penalty of/] },
  { id: "n-data", kind: "confirm", title: "Personal data", need: "If the information includes personal data of customers or staff, the Digital Personal Data Protection Act applies. Ask an advocate.", law: ["DPDP-ACT"] },
];

const EMPLOYMENT: Rule[] = [
  { id: "e-role", kind: "clause", title: "Job title and place of work", need: "Designation, duties and location.", law: ["ICA-10"], any: [/designation/, /appointed as/, /position of/, /\brole\b/] },
  { id: "e-pay", kind: "clause", title: "Salary and when it is paid", need: "Amount, breakdown and pay date. It must not be below the notified minimum wage.", law: ["LAB-CODES"], any: [/salary/, /\bctc\b/, /per (month|annum)/] },
  { id: "e-probation", kind: "clause", title: "Probation, if any", need: "Length and what happens at the end.", law: ["ICA-10"], any: [/probation/] },
  { id: "e-notice", kind: "clause", title: "Notice period", need: "Notice for both employer and employee.", law: ["ICA-74"], any: [/notice period/, /notice of/, /written notice/] },
  { id: "e-leave", kind: "clause", title: "Leave and working hours", need: "Leave entitlement and normal hours.", law: ["LAB-CODES"], any: [/\bleave\b/, /working hours/, /hours of work/] },
  { id: "e-benefits", kind: "clause", title: "Statutory benefits are acknowledged", need: "Provident fund, ESI, gratuity and similar benefits as the law requires.", law: ["GRA-4", "SSC-53", "LAB-CODES"], any: [/provident fund|\bepf\b/, /\besi\b/, /gratuity/, /statutory (benefits|dues)/] },
  { id: "e-ip", kind: "clause", title: "Work created in the job belongs to the employer", need: "Work made in the course of employment is the employer's, subject to written agreement.", law: ["CRA-17"], any: [/intellectual property/, /work product/, /inventions?/, /copyright/] },
  { id: "e-confid", kind: "clause", title: "Confidentiality", need: "Company information stays private.", law: ["ICA-27"], any: [/confidential/] },
  { id: "e-noncompete", kind: "forbid", title: "No ban on working elsewhere after the job ends", need: "A non-compete that applies after employment is void. Confidentiality and rules during employment are lawful.", law: ["ICA-27"], any: [/non-?compet/, /(after|following|post)[^.\n]{0,50}(termination|resignation|cessation|leaving)[^.\n]{0,80}(shall not|must not|will not)[^.\n]{0,40}(work|join|compete|engage|be employed)/] },
  { id: "e-waiver", kind: "forbid", title: "No waiver of statutory benefits", need: "An employee cannot sign away gratuity, provident fund or minimum wages.", law: ["GRA-4", "SSC-53"], any: [/waives? (his|her|their|the)? ?(right to )?(gratuity|provident|minimum wage)/, /not (be )?entitled to (any )?gratuity/, /no gratuity/] },
  { id: "e-bond", kind: "forbid", title: "No bond beyond real, reasonable loss", need: "A heavy penalty for leaving early can be cut down by a court.", law: ["ICA-74"], any: [/bond (amount )?of[^.\n]{0,30}(lakh|crore)/, /liquidated damages[^.\n]{0,40}(leav|resign)/] },
  { id: "e-state", kind: "confirm", title: "State registrations and labour code rules", need: "Check Telangana's shops and establishments rules and the labour-code rules that now apply to this employer.", law: ["LAB-CODES"] },
  { id: "e-gratuity", kind: "confirm", title: "Gratuity rules are still settling", need: "Sources disagree on whether the 1972 Act or the Social Security Code now governs. Do not state a rupee ceiling without checking.", law: ["GRA-4", "SSC-53"] },
];

const SALE: Rule[] = [
  { id: "s-item", kind: "clause", title: "The item is clearly described", need: "What is sold, with identifying details (make, model, serial or registration number).", law: ["SGA-14"], any: [/\bvehicle\b/, /\bitem\b/, /\bgoods\b/, /\bdescribed\b/, /\bmodel\b/, /\bregistration number\b/] },
  { id: "s-price", kind: "clause", title: "Price and how it is paid", need: "Amount and mode of payment (bank transfer, UPI), not cash alone.", law: ["ICA-10", "ICA-23"], any: [/\bprice\b/, /sale consideration/, /consideration of/] },
  { id: "s-delivery", kind: "clause", title: "Handover date and place", need: "When and where the buyer gets the item.", law: ["SGA-14"], any: [/deliver/, /handed over/, /possession/] },
  { id: "s-title", kind: "clause", title: "Seller owns it and it is free of claims", need: "The seller confirms ownership and that no loan, pledge or dispute is attached.", law: ["SGA-14"], any: [/\btitle\b/, /free (from|of)/, /encumbrance/, /\blien\b/, /hypothecat/] },
  { id: "s-condition", kind: "clause", title: "Condition of the item", need: "Sold as seen, or with a stated warranty. Hidden defects in title are never excused.", law: ["SGA-14"], any: [/as is/, /as seen/, /condition/, /warrant/] },
  { id: "s-transfer", kind: "clause", title: "Vehicle: transfer of registration", need: "Seller reports the sale within 14 days and buyer applies for transfer within 30 days, with the right forms.", law: ["MVA-50"], onlyIf: [/\bvehicle\b/, /\bbike\b/, /\bcar\b/, /\bscooter\b/, /\bmotorcycle\b/], any: [/form 29/, /form 30/, /transfer of (the )?registration/, /registering authority/, /\brto\b/] },
  { id: "s-dues", kind: "clause", title: "Vehicle: challans, tax and insurance", need: "Who pays past fines and dues, and what happens to the insurance.", law: ["MVA-50"], onlyIf: [/\bvehicle\b/, /\bbike\b/, /\bcar\b/, /\bscooter\b/, /\bmotorcycle\b/], any: [/challan/, /\bdues\b/, /insurance/] },
  { id: "s-noc", kind: "confirm", title: "Vehicle: loan clearance", need: "If the vehicle was bought on a loan, get the financier's no-objection certificate before transfer.", law: ["MVA-50"] },
];

export const RULEBOOK: Record<ContractCode, Rule[]> = {
  R: RENT,
  F: FREELANCE,
  N: NDA,
  E: EMPLOYMENT,
  S: SALE,
};

export const COMMON_RULES = COMMON;
