/**
 * Quick legal help: the demo-mode playbooks.
 *
 * Each playbook is one common everyday problem. It holds
 *  - the questions Sandhi asks, ONE at a time, before it gives any advice, and
 *  - the grounded advice: laws from the Sandhi law library (by id), what to do, what not to do, next steps.
 *
 * The same shape is what the real AI is asked to produce (see prompts.ts), so demo mode and live mode look identical.
 * Everything here is general information, not legal advice for a specific case. Entries that lean on a law marked
 * "verify" in the library are shown with that warning.
 */

export interface HelpStep {
  /** Short label for the "What I understood" list. */
  label: string;
  q: string;
}

export interface Playbook {
  id: string;
  title: string;
  /** Words that suggest this problem. */
  match: RegExp;
  /** Library ids this advice rests on. Each must exist in the law library (a test checks). */
  laws: { id: string; plain: string }[];
  steps: HelpStep[];
  headline: string;
  dos: string[];
  donts: string[];
  next: string[];
  /** Who to approach, in plain words. */
  who: string;
}

const WHEN: HelpStep = { label: "When it happened", q: "When did this happen, or when did it start?" };
const WRITTEN: HelpStep = {
  label: "What is in writing",
  q: "Is anything about this in writing, such as an agreement, messages, emails, receipts or bank transfers?",
};
const WANT: HelpStep = { label: "What you want", q: "What outcome would you like from this?" };
const ELSE: HelpStep = { label: "Anything else", q: "Is there anything else important that I have not asked about?" };

export const PLAYBOOKS: Playbook[] = [
  {
    id: "deposit",
    title: "Security deposit not returned",
    match: /deposit|advance (money|amount)|not (returning|refunding|returned)|refund.*(landlord|flat|house)/i,
    laws: [
      { id: "TPA-108", plain: "A landlord and tenant each have duties under a lease, including what happens when the tenant leaves." },
      { id: "MTA-2021", plain: "The central model tenancy law limits deposits and expects them back when the tenant leaves. Each state decides whether to adopt it, so check whether your state has." },
      { id: "ICA-73", plain: "If someone breaks a contract, the other side can claim the loss that follows from it." },
      { id: "LIM-55", plain: "A civil claim must be filed within the time limit, normally three years for money claims." },
    ],
    steps: [
      { label: "Your role", q: "Are you the tenant or the landlord?" },
      { label: "Deposit amount", q: "How much was the deposit, in rupees?" },
      { label: "Move-out date", q: "On what date did the tenancy end, or when did you hand back the keys?" },
      { label: "Reason given", q: "What reason has the other side given for not returning it?" },
      WRITTEN,
      { label: "Rent and dues", q: "Is any rent or bill still unpaid?" },
      WANT,
      ELSE,
    ],
    headline: "Getting a security deposit back",
    dos: [
      "Send a written demand now (email plus a registered post letter) stating the amount, the date you handed back the keys and a clear deadline, such as 15 days.",
      "Gather the agreement, rent receipts, proof of the deposit payment (bank transfer or receipt) and photos from handover.",
      "If something is genuinely owed (unpaid rent, a damaged item), acknowledge it in writing and ask for the rest. A fair deduction is easier to settle than an all-or-nothing fight.",
      "If the demand is ignored, ask an advocate to send a legal notice. It often settles the matter without court.",
    ],
    donts: [
      "Do not stop paying rent to \"adjust\" the deposit unless your agreement clearly allows it. It gives the landlord a real claim against you.",
      "Do not hand over keys without a signed acknowledgement of the date and the condition of the property.",
      "Do not threaten, abuse or damage anything. It weakens your case.",
      "Do not wait too long. Money claims have a time limit.",
    ],
    next: [
      "Write down a timeline: dates, amounts, who said what.",
      "Send the written demand and keep proof of sending.",
      "If nothing happens after the deadline, talk to a local advocate about a legal notice and a civil claim.",
    ],
    who: "A local advocate (for the legal notice), and the civil court or the rent authority of your state if the notice fails.",
  },
  {
    id: "unpaid",
    title: "Unpaid salary or unpaid fees",
    match: /salary|wages|unpaid|not paid|haven'?t paid|didn'?t pay|invoice|payment (pending|due)|owe me|final settlement|gratuity|dues/i,
    laws: [
      { id: "ICA-73", plain: "When someone breaks a contract by not paying, you can claim what you are owed and the loss that follows." },
      { id: "LAB-CODES", plain: "The new labour codes protect employees' wages and require timely payment. The exact rules depend on your job and state, so confirm the detail." },
      { id: "MSMED-15", plain: "If the person who owes you is a buyer from a micro or small business, the law sets a time limit for payment and charges interest on late payment." },
      { id: "SSC-53", plain: "An employee who has completed the required years of service is entitled to gratuity." },
      { id: "LIM-55", plain: "A money claim must be filed within the time limit, normally three years." },
    ],
    steps: [
      { label: "Your role", q: "Were you working as an employee, or as a freelancer or supplier?" },
      { label: "Amount owed", q: "How much money is owed to you, in rupees?" },
      { label: "Since when", q: "Since what date has this been unpaid?" },
      WRITTEN,
      { label: "What they said", q: "What reason or promise have they given for not paying?" },
      { label: "Still working", q: "Are you still working with them, or has it ended?" },
      WANT,
      ELSE,
    ],
    headline: "Getting money you are owed for work",
    dos: [
      "Send a polite but firm written demand (email) listing the invoices or salary months, the amounts and a deadline. Keep a copy.",
      "Collect proof: offer letter or contract, payslips, invoices, bank statements, and chats or emails about the work and the dues.",
      "If you are an employee, you can also complain to the labour office in your area. Ask what your state's process is.",
      "If the deadline passes, ask an advocate to send a legal notice. For a business customer, that notice is often what gets the money moving.",
    ],
    donts: [
      "Do not sign a \"full and final settlement\" or a no-dues letter until you have actually received the money.",
      "Do not take or leak the company's confidential files or client data to pressure them. It can turn you into the one in the wrong.",
      "Do not post accusations online. It can expose you to a defamation claim.",
      "Do not ignore the time limit for claims.",
    ],
    next: [
      "List every unpaid amount with its due date.",
      "Send the written demand with a deadline and keep proof.",
      "If it is unpaid after the deadline, go to the labour office (for salary) or an advocate for a legal notice.",
    ],
    who: "The labour office of your area (for salary), or an advocate for a legal notice and a civil or commercial claim.",
  },
  {
    id: "cheque",
    title: "A cheque bounced",
    match: /cheque|check bounce|bounced|dishonou?r|section 138|insufficient funds/i,
    laws: [
      { id: "NIA-138", plain: "A bounced cheque given for a legal debt can be a criminal offence, but only if a strict notice-and-time sequence is followed." },
      { id: "ICA-73", plain: "Separately, you can claim the money you are owed as a civil debt." },
      { id: "LIM-55", plain: "Civil money claims also have a time limit." },
    ],
    steps: [
      { label: "Your side", q: "Did you receive the cheque, or did you give it?" },
      { label: "Cheque amount", q: "What is the amount on the cheque, in rupees?" },
      { label: "Return date", q: "On what date did the bank return it unpaid, or tell you about the return?" },
      { label: "Return reason", q: "What reason does the bank's return memo give?" },
      { label: "Notice sent", q: "Has a written demand notice already been sent or received about it?" },
      { label: "What it was for", q: "What was the cheque given for, such as a loan, a sale or rent?" },
      WANT,
      ELSE,
    ],
    headline: "A bounced cheque: the strict timeline",
    dos: [
      "Keep the original cheque, the bank's return memo and the proof of what the cheque was for.",
      "If you received the cheque: send a written demand notice to the person who gave it within 30 days of learning about the return, asking for payment within 15 days. Time starts from the return, so do this quickly.",
      "If you gave the cheque: if you receive such a notice, pay within the 15 days or reply through an advocate. Do not ignore it.",
      "Speak to an advocate straight away. The timeline is strict and missing a step can end the criminal case.",
    ],
    donts: [
      "Do not wait. The notice must go within 30 days of the return, and a complaint must be filed within one month after the payment period ends.",
      "Do not rely on verbal promises to \"pay next week\" without writing. They do not stop the clock.",
      "Do not ignore a notice you received. Silence can lead to a criminal complaint.",
      "Do not threaten or harass the other person.",
    ],
    next: [
      "Note the return date and count 30 days from it.",
      "Send the demand notice (registered post plus email) and keep the receipts.",
      "If unpaid after 15 days, an advocate can file the complaint within the next month.",
    ],
    who: "An advocate who files cheque-bounce complaints, immediately because of the time limits.",
  },
  {
    id: "tenant_trouble",
    title: "Landlord is threatening or harassing me",
    match: /(my )?landlord.*(evict|vacate|throw|threat|harass|lock|cut|electric|water|force|leave|notice)|(evict|vacate|throw out|thrown out).*(me|us)|asked me to (leave|vacate)|rent (increase|hike)/i,
    laws: [
      { id: "TPA-106", plain: "To end a tenancy the landlord has to give proper written notice, usually 15 days for a monthly tenancy unless the agreement or state law says otherwise." },
      { id: "TPA-108", plain: "A landlord has duties too, such as not disturbing the tenant's peaceful use of the home." },
      { id: "TRC-10", plain: "In Telangana, a tenant can normally be evicted only through the rent authority on specific grounds, not by force." },
      { id: "CON-21", plain: "Your right to live with dignity and to a home is protected, so a landlord cannot simply throw you out." },
    ],
    steps: [
      { label: "What is happening", q: "What exactly is the landlord doing or saying right now?" },
      { label: "Agreement", q: "Do you have a written rent agreement, and is it still running?" },
      { label: "Rent status", q: "Is your rent fully paid up to date?" },
      { label: "Notice", q: "Has the landlord given you any written notice to leave?" },
      { label: "Safety", q: "Has there been any threat, force, or cut-off of electricity or water?" },
      WANT,
      ELSE,
    ],
    headline: "If your landlord is pushing you out",
    dos: [
      "Keep paying rent on time, preferably by bank transfer, and keep every receipt.",
      "Ask for any notice in writing. A phone call or message saying \"leave in a week\" is not proper notice.",
      "Record what happens: dates, messages, screenshots, photos, and names of neighbours who saw it.",
      "If anyone threatens you, uses force or locks you out, call 112 right away and ask for it to be recorded.",
      "Speak to an advocate before you agree to leave, especially if you are asked to sign anything.",
    ],
    donts: [
      "Do not move out because of pressure without a signed settlement. Leaving can weaken your rights.",
      "Do not stop paying rent to protest. It gives the landlord a real ground against you.",
      "Do not sign blank or backdated papers.",
      "Do not retaliate by damaging the property or abusing the landlord.",
    ],
    next: [
      "Gather the agreement and all rent receipts in one place.",
      "Reply to any notice in writing and keep a copy.",
      "If the harassment continues, an advocate can send a notice and approach the rent authority or court.",
    ],
    who: "An advocate or the local rent authority. For immediate danger, call 112.",
  },
  {
    id: "landlord_trouble",
    title: "My tenant is not paying or will not leave",
    match: /(my )?tenant.*(not paying|won'?t pay|refus|stopp|leave|vacate|damag|sublet|overstay)|(evict|remove).*tenant/i,
    laws: [
      { id: "TPA-106", plain: "To end a monthly tenancy, a landlord has to give proper written notice, usually 15 days unless the agreement or state law says otherwise." },
      { id: "TPA-108", plain: "A tenant must pay rent and take care of the property; a landlord must not interfere with peaceful possession." },
      { id: "TRC-10", plain: "In Telangana, a tenant can normally be evicted only through the rent authority on specific grounds, not by force." },
      { id: "ICA-73", plain: "Unpaid rent can be claimed as a debt, along with the loss that follows from the breach." },
    ],
    steps: [
      { label: "The issue", q: "What is the main problem: unpaid rent, damage, or refusing to leave?" },
      { label: "Agreement", q: "Do you have a written rent agreement, and is it registered or only on stamp paper?" },
      { label: "Dues", q: "How many months of rent are unpaid, and how much in total?" },
      { label: "Notice", q: "Have you given the tenant a written notice yet?" },
      { label: "Deposit", q: "How much security deposit do you hold?" },
      WANT,
      ELSE,
    ],
    headline: "When a tenant does not pay or will not leave",
    dos: [
      "Send a written notice by registered post and email: state the unpaid rent and the date by which it must be paid, or the date the tenancy ends.",
      "Keep the agreement, rent ledger and bank statements together as proof of what is owed.",
      "Remember that the deposit may be adjusted against genuine dues, but do it in writing and show the calculation.",
      "Approach an advocate to file for recovery of the rent and, where grounds exist, eviction through the rent authority or civil court.",
    ],
    donts: [
      "Do not lock the tenant out, remove their belongings, or cut electricity or water. This self-help can make you liable.",
      "Do not threaten or use outsiders to pressure them.",
      "Do not accept cash without a receipt.",
      "Do not wait years. Claims have time limits.",
    ],
    next: [
      "Write the dues timeline.",
      "Send the written notice.",
      "If unresolved by the deadline, instruct an advocate to start the legal process.",
    ],
    who: "An advocate for notice and eviction or recovery proceedings before the rent authority or court.",
  },
  {
    id: "consumer",
    title: "Bad product, service or refund refused",
    match: /refund|defective|faulty|damaged product|warranty|replacement|delivery|order|service (was|is) (bad|poor)|overcharg|builder|flat delay|consumer|seller (refus|cheat)/i,
    laws: [
      { id: "CPA-2", plain: "The Consumer Protection Act protects buyers from defective goods, deficient services and unfair terms." },
      { id: "SGA-14", plain: "A seller must supply goods that match the description and are fit for the purpose." },
      { id: "ICA-73", plain: "If the seller breaks the deal, you can claim the loss that follows from it." },
    ],
    steps: [
      { label: "What you bought", q: "What did you buy or pay for?" },
      { label: "Amount paid", q: "How much did you pay, in rupees, and how?" },
      { label: "What went wrong", q: "What exactly went wrong?" },
      { label: "Complaint made", q: "Have you already complained to the seller or company, and what did they say?" },
      WRITTEN,
      WANT,
      ELSE,
    ],
    headline: "Getting a refund or remedy as a consumer",
    dos: [
      "Complain in writing to the seller or company by email, with the invoice, photos and a clear request (refund, replacement or repair) and a deadline.",
      "Call the National Consumer Helpline on 1915, which often resolves complaints before any case is filed.",
      "Keep the invoice, warranty card, order screenshots, payment proof and all messages.",
      "If it is not resolved, you can file a complaint with the Consumer Commission, including online through the e-Daakhil portal. Complaints generally have to be filed within two years, so please confirm the current limit.",
    ],
    donts: [
      "Do not throw away the product or packaging.",
      "Do not accept a verbal promise without a written confirmation.",
      "Do not pay extra \"processing\" fees to get your own refund.",
      "Do not leave it too long. There is a time limit to file.",
    ],
    next: [
      "Send the written complaint with a deadline.",
      "Call 1915 and note the complaint number.",
      "If still unresolved, prepare a consumer complaint with an advocate or on your own.",
    ],
    who: "The National Consumer Helpline (1915), then the Consumer Commission. A consumer advocate can help for larger claims.",
  },
  {
    id: "fraud",
    title: "I was cheated or scammed",
    match: /scam|fraud|cheat|cheated|duped|phishing|otp|fake|online payment|transferred money|forged|forgery|impersonat/i,
    laws: [
      { id: "BNS-318", plain: "Cheating, which means deceiving someone into handing over money or property, is a criminal offence." },
      { id: "BNS-316", plain: "Misusing money or property that was entrusted to someone is criminal breach of trust." },
      { id: "BNS-336", plain: "Making fake documents or signatures is forgery." },
      { id: "BSA-94", plain: "Keep any written proof: the law treats written records as strong evidence." },
    ],
    steps: [
      { label: "What happened", q: "In a sentence, how were you cheated or scammed?" },
      { label: "Amount lost", q: "How much money or what property was lost?" },
      { label: "How it was paid", q: "How was it paid: bank transfer, UPI, cash or something else?" },
      { label: "Time", q: "When did this happen, and how long ago?" },
      { label: "Contact with them", q: "Do you have the person's phone number, account details, or messages?" },
      { label: "Reported yet", q: "Have you told your bank or the police yet?" },
      WANT,
      ELSE,
    ],
    headline: "If you have been cheated or scammed",
    dos: [
      "For an online or UPI fraud, act within hours: call 1930 (the national cybercrime helpline) and report at cybercrime.gov.in, and tell your bank at once to try to block or freeze the transfer.",
      "Take screenshots and save messages, call logs, account numbers, receipts and links. Do not delete anything.",
      "Lodge a written complaint at the police station (or ask for an FIR to be registered) with the evidence attached, and keep the acknowledgement.",
      "Change passwords and block cards if any login or card detail was shared.",
    ],
    donts: [
      "Do not pay any \"recovery fee\" or \"release charge\" to anyone who offers to get your money back.",
      "Do not share OTPs, PINs or screen-sharing access with anyone.",
      "Do not confront the person aggressively or make threats.",
      "Do not wait. For online fraud, the first hours matter most.",
    ],
    next: [
      "Report on 1930 and cybercrime.gov.in now if money moved online.",
      "Inform the bank in writing and keep the complaint number.",
      "File the police complaint and keep copies of everything.",
    ],
    who: "Your bank and the cybercrime helpline 1930 first, then the police. An advocate can help if a police complaint is not taken.",
  },
  {
    id: "forced",
    title: "I was pressured or misled into signing",
    match: /forced|pressur|misled|tricked|didn'?t understand|blank (paper|stamp)|signed.*(without|under)|threatened.*sign|made me sign|coerc|undue influence/i,
    laws: [
      { id: "ICA-15", plain: "An agreement is valid only if consent is free. Consent obtained by force, pressure, fraud or misleading statements can make it voidable, which means you can cancel it." },
      { id: "ICA-23", plain: "An agreement whose object is unlawful, or that is against public policy, is void." },
      { id: "BSA-94", plain: "Written terms generally prevail over verbal promises, so what you signed matters." },
      { id: "LIM-55", plain: "A claim to cancel or recover must be made within the time limit." },
    ],
    steps: [
      { label: "What you signed", q: "What did you sign, for example an agreement, a blank paper or a cheque?" },
      { label: "How you were pressured", q: "How were you pressured or misled?" },
      { label: "When you signed", q: "When did you sign it?" },
      { label: "Copy held", q: "Do you have a copy of what you signed?" },
      { label: "Who else knew", q: "Was anyone else present, or has anyone seen the messages?" },
      { label: "Used against you", q: "Has the other side started to use it against you?" },
      WANT,
      ELSE,
    ],
    headline: "If you were forced or misled into signing",
    dos: [
      "Write down, today, exactly what happened, in order, with dates and names. Memory fades.",
      "Collect messages, recordings you made lawfully, and the names of anyone present.",
      "Ask for a copy of what you signed. You are entitled to see it.",
      "Take advice from an advocate quickly, because acting fast helps your case. If you were threatened or hurt, report it to the police.",
    ],
    donts: [
      "Do not sign anything else for the same people until you have taken advice.",
      "Do not ignore a notice or summons. Respond through an advocate.",
      "Do not destroy messages or documents.",
      "Do not assume that a signed paper cannot be challenged. Consent obtained by pressure or fraud can be challenged.",
    ],
    next: [
      "Write the timeline and gather the evidence.",
      "Get a copy of the document.",
      "Meet an advocate to decide whether to cancel it, deny it or negotiate.",
    ],
    who: "An advocate promptly. For threats or force, the police (112).",
  },
  {
    id: "breach",
    title: "The other side broke our agreement",
    match: /breach|broke (the|our)|violat|not (follow|deliver|complet)|backed out|cancel(l)?ed|agreement|contract|didn'?t (deliver|complete|finish)|penalty|damages|compensation/i,
    laws: [
      { id: "ICA-73", plain: "When someone breaks a contract, the other side can claim compensation for the loss that follows naturally from it." },
      { id: "ICA-74", plain: "A penalty clause is not enforced in full. Courts award reasonable compensation up to the stated amount." },
      { id: "SRA-14", plain: "In some cases a court can order a party to actually perform, but not for contracts that need continuous personal service." },
      { id: "ARB-7", plain: "If the agreement has an arbitration clause, the dispute must usually go to arbitration, not court." },
      { id: "LIM-55", plain: "A claim must be filed within the time limit, normally three years." },
    ],
    steps: [
      { label: "What was agreed", q: "What exactly was agreed between you?" },
      { label: "What was broken", q: "What did the other side fail to do?" },
      { label: "Your loss", q: "What loss or cost has this caused you, in rupees if you can say?" },
      WRITTEN,
      { label: "Dispute clause", q: "Does the agreement say what happens in a dispute, such as arbitration or a court in a particular city?" },
      { label: "Contact so far", q: "Have you raised it with them, and what did they say?" },
      WANT,
      ELSE,
    ],
    headline: "When someone breaks an agreement",
    dos: [
      "Read your agreement for the termination, notice, penalty and dispute clauses before you take any step.",
      "Send a written notice describing the breach, what you want fixed and by when. Keep proof of sending.",
      "Gather evidence of the loss: invoices, messages, payment proof and delivery records.",
      "Try a negotiated settlement or mediation first. It is faster and cheaper, and a written settlement is enforceable.",
    ],
    donts: [
      "Do not cancel the contract in anger without checking the notice clause. You can become the one in breach.",
      "Do not ignore an arbitration clause and rush to court.",
      "Do not make threats or public accusations.",
      "Do not let the time limit run out.",
    ],
    next: [
      "Make a one-page timeline.",
      "Send the written notice with a deadline.",
      "If not resolved, take it to an advocate to decide between arbitration, mediation and a court claim.",
    ],
    who: "An advocate who handles contract disputes, or a mediation centre if your agreement allows it.",
  },
];

/** A general plan for anything else. Uses fewer facts and always recommends a human lawyer. */
export const GENERAL: Playbook = {
  id: "general",
  title: "Your situation",
  match: /.^/,
  laws: [
    { id: "ICA-10", plain: "A valid agreement needs free consent, a lawful purpose and something of value exchanged." },
    { id: "LIM-55", plain: "Legal claims have time limits, so do not delay." },
  ],
  steps: [
    { label: "What happened", q: "In a sentence or two, what has happened?" },
    { label: "Who is involved", q: "Who is involved, and how are they connected to you?" },
    WHEN,
    WRITTEN,
    { label: "Loss or risk", q: "What have you lost, or what are you afraid will happen?" },
    WANT,
    ELSE,
  ],
  headline: "Your situation, in general terms",
  dos: [
    "Write down what happened in order, with dates, names and amounts.",
    "Collect every document, message, receipt and photo that relates to it, and keep copies safe.",
    "Put your request to the other side in writing, with a clear deadline, and keep proof that you sent it.",
    "Speak to an advocate soon, because time limits and evidence both matter.",
  ],
  donts: [
    "Do not sign anything you do not fully understand or that is blank.",
    "Do not delete messages or documents.",
    "Do not threaten, abuse or take the law into your own hands.",
    "Do not wait. Delay can cost you rights.",
  ],
  next: ["Write the timeline.", "Gather the documents.", "Book a consultation with an advocate who handles this kind of matter."],
  who: "An advocate who handles this kind of matter. Sandhi cannot fully assess a situation outside the problems it knows.",
};

/** Most specific problems first, so "my tenant is not paying rent" is not mistaken for unpaid fees. */
const ORDER = ["cheque", "deposit", "tenant_trouble", "landlord_trouble", "fraud", "forced", "consumer", "unpaid", "breach"];

export function playbookFor(text: string): Playbook | null {
  for (const id of ORDER) {
    const p = PLAYBOOKS.find((x) => x.id === id);
    if (p && p.match.test(text)) return p;
  }
  return null;
}

export function playbookById(id: string | null | undefined): Playbook | null {
  if (!id) return null;
  return id === GENERAL.id ? GENERAL : (PLAYBOOKS.find((p) => p.id === id) ?? null);
}

/** Words that mean someone may be in immediate danger. */
export const DANGER = /\b(kill|beat(ing|en)?|hit me|attack(ed)?|assault(ed)?|violen(t|ce)|weapon|knife|gun|locked (me|us) out|forced (me|us) out|threatening to (hurt|harm))\b/i;
