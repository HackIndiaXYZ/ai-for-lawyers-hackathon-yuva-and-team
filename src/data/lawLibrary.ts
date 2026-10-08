/**
 * Sandhi law library: 48 curated provisions of Indian law.
 *
 * IMPORTANT: this is a summary, not the statute book, and it is not updated live.
 * Entries with verify: true were written from general knowledge and have NOT been
 * checked against India Code (https://www.indiacode.nic.in). Check them before any
 * demo or real use.
 */

/** R = residential rent, F = freelance, N = NDA, E = employment, S = sale of movable property */
export type ContractCode = "R" | "F" | "N" | "E" | "S";

export interface ActInfo {
  full: string;
  chip: string;
}

export interface LawEntry {
  id: string;
  act: string; // prefix of the id, a key of ACTS
  section: string;
  title: string;
  summary: string;
  consequence: string;
  /** "*" = all contract types; letters = those types; "" = only when a keyword matches */
  applies: string;
  tags: string[];
  verify: boolean;
}

/** Acts in the order they are shown in the Law library tab. */
export const ACT_ORDER = [
  "ICA", "CON", "TPA", "REG", "STAMP", "TRC", "MTA", "ITA", "NIA", "ARB", "CPC",
  "LIM", "SRA", "CPA", "BNS", "BSA", "CRA", "SGA", "MVA", "GRA", "LAB", "DPDP",
] as const;

export const ACTS: Record<string, ActInfo> = {
  ICA: { full: "Indian Contract Act 1872", chip: "Contract Act" },
  CON: { full: "Constitution of India", chip: "Constitution" },
  TPA: { full: "Transfer of Property Act 1882", chip: "TP Act" },
  REG: { full: "Registration Act 1908", chip: "Registration Act" },
  STAMP: { full: "Indian Stamp Act 1899", chip: "Stamp Act" },
  TRC: {
    full: "Telangana Buildings (Lease, Rent and Eviction) Control Act 1960",
    chip: "Telangana Rent Act",
  },
  MTA: { full: "Model Tenancy Act 2021", chip: "Model Tenancy Act" },
  ITA: { full: "Information Technology Act 2000", chip: "IT Act" },
  NIA: { full: "Negotiable Instruments Act 1881", chip: "NI Act" },
  ARB: { full: "Arbitration and Conciliation Act 1996", chip: "Arbitration Act" },
  CPC: { full: "Code of Civil Procedure 1908", chip: "CPC" },
  LIM: { full: "Limitation Act 1963", chip: "Limitation Act" },
  SRA: { full: "Specific Relief Act 1963", chip: "Specific Relief Act" },
  CPA: { full: "Consumer Protection Act 2019", chip: "Consumer Act" },
  BNS: { full: "Bharatiya Nyaya Sanhita 2023", chip: "BNS" },
  BSA: { full: "Bharatiya Sakshya Adhiniyam 2023", chip: "BSA" },
  CRA: { full: "Copyright Act 1957", chip: "Copyright Act" },
  SGA: { full: "Sale of Goods Act 1930", chip: "Sale of Goods Act" },
  MVA: { full: "Motor Vehicles Act 1988", chip: "MV Act" },
  GRA: { full: "Payment of Gratuity Act 1972", chip: "Gratuity Act" },
  LAB: { full: "Labour codes", chip: "Labour codes" },
  DPDP: { full: "Digital Personal Data Protection Act 2023", chip: "DPDP Act" },
};

// [id, section, title, summary, consequence, applies, tags, verify?]
type Raw = [string, string, string, string, string, string, string[], boolean?];

const RAW: Raw[] = [
  // ---------------- Indian Contract Act 1872 ----------------
  [
    "ICA-10", "ss.2(h) and 10", "What makes an agreement a contract",
    "An agreement is enforceable only if the parties freely consent, are competent, the consideration and object are lawful, and no law declares it void.",
    "If any of these is missing the agreement can be void (no legal effect) or voidable (cancellable by the wronged party), and a court will not enforce it.",
    "*", ["valid", "essential", "consent", "consideration", "enforceable", "agreement"],
  ],
  [
    "ICA-11", "s.11 (with Indian Majority Act 1875, s.3)", "Who can contract",
    "Parties must be adults (18 or older), of sound mind and not disqualified by law.",
    "A contract with a minor is void from the start and cannot be enforced against the minor (Mohori Bibee v Dharmodas Ghose, 1903).",
    "*", ["minor", "age", "18", "student", "under 18", "capacity", "sound mind"],
  ],
  [
    "ICA-15", "ss.14 to 19", "Free consent",
    "Consent is not free if it is obtained by coercion, undue influence, fraud or misrepresentation.",
    "The wronged party can cancel the contract (s.19) and claim damages, and the other side cannot enforce it against them.",
    "*", ["force", "pressure", "threat", "fraud", "misrepresent", "lie", "false", "coerc", "undue", "mislead"],
  ],
  [
    "ICA-20", "s.20", "Mistake of fact by both sides",
    "If both parties are mistaken about a fact that is essential to the agreement, the agreement is void.",
    "The agreement has no legal effect and money paid under it may have to be returned.",
    "*", ["mistake", "wrong", "error", "misunderstand"],
  ],
  [
    "ICA-23", "s.23", "Lawful object and consideration",
    "The object or consideration is unlawful if it is forbidden by law, defeats a law, is fraudulent, harms a person or property, or is immoral or against public policy.",
    "The agreement, or the unlawful part of it, is void: it cannot be enforced and money paid under it can be hard to recover.",
    "*", ["illegal", "unlawful", "public policy", "unfair", "one-sided", "unconscionable", "bribe", "black money", "cash only", "without receipt"],
  ],
  [
    "ICA-25", "s.25", "Promise without payment or value",
    "An agreement without consideration is void, except a registered written promise made out of natural love and affection, payment for past voluntary service, or a written promise to pay a time-barred debt.",
    "A promise to do something for nothing in return cannot be enforced.",
    "*", ["gift", "free of cost", "without payment", "no consideration", "gratis", "promise"],
  ],
  [
    "ICA-27", "s.27", "Restraint of trade",
    "Any agreement that stops a person from carrying on a lawful profession, trade or business is void. The only exception is the sale of a business with its goodwill. Restrictions that apply during employment are allowed.",
    "A non-compete that applies after the job or contract ends cannot be enforced, although confidentiality clauses can.",
    "FNES", ["non-compete", "noncompete", "compete", "exclusive", "after termination", "solicit", "restraint", "restrict"],
  ],
  [
    "ICA-28", "s.28", "Agreements that block legal remedies",
    "An agreement that stops a party from enforcing their rights in court, or sets an absolute time limit shorter than the law allows, is void. Arbitration is the permitted exception.",
    "A clause such as 'the decision of the landlord is final' or 'no court may hear disputes' is void, and a court can still hear the case.",
    "*", ["final", "no court", "limitation", "waive", "decision is final", "sole discretion", "dispute", "barred"],
  ],
  [
    "ICA-29", "s.29", "Vague agreements",
    "An agreement whose meaning is uncertain, or cannot be made certain, is void.",
    "Terms such as 'rent to be revised as the landlord sees fit' or blank amounts may make that term, or the whole deal, unenforceable.",
    "*", ["vague", "blank", "as he sees fit", "as the landlord sees fit", "to be decided", "unclear", "discretion", "uncertain", "____"],
  ],
  [
    "ICA-56", "s.56", "Impossible or frustrated contracts",
    "An agreement to do something impossible is void, and a contract that later becomes impossible or unlawful to perform becomes void.",
    "Neither side can be forced to perform, and money paid may have to be returned (s.65).",
    "*", ["impossible", "force majeure", "frustration", "pandemic", "cannot perform", "act of god"],
  ],
  [
    "ICA-73", "s.73", "Damages for breach",
    "The party who suffers from a breach can claim compensation for loss that naturally arose from the breach, not for remote or indirect loss.",
    "You can recover real, provable loss. A clause promising unlimited or imaginary losses will not be enforced beyond this.",
    "*", ["breach", "damages", "compensation", "loss", "default", "late payment"],
  ],
  [
    "ICA-74", "s.74", "Penalty clauses",
    "When a contract names a sum payable on breach, the court awards only reasonable compensation, not more than the named sum, whether or not the clause is called a penalty.",
    "A harsh clause, such as six months of rent for leaving early or forfeiting the whole deposit, can be cut down by the court.",
    "*", ["penalty", "forfeit", "liquidated", "fine", "non-refundable", "non refundable", "deposit", "early", "lock-in", "lock in", "notice pay", "bond"],
  ],
  [
    "ICA-124", "ss.124 and 126", "Indemnity and guarantee",
    "An indemnity is a promise to make good a loss caused by the promisor or another person. A guarantee is a promise to perform another person's obligation if they default.",
    "Open-ended indemnity or guarantee wording can make one party answerable for losses without any cap.",
    "*", ["indemnity", "indemnify", "guarantee", "liable", "liability", "surety", "hold harmless"],
  ],

  // ---------------- Constitution of India ----------------
  [
    "CON-14", "Article 14", "Equality and unfair terms",
    "Article 14 guarantees equality before the law. Courts have used it, together with s.23 of the Contract Act, to strike down grossly one-sided terms imposed on a weaker party (Central Inland Water Transport v Brojo Nath Ganguly, 1986). Fundamental rights bind the State directly and reach private contracts mainly through the public-policy test.",
    "A term that is wholly unfair or unconscionable can be declared void as against public policy.",
    "*", ["unfair", "one-sided", "unilateral", "standard form", "take it or leave it", "sole discretion", "immediately", "at any time", "any time"],
  ],
  [
    "CON-19", "Article 19(1)(g)", "Right to practise a profession",
    "Citizens have the fundamental right to practise any profession or carry on any trade or business. This is the constitutional background to s.27 of the Contract Act.",
    "Restrictions on earning a livelihood after the contract ends are likely to be void.",
    "FNE", ["non-compete", "compete", "profession", "livelihood", "exclusive", "restraint"],
  ],
  [
    "CON-21", "Article 21", "Life, liberty and privacy",
    "Article 21 protects life and personal liberty, and the Supreme Court has held that privacy is part of it (K.S. Puttaswamy v Union of India, 2017). In private contracts it informs public policy rather than binding private parties directly.",
    "Terms allowing entry at any time, intrusive surveillance or careless handling of personal data can be challenged as against public policy and data protection law.",
    "RNE", ["privacy", "enter", "entry", "inspect", "surveillance", "cctv", "personal data", "visit", "access"],
  ],
  [
    "CON-23", "Article 23", "Forced and bonded labour",
    "Article 23 prohibits forced labour and trafficking. Contracts that compel a person to work against their will, or bind them to service to repay a debt, are not enforceable.",
    "Clauses that confiscate original documents, hold salary hostage or force service to clear a debt can be void and can attract criminal liability.",
    "FE", ["bond", "bonded", "forced", "confiscate", "original documents", "withhold salary", "training bond", "hold salary"],
  ],
  [
    "CON-300A", "Article 300A", "Right to property",
    "No person can be deprived of property except by authority of law. A private clause cannot let one party seize property or evict someone without following the legal process.",
    "Locking out a tenant, seizing goods or taking possession without a court or lawful process can be challenged and may be unlawful.",
    "RS", ["evict", "vacate", "lock", "seize", "possession", "forfeit", "lockout", "throw out"], true,
  ],

  // ---------------- Transfer of Property Act 1882 ----------------
  [
    "TPA-105", "s.105", "What a lease is",
    "A lease transfers the right to enjoy immovable property for a fixed or indefinite period in return for rent or other consideration.",
    "Calling the document a 'rent agreement' or 'leave and licence' does not change what it is. The lease rules on registration and notice apply to a true lease.",
    "R", ["lease", "rent", "tenant", "landlord", "tenancy", "licence", "license", "flat", "house", "shop"],
  ],
  [
    "TPA-106", "s.106", "Notice to end a tenancy",
    "Where nothing else is agreed, a month-to-month tenancy ends on at least 15 days' written notice and a year-to-year tenancy on six months'. Parties can agree their own notice period.",
    "A landlord cannot lawfully turn a tenant out 'immediately' without the agreed notice and without following the applicable rent law. A defective notice is invalid.",
    "R", ["notice", "terminate", "termination", "vacate", "immediately", "evict", "end the tenancy"],
  ],
  [
    "TPA-107", "s.107", "Leases above one year must be registered",
    "A lease of immovable property for more than one year, or reserving a yearly rent, can be made only by a registered instrument.",
    "An unregistered lease longer than a year is not valid as a lease. At most it operates as a month-to-month tenancy.",
    "R", ["registered", "register", "registration", "lease", "term", "2 years", "3 years", "five years", "12 months"],
  ],
  [
    "TPA-108", "s.108", "Landlord and tenant duties",
    "The landlord must disclose known material defects and allow quiet possession. The tenant must pay rent, use the property properly and not damage it. Ordinary wear and tear is not the tenant's liability.",
    "Charging a tenant for old damage, or entering at will, can breach the landlord's own duties.",
    "R", ["repair", "damage", "maintenance", "defect", "quiet", "wear", "painting", "entry", "enter"], true,
  ],
  [
    "TPA-54", "s.54", "Sale of immovable property",
    "A sale of immovable property worth Rs 100 or more is complete only by a registered sale deed. A mere agreement to sell does not itself transfer ownership.",
    "Without a registered deed the buyer does not become the legal owner.",
    "", ["sale deed", "plot", "land", "immovable", "sell my house", "sell my flat", "sell my property"],
  ],

  // ---------------- Registration Act 1908 ----------------
  [
    "REG-17", "s.17(1)(d)", "Registration is compulsory for longer leases",
    "Leases of immovable property from year to year, for more than one year, or reserving a yearly rent must be registered. This is why short residential rent agreements are often made for 11 months.",
    "An unregistered long lease cannot be relied on as proof of the lease.",
    "R", ["register", "registration", "11 months", "eleven months", "lease", "lock-in"],
  ],
  [
    "REG-49", "s.49", "Effect of not registering",
    "A document that must be registered but is not cannot be used as evidence of a transaction affecting the property, although it may be used for collateral purposes such as proving possession or rent paid.",
    "You may be unable to prove your rights under the document in court.",
    "R", ["unregistered", "evidence", "proof", "register"],
  ],
  [
    "REG-23", "s.23", "Time to register",
    "A document must be presented for registration within four months of its execution.",
    "A late document needs the Registrar's permission and a fine, and can be refused.",
    "R", ["four months", "deadline", "registration", "register"],
  ],

  // ---------------- Stamp, Telangana rent, model tenancy ----------------
  [
    "STAMP-35", "s.35 (state rates apply)", "Stamp duty",
    "An instrument that is not properly stamped cannot be used as evidence until the duty and a penalty are paid. Rates differ by state, and Telangana sets its own.",
    "An unstamped or under-stamped agreement can be impounded and cannot be relied on in court until the duty and penalty are paid. Check Telangana's current rates with the Registration and Stamps Department.",
    "*", ["stamp", "duty", "stamped", "stamp paper", "non-judicial", "affidavit", "notary"],
  ],
  [
    "TRC-10", "s.10", "Eviction of tenants",
    "In areas where it applies, a landlord can evict only on the grounds listed in the Act, such as non-payment of rent, subletting, misuse or genuine own need, and only through the Rent Controller. Buildings above a notified rent level may fall outside the Act, so check whether it applies.",
    "Where the Act applies, a clause allowing eviction 'at any time' cannot override these grounds.",
    "R", ["evict", "eviction", "vacate", "rent control", "subletting", "sublet", "default", "landlord can ask"], true,
  ],
  [
    "MTA-2021", "whole Act (model law)", "The central model tenancy law",
    "A model law for states to adopt. It proposes a written tenancy agreement, a residential security deposit of at most two months' rent, and three months' written notice for a rent increase. It binds only where a state enacts it, and to our knowledge Telangana has not.",
    "Where it is not in force these limits are guidance, but a very high or non-refundable deposit is a sign of an unfair term.",
    "R", ["deposit", "security deposit", "advance", "rent increase", "hike", "revise", "revision"], true,
  ],

  // ---------------- IT Act, cheques, arbitration, courts, limitation, relief ----------------
  [
    "ITA-10A", "ss.3A, 5 and 10A", "E-contracts and e-signatures",
    "Contracts formed through electronic records, and valid electronic signatures such as Aadhaar e-Sign, are not invalid merely because they are electronic.",
    "An e-signed agreement is generally enforceable, subject to the exceptions in the First Schedule.",
    "*", ["e-sign", "esign", "electronic", "digital", "online", "signature", "aadhaar", "docusign"],
  ],
  [
    "ITA-SCH1", "s.1(4) and First Schedule", "Documents that cannot rely on e-signature alone",
    "Wills, powers of attorney, trusts, negotiable instruments other than cheques, and contracts for the sale or conveyance of immovable property are outside the electronic-signature provisions.",
    "Signing such a document only electronically may leave it invalid.",
    "", ["power of attorney", "will", "trust", "sale deed", "conveyance"],
  ],
  [
    "NIA-138", "s.138", "Bounced cheques",
    "If a cheque given to discharge a legal debt is returned for insufficient funds, the drawer can be prosecuted. The payee must send a demand notice within 30 days of the bank's return memo, the drawer then has 15 days to pay, and the complaint must follow within one month.",
    "Conviction can mean imprisonment of up to two years, a fine of up to twice the cheque amount, or both. This is why security cheques are risky for the person who signs them.",
    "RFS", ["cheque", "check", "security cheque", "post-dated", "bounce", "dishonour", "dishonor", "pdc"],
  ],
  [
    "ARB-7", "ss.7 and 8", "Arbitration agreements",
    "An agreement to arbitrate must be in writing, and a clause in the main contract is enough. A court must refer parties to arbitration when a valid clause covers the dispute.",
    "A properly written arbitration clause keeps the dispute out of the regular courts. A vague or unsigned one may fail.",
    "*", ["arbitration", "arbitrator", "seat", "tribunal"],
  ],
  [
    "ARB-12", "s.12(5) and Seventh Schedule", "Biased arbitrators",
    "A person with specified links to a party, including the party's employee or adviser, cannot act as arbitrator unless the parties waive this in writing after the dispute arises. A clause letting one side appoint the sole arbitrator has been struck down (Perkins Eastman Architects v HSCC, 2019).",
    "A clause naming the landlord, employer or client, or their nominee, as the final decider can be void, and the court can appoint a neutral arbitrator.",
    "*", ["sole arbitrator", "nominee", "appoint", "decision is final", "landlord decides", "sole discretion", "arbitrator"],
  ],
  [
    "CPC-16", "ss.16 and 20", "Which court can hear the dispute",
    "Suits about immovable property must be filed where the property is located (s.16). Other suits can be filed where the defendant lives or works or where the cause of action arose (s.20). Parties can choose between courts that already have jurisdiction, but cannot create jurisdiction where none exists (Hakam Singh v Gammon (India), 1971).",
    "A clause naming only courts in a distant city may be ineffective for a property dispute in Hyderabad.",
    "*", ["jurisdiction", "courts in", "only courts", "venue", "exclusive jurisdiction", "mumbai", "delhi", "bangalore", "chennai"],
  ],
  [
    "LIM-55", "s.3 and Articles 54 and 55", "Time limits to sue",
    "A claim for breach of contract generally must be filed within three years of the breach, and a suit for specific performance within three years of the date fixed for performance.",
    "Waiting too long can permanently bar a claim. A clause that shortens these periods is void under s.28 of the Contract Act.",
    "*", ["limitation", "time limit", "sue", "delay"],
  ],
  [
    "SRA-14", "ss.10 and 14", "Forcing someone to perform",
    "Courts can order specific performance of many contracts (s.10, as amended in 2018), but not where money damages are adequate, the contract depends on personal skill or service, or it involves continuing duties a court cannot supervise (s.14).",
    "You usually cannot compel a freelancer or employee to work. The remedy is damages, and a court will not enforce personal service.",
    "*", ["specific performance", "compel", "personal service", "injunction", "force them to"],
  ],

  // ---------------- Consumer, criminal law, evidence ----------------
  [
    "CPA-2", "s.2(46)", "Unfair contracts with consumers",
    "In contracts for goods and services with consumers, terms are unfair if they cause a significant imbalance, such as excessive security deposits, disproportionate penalties, refusal to accept early repayment, or unilateral termination without cause. This generally does not cover a landlord and tenant.",
    "A consumer commission can declare such terms null and void.",
    "FS", ["consumer", "refund", "customer", "warranty", "service charge"], true,
  ],
  [
    "BNS-318", "s.318", "Cheating",
    "Cheating by dishonestly inducing someone to hand over money or property is a criminal offence. The BNS replaced the Indian Penal Code from 1 July 2024 (the old IPC s.420).",
    "Taking an advance or deposit on a false promise can lead to criminal prosecution, with imprisonment of up to seven years for the aggravated form.",
    "*", ["cheat", "cheated", "fraud", "advance", "false promise", "scam", "dishonest", "duped"], true,
  ],
  [
    "BNS-316", "s.316", "Criminal breach of trust",
    "Dishonestly misusing property or money entrusted to you, such as a deposit or client funds, is a criminal offence (old IPC s.406).",
    "It can lead to imprisonment and a fine in addition to civil recovery.",
    "*", ["entrusted", "misuse", "withhold deposit", "misappropriate", "trust", "client funds"], true,
  ],
  [
    "BNS-336", "s.336", "Forgery",
    "Creating a false document or signature to cause damage or to support a claim is forgery (old IPC ss.463 to 471).",
    "Forged or backdated documents can lead to prosecution and can make the contract unenforceable.",
    "*", ["forged", "fake", "forgery", "backdate", "backdated", "tampered"], true,
  ],
  [
    "BSA-94", "ss.94 and 95 (earlier Evidence Act ss.91 and 92)", "Written terms prevail over oral promises",
    "When the terms of a contract are in writing, oral evidence generally cannot be used to contradict, vary or add to them.",
    "Anything promised verbally but left out of the written contract may be impossible to enforce.",
    "*", ["verbal", "oral", "promised", "told me", "agreed verbally", "word of mouth", "entire agreement"], true,
  ],

  // ---------------- Copyright, sale, vehicles ----------------
  [
    "CRA-17", "ss.17 and 19", "Who owns the work",
    "The author is the first owner of copyright. Work made under a contract of employment belongs to the employer, but a freelancer (contract for service) keeps the copyright unless it is assigned in a signed writing (s.19). If the assignment states no term it runs for five years, and if it names no territory it covers India only. It lapses if the assignee does not use it within a year unless the deed says otherwise.",
    "If the contract does not clearly assign the rights, the client may pay for work it does not own.",
    "FE", ["copyright", "ownership", "own the", "intellectual property", "design", "logo", "code", "software", "deliverable", "assign", "work product"],
  ],
  [
    "SGA-14", "ss.14 and 16", "What a seller promises",
    "The seller must have the right to sell the goods, and the buyer must get quiet possession free of undisclosed charges (s.14). Beyond that a buyer generally takes goods as they are, unless the contract states the quality or the buyer relied on the seller's skill (s.16).",
    "A seller who sells something pledged, financed or not theirs is in breach, and 'sold as is' does not excuse a hidden defect in title.",
    "S", ["sell", "sold", "buyer", "seller", "as is", "second hand", "secondhand", "warranty", "goods", "bike", "car", "phone", "laptop"],
  ],
  [
    "MVA-50", "ss.50 and 51", "Transferring a vehicle",
    "The seller must report the transfer to the registering authority within 14 days, and the buyer must apply for transfer of the registration within 30 days. A vehicle under a hire-purchase or loan needs the financier's no-objection before transfer (s.51).",
    "If the transfer is not recorded, the seller can stay answerable for challans and accidents, and the buyer may be unable to insure or resell.",
    "S", ["vehicle", "bike", "car", "scooter", "rc", "challan", "noc", "loan", "hypothecation", "registration transfer"], true,
  ],

  // ---------------- Employment and data ----------------
  [
    "GRA-4", "s.4", "Gratuity",
    "An employee who completes five years of continuous service is entitled to gratuity on retirement, resignation or death (the five-year rule does not apply on death or disability). The right cannot be signed away. The labour codes may now restate this, so check the current provision.",
    "A clause denying or waiving gratuity is ineffective.",
    "E", ["gratuity", "full and final", "resign", "notice period"], true,
  ],
  [
    "LAB-CODES", "Codes on Wages, Industrial Relations, Social Security and OSH", "The new labour codes",
    "Parliament consolidated 29 labour laws into four codes. They were reported to come into force in November 2025, so older Acts such as the Minimum Wages Act, Payment of Wages Act and EPF Act may now be replaced or restated.",
    "Check which provision applies today before relying on older section numbers or on a salary below the notified minimum wage.",
    "E", ["wage", "wages", "salary", "minimum wage", "epf", "provident", "esi", "overtime", "leave", "retrench", "bonus", "ctc"], true,
  ],
  [
    "DPDP-ACT", "whole Act", "Personal data",
    "Personal data may be processed only for lawful purposes with the person's consent or another permitted ground, and the organisation handling it must keep it secure and use it only for the stated purpose. The rules under the Act are being phased in.",
    "Careless handling of customer or employee data can attract heavy penalties under the Act.",
    "NFE", ["personal data", "customer data", "aadhaar", "employee data", "share data", "data protection"], true,
  ],
];

export const LAW_LIBRARY: LawEntry[] = RAW.map(
  ([id, section, title, summary, consequence, applies, tags, verify]) => ({
    id,
    act: id.split("-")[0],
    section,
    title,
    summary,
    consequence,
    applies,
    tags,
    verify: verify === true,
  }),
);

/** Look up a provision by its ID. Unknown IDs return undefined, so invented IDs are dropped. */
export const LAW_BY_ID: Map<string, LawEntry> = new Map(
  LAW_LIBRARY.map((e) => [e.id, e]),
);
