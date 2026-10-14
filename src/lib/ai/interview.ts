import type { Stage } from "./schemas";

/**
 * The demo-mode interview, one small question at a time. The live AI follows the same idea from its prompt.
 * A step with a `key` is skipped when that detail is already known (for example from a voice call).
 */
export interface Step {
  key?: string;
  stage: Stage;
  q: string;
}

const COMMON_WHATIFS: Step[] = [
  { stage: "what-ifs", q: "What should happen if a payment is late?" },
  { stage: "what-ifs", q: "What should happen if one side wants to leave early?" },
  { stage: "what-ifs", q: "What should happen if there is a dispute that you cannot settle between yourselves?" },
];
const SPECIAL: Step = { stage: "special conditions", q: "Is there anything unusual you want included or left out?" };

export const INTERVIEW: Record<string, Step[]> = {
  "Residential Rent Agreement": [
    { stage: "background", q: "Is anything about this tenancy already agreed or written down?" },
    { stage: "background", q: "How do you know the other person?" },
    { key: "landlord_name", stage: "parties", q: "What is the landlord's full name?" },
    { key: "tenant_name", stage: "parties", q: "What is the tenant's full name?" },
    { key: "property_address", stage: "parties", q: "What is the full address of the property?" },
    { key: "monthly_rent", stage: "terms", q: "What is the monthly rent?" },
    { key: "security_deposit", stage: "terms", q: "How much is the security deposit?" },
    { key: "start_date", stage: "terms", q: "On what date does the tenancy start?" },
    { key: "term", stage: "terms", q: "How long will the tenancy run?" },
    { key: "notice_period", stage: "terms", q: "How many days' notice should either side give to end it?" },
    { stage: "what-ifs", q: "What should happen if the rent is paid late?" },
    { stage: "what-ifs", q: "What should happen if the tenant wants to leave early?" },
    { stage: "what-ifs", q: "Who should pay for repairs and damage?" },
    SPECIAL,
  ],
  "Freelance Services Agreement": [
    { stage: "background", q: "Is anything about this work already agreed or written down?" },
    { key: "client_name", stage: "parties", q: "What is the client's full name or company name?" },
    { key: "freelancer_name", stage: "parties", q: "What is the freelancer's full name?" },
    { key: "scope", stage: "terms", q: "What exactly will be delivered?" },
    { key: "fee", stage: "terms", q: "What is the total fee?" },
    { key: "deadline", stage: "terms", q: "By what date should the work be delivered?" },
    { stage: "terms", q: "How many rounds of changes are included in the fee?" },
    ...COMMON_WHATIFS,
    { stage: "special conditions", q: "Who should own the finished work once it is paid for?" },
    SPECIAL,
  ],
  "Non-Disclosure Agreement": [
    { stage: "background", q: "Is anything about this already agreed or written down?" },
    { key: "disclosing_party", stage: "parties", q: "Who is sharing the confidential information?" },
    { key: "receiving_party", stage: "parties", q: "Who is receiving it?" },
    { key: "purpose", stage: "terms", q: "What is the purpose of sharing the information?" },
    { key: "duration", stage: "terms", q: "For how long should the information stay confidential?" },
    { stage: "terms", q: "What counts as confidential information here?" },
    { stage: "what-ifs", q: "What should happen if the information is leaked?" },
    { stage: "what-ifs", q: "What should the receiver do with the material when the arrangement ends?" },
    SPECIAL,
  ],
  "Employment Agreement": [
    { stage: "background", q: "Is anything about this job already agreed or written down?" },
    { key: "employer_name", stage: "parties", q: "What is the employer's full or company name?" },
    { key: "employee_name", stage: "parties", q: "What is the employee's full name?" },
    { key: "role", stage: "terms", q: "What is the job title?" },
    { key: "salary", stage: "terms", q: "What is the monthly salary?" },
    { key: "start_date", stage: "terms", q: "On what date does the job start?" },
    { stage: "terms", q: "How long is the probation, if there is one?" },
    { stage: "terms", q: "How much notice should either side give to end the job?" },
    { stage: "what-ifs", q: "What should happen if the employee is dismissed for misconduct?" },
    { stage: "what-ifs", q: "What should happen to the work the employee creates during the job?" },
    SPECIAL,
  ],
  "Sale of Movable Property": [
    { stage: "background", q: "Is anything about this sale already agreed or written down?" },
    { key: "seller_name", stage: "parties", q: "What is the seller's full name?" },
    { key: "buyer_name", stage: "parties", q: "What is the buyer's full name?" },
    { key: "item", stage: "terms", q: "What exactly is being sold, with any identifying details such as model or registration number?" },
    { key: "price", stage: "terms", q: "What is the price?" },
    { key: "delivery_date", stage: "terms", q: "On what date will the item be handed over?" },
    { stage: "terms", q: "How will the buyer pay?" },
    { stage: "what-ifs", q: "Is there any loan, pledge or pending dues on the item?" },
    { stage: "what-ifs", q: "What should happen if the item turns out to have a defect after the sale?" },
    SPECIAL,
  ],
};

export const ASK_TYPE = "What kind of agreement do you need: for example a rent agreement, a freelance contract, an NDA, an employment contract or a sale?";

/**
 * The next step to ask: the first one not yet asked in this conversation, skipping details already known.
 * `asked` is the text of what Sandhi has already said. Returns null when the interview is finished.
 */
export function nextStep(type: string | null, known: Record<string, string>, asked: string): Step | null {
  const steps = type ? INTERVIEW[type] : undefined;
  if (!steps) return null;
  for (const s of steps) {
    if (asked.includes(s.q)) continue;
    if (s.key && known[s.key]) continue;
    return s;
  }
  return null;
}
