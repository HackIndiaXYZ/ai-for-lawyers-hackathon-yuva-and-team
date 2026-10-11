/**
 * Where a provision's wording was cross-checked. India Code (the official database) blocks automated
 * reading, so these checks used other published copies of the Acts. They are NOT a substitute for reading the
 * provision on India Code, and the page says so. Entries not listed here were written from general knowledge.
 */
export interface Provenance {
  checked: string; // ISO date
  where: string;
  url: string;
}

const D = "2026-10-11";

export const PROVENANCE: Record<string, Provenance> = {
  "ICA-74": { checked: D, where: "lawx.in (Indian Contract Act text)", url: "https://lawx.in/acts/section/6/106/1280" },
  "TPA-105": { checked: D, where: "vidhijudicial.com (Transfer of Property Act, ss.105 to 117)", url: "https://vidhijudicial.com/sec-105-to-117-chapter-v-(of-leases-of-immoveable-property)-the-transfer-of-property-act,-1882.html" },
  "TPA-106": { checked: D, where: "vidhijudicial.com (Transfer of Property Act, ss.105 to 117)", url: "https://vidhijudicial.com/sec-105-to-117-chapter-v-(of-leases-of-immoveable-property)-the-transfer-of-property-act,-1882.html" },
  "TPA-107": { checked: D, where: "vidhijudicial.com (Transfer of Property Act, ss.105 to 117)", url: "https://vidhijudicial.com/sec-105-to-117-chapter-v-(of-leases-of-immoveable-property)-the-transfer-of-property-act,-1882.html" },
  "TPA-108": { checked: D, where: "vidhijudicial.com (Transfer of Property Act, ss.105 to 117)", url: "https://vidhijudicial.com/sec-105-to-117-chapter-v-(of-leases-of-immoveable-property)-the-transfer-of-property-act,-1882.html" },
  "REG-17": { checked: D, where: "Cyril Amarchand Mangaldas, on the Supreme Court's ruling on leases", url: "https://corporate.cyrilamarchandblogs.com/2021/02/time-is-of-the-essence-for-registration-of-a-lease/" },
  "REG-23": { checked: D, where: "Cyril Amarchand Mangaldas, on the Supreme Court's ruling on leases", url: "https://corporate.cyrilamarchandblogs.com/2021/02/time-is-of-the-essence-for-registration-of-a-lease/" },
  "REG-49": { checked: D, where: "Cyril Amarchand Mangaldas, on the Supreme Court's ruling on leases", url: "https://corporate.cyrilamarchandblogs.com/2021/02/time-is-of-the-essence-for-registration-of-a-lease/" },
  "CRA-17": { checked: D, where: "copyright.gov.in (Copyright Act 1957, Chapter IV)", url: "https://copyright.gov.in/Copyright_Act_1957/chapter_iv.html" },
  "CRA-19": { checked: D, where: "copyright.gov.in (Copyright Act 1957, Chapter IV)", url: "https://copyright.gov.in/Copyright_Act_1957/chapter_iv.html" },
};

export function formatChecked(p: Provenance): string {
  const [y, m, d] = p.checked.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}
