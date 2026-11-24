import type { ContentType, Persona, Status } from '@softeng-app/db';

/**
 * Metadata for a file-type content item. `file` is the name in `seed-data/files/`;
 * the seed fails if a manifest entry has no file or a file has no entry.
 */
export interface SeedFile {
    file: string;
    displayName: string;
    targetPersona: Persona;
    /** Employee `key` from employees.ts. */
    owner: string;
    contentType: ContentType;
    status: Status;
    tags: string[];
    /**
     * Expiration relative to seed time, in days (negative = already expired).
     * Relative so the "Expired" / "Expiring Soon" demo states stay current on every re-seed.
     */
    expiresInDays?: number;
}

/** Shorthand builders keep the table below readable. */
const ref = (e: Omit<SeedFile, 'contentType'>): SeedFile => ({ ...e, contentType: 'reference' });
const wf = (e: Omit<SeedFile, 'contentType'>): SeedFile => ({ ...e, contentType: 'workflow' });

export const files: SeedFile[] = [
    // --- Underwriting ---
    ref({ file: 'nfip-flood-insurance-manual-1-introduction.pdf', displayName: 'NFIP Flood Insurance Manual — 1. Introduction', targetPersona: 'underwriter', owner: 'dylan', status: 'complete', tags: ['nfip', 'manual', 'underwriting'] }),
    ref({ file: 'nfip-flood-insurance-manual-2-before-you-start.pdf', displayName: 'NFIP Flood Insurance Manual — 2. Before You Start', targetPersona: 'underwriter', owner: 'dylan', status: 'complete', tags: ['nfip', 'manual', 'underwriting'] }),
    ref({ file: 'nfip-flood-insurance-manual-3-how-to-write.pdf', displayName: 'NFIP Flood Insurance Manual — 3. How to Write', targetPersona: 'underwriter', owner: 'dylan', status: 'complete', tags: ['nfip', 'manual', 'underwriting'] }),
    ref({ file: 'nfip-flood-insurance-manual-4-how-to-endorse.pdf', displayName: 'NFIP Flood Insurance Manual — 4. How to Endorse', targetPersona: 'underwriter', owner: 'oscar', status: 'complete', tags: ['nfip', 'manual', 'underwriting', 'endorsements'] }),
    ref({ file: 'nfip-flood-insurance-manual-6-how-to-cancel.pdf', displayName: 'NFIP Flood Insurance Manual — 6. How to Cancel', targetPersona: 'underwriter', owner: 'oscar', status: 'complete', tags: ['nfip', 'manual', 'underwriting', 'cancellations'] }),
    ref({ file: 'nfip-flood-insurance-manual-quick-start-guide.pdf', displayName: 'NFIP Flood Insurance Manual — Quick Start Guide', targetPersona: 'underwriter', owner: 'oscar', status: 'complete', tags: ['nfip', 'manual', 'quick start'] }),
    ref({ file: 'nfip-underwriting-methodology.pdf', displayName: 'NFIP Underwriting Methodology', targetPersona: 'underwriter', owner: 'dylan', status: 'complete', tags: ['nfip', 'underwriting', 'methodology'] }),
    ref({ file: 'nfip-underwriting-sample-scenarios.pdf', displayName: 'NFIP Underwriting Sample Scenarios', targetPersona: 'underwriter', owner: 'oscar', status: 'complete', tags: ['nfip', 'underwriting', 'examples'] }),
    ref({ file: 'nfip-severe-repetitive-loss-properties.pdf', displayName: 'Severe Repetitive Loss Properties', targetPersona: 'underwriter', owner: 'dylan', status: 'complete', tags: ['nfip', 'underwriting', 'srl'] }),
    ref({ file: 'nfip-documentation-requirements-guide.pdf', displayName: 'NFIP Documentation Requirements Guide', targetPersona: 'underwriter', owner: 'oscar', status: 'complete', tags: ['nfip', 'documentation'] }),
    ref({ file: 'residential-flood-underwriting-guidelines.docx', displayName: 'Residential Flood Underwriting Guidelines', targetPersona: 'underwriter', owner: 'dylan', status: 'inProgress', tags: ['underwriting', 'guidelines', 'residential'], expiresInDays: 10 }),
    wf({ file: 'new-business-referral-checklist.docx', displayName: 'New Business Referral Checklist', targetPersona: 'underwriter', owner: 'oscar', status: 'complete', tags: ['underwriting', 'checklist', 'new business'] }),
    wf({ file: 'new-business-referral-checklist-legacy.doc', displayName: 'New Business Referral Checklist (Legacy .doc)', targetPersona: 'underwriter', owner: 'oscar', status: 'complete', tags: ['underwriting', 'checklist', 'legacy'], expiresInDays: -30 }),
    ref({ file: 'sfip-dwelling-form.pdf', displayName: 'SFIP Dwelling Form', targetPersona: 'underwriter', owner: 'dylan', status: 'complete', tags: ['sfip', 'policy forms', 'regulation'] }),
    ref({ file: 'sfip-general-property-form.pdf', displayName: 'SFIP General Property Form', targetPersona: 'underwriter', owner: 'dylan', status: 'complete', tags: ['sfip', 'policy forms', 'regulation'] }),
    ref({ file: 'sfip-residential-condominium-building-form.pdf', displayName: 'SFIP Residential Condominium Building Association Form', targetPersona: 'underwriter', owner: 'oscar', status: 'complete', tags: ['sfip', 'policy forms', 'regulation', 'condo'] }),
    ref({ file: 'sfip-dwelling-form-scanned-copy.pdf', displayName: 'SFIP Dwelling Form (Scanned Copy)', targetPersona: 'underwriter', owner: 'oscar', status: 'new', tags: ['sfip', 'policy forms', 'scan'] }),

    // --- Claims / business operations ---
    ref({ file: 'nfip-claims-manual-claims-journey.pdf', displayName: 'NFIP Claims Manual — The Claims Journey', targetPersona: 'businessOps', owner: 'joey', status: 'complete', tags: ['nfip', 'claims', 'manual'] }),
    ref({ file: 'nfip-claims-manual-increased-cost-of-compliance.pdf', displayName: 'NFIP Claims Manual — Increased Cost of Compliance', targetPersona: 'businessOps', owner: 'joey', status: 'complete', tags: ['nfip', 'claims', 'icc'] }),
    ref({ file: 'nfip-claims-manual-special-handling-for-adjusters.pdf', displayName: 'NFIP Claims Manual — Special Handling for Adjusters', targetPersona: 'businessOps', owner: 'ricardo', status: 'complete', tags: ['nfip', 'claims', 'adjusters'] }),
    ref({ file: 'nfip-claims-bvla-method-and-faqs.pdf', displayName: 'Building Valuation (BVLA) Method and FAQs', targetPersona: 'businessOps', owner: 'ricardo', status: 'complete', tags: ['nfip', 'claims', 'valuation'] }),
    ref({ file: 'nfip-claims-structural-drying.pdf', displayName: 'Structural Drying Guidance', targetPersona: 'businessOps', owner: 'joey', status: 'complete', tags: ['nfip', 'claims', 'mitigation'] }),
    ref({ file: 'nfip-policyholder-rights.pdf', displayName: 'NFIP Policyholder Rights', targetPersona: 'businessOps', owner: 'ricardo', status: 'complete', tags: ['nfip', 'policyholders', 'rights'] }),
    ref({ file: 'nfip-definitions-and-acronyms.pdf', displayName: 'NFIP Definitions and Acronyms', targetPersona: 'businessOps', owner: 'joey', status: 'complete', tags: ['nfip', 'glossary', 'reference'] }),
    ref({ file: 'assignment-of-coverage-d.pdf', displayName: 'Assignment of Coverage D Form', targetPersona: 'businessOps', owner: 'ricardo', status: 'complete', tags: ['icc', 'forms', 'claims'] }),
    ref({ file: 'icc-fee-schedule.pdf', displayName: 'ICC Fee Schedule', targetPersona: 'businessOps', owner: 'joey', status: 'complete', tags: ['icc', 'fees', 'claims'], expiresInDays: 5 }),
    wf({ file: 'icc-policyholder-processing-checklist.pdf', displayName: 'ICC Policyholder Processing Checklist', targetPersona: 'businessOps', owner: 'ricardo', status: 'complete', tags: ['icc', 'checklist', 'claims'] }),
    wf({ file: 'icc-checklist-scan.png', displayName: 'ICC Checklist (Scanned)', targetPersona: 'businessOps', owner: 'ricardo', status: 'new', tags: ['icc', 'checklist', 'scan'] }),
    ref({ file: 'icc-claim-forms-packet.zip', displayName: 'ICC Claim Forms Packet', targetPersona: 'businessOps', owner: 'joey', status: 'complete', tags: ['icc', 'forms', 'packet'] }),
    ref({ file: 'nfip-litigation-manual-2023.pdf', displayName: 'NFIP Litigation Manual (2023)', targetPersona: 'businessOps', owner: 'ricardo', status: 'complete', tags: ['nfip', 'litigation', 'legal'], expiresInDays: -90 }),
    ref({ file: 'wyo-bulletin-w-13025a.pdf', displayName: 'WYO Bulletin W-13025a', targetPersona: 'businessOps', owner: 'joey', status: 'complete', tags: ['wyo', 'bulletin'] }),
    ref({ file: 'wyo-bulletin-w-23013.pdf', displayName: 'WYO Bulletin W-23013', targetPersona: 'businessOps', owner: 'joey', status: 'complete', tags: ['wyo', 'bulletin'] }),
    wf({ file: 'adjuster-assignment-procedure.docx', displayName: 'Adjuster Assignment Procedure', targetPersona: 'businessOps', owner: 'ricardo', status: 'inProgress', tags: ['claims', 'adjusters', 'procedure'] }),
    wf({ file: 'catastrophe-response-playbook.pptx', displayName: 'Catastrophe Response Playbook', targetPersona: 'businessOps', owner: 'joey', status: 'complete', tags: ['catastrophe', 'playbook', 'claims'], expiresInDays: 20 }),
    wf({ file: 'catastrophe-response-playbook-legacy.ppt', displayName: 'Catastrophe Response Playbook (Legacy .ppt)', targetPersona: 'businessOps', owner: 'joey', status: 'complete', tags: ['catastrophe', 'playbook', 'legacy'], expiresInDays: -60 }),
    ref({ file: 'after-hours-escalation-contacts.txt', displayName: 'After-Hours Escalation Contacts', targetPersona: 'businessOps', owner: 'ricardo', status: 'complete', tags: ['contacts', 'escalation', 'on call'] }),
    ref({ file: 'flooded-street-missouri.jpg', displayName: 'Flooded Street, Missouri (FEMA Photo)', targetPersona: 'businessOps', owner: 'joey', status: 'complete', tags: ['photo', 'flood', 'field'] }),
    ref({ file: 'damaged-home-interior-kentucky.jpg', displayName: 'Damaged Home Interior, Kentucky (FEMA Photo)', targetPersona: 'businessOps', owner: 'ricardo', status: 'complete', tags: ['photo', 'flood', 'field'] }),
    ref({ file: 'fema-hurricane-harvey-shelter-in-place-psa.mp4', displayName: 'FEMA Hurricane Harvey Shelter-in-Place PSA', targetPersona: 'businessOps', owner: 'joey', status: 'complete', tags: ['video', 'fema', 'catastrophe'] }),
    ref({ file: 'noaa-flash-flooding-satellite-briefing.webm', displayName: 'NOAA Flash Flooding Satellite Briefing', targetPersona: 'businessOps', owner: 'ricardo', status: 'complete', tags: ['video', 'noaa', 'catastrophe'] }),
    ref({ file: 'flash-flooding-satellite-loop.gif', displayName: 'Flash Flooding Satellite Loop', targetPersona: 'businessOps', owner: 'ricardo', status: 'complete', tags: ['animation', 'noaa', 'catastrophe'] }),

    // --- Business analysis ---
    ref({ file: 'claims-intake-business-requirements.docx', displayName: 'Claims Intake Business Requirements', targetPersona: 'businessAnalyst', owner: 'jake', status: 'inProgress', tags: ['requirements', 'claims intake'] }),
    wf({ file: 'claims-workflow-diagram.svg', displayName: 'Claims Workflow Diagram (SVG)', targetPersona: 'businessAnalyst', owner: 'hayden', status: 'complete', tags: ['workflow', 'diagram', 'claims'] }),
    wf({ file: 'claims-workflow-diagram.png', displayName: 'Claims Workflow Diagram (PNG)', targetPersona: 'businessAnalyst', owner: 'hayden', status: 'complete', tags: ['workflow', 'diagram', 'claims'] }),
    ref({ file: 'q3-claims-process-review.pptx', displayName: 'Q3 Claims Process Review', targetPersona: 'businessAnalyst', owner: 'jake', status: 'complete', tags: ['review', 'claims', 'quarterly'] }),
    ref({ file: 'weekly-claims-export.csv', displayName: 'Weekly Claims Export', targetPersona: 'businessAnalyst', owner: 'hayden', status: 'new', tags: ['claims', 'export', 'data'], expiresInDays: 3 }),
    ref({ file: 'nfip-director-remarks.mp3', displayName: 'NFIP Director Remarks', targetPersona: 'businessAnalyst', owner: 'jake', status: 'complete', tags: ['audio', 'nfip', 'leadership'] }),
    ref({ file: 'nfip-director-remarks-excerpt.wav', displayName: 'NFIP Director Remarks Excerpt (WAV)', targetPersona: 'businessAnalyst', owner: 'jake', status: 'complete', tags: ['audio', 'nfip', 'format test'] }),
    ref({ file: 'nfip-director-remarks-excerpt.ogg', displayName: 'NFIP Director Remarks Excerpt (OGG)', targetPersona: 'businessAnalyst', owner: 'jake', status: 'complete', tags: ['audio', 'nfip', 'format test'] }),
    ref({ file: 'nfip-director-remarks-excerpt.m4a', displayName: 'NFIP Director Remarks Excerpt (M4A)', targetPersona: 'businessAnalyst', owner: 'hayden', status: 'complete', tags: ['audio', 'nfip', 'format test'] }),
    ref({ file: 'nfip-director-remarks-excerpt.aac', displayName: 'NFIP Director Remarks Excerpt (AAC)', targetPersona: 'businessAnalyst', owner: 'hayden', status: 'complete', tags: ['audio', 'nfip', 'format test'] }),
    ref({ file: 'nfip-director-remarks-excerpt.flac', displayName: 'NFIP Director Remarks Excerpt (FLAC)', targetPersona: 'businessAnalyst', owner: 'hayden', status: 'complete', tags: ['audio', 'nfip', 'format test'] }),

    // --- Actuarial ---
    ref({ file: 'residential-flood-rate-indication-summary.md', displayName: 'Residential Flood Rate Indication Summary', targetPersona: 'actuarialAnalyst', owner: 'luke', status: 'inProgress', tags: ['pricing', 'rate indication', 'residential'] }),
    ref({ file: 'paid-loss-development-triangle.xlsx', displayName: 'Paid Loss Development Triangle', targetPersona: 'actuarialAnalyst', owner: 'nick', status: 'complete', tags: ['reserving', 'loss triangle'] }),
    ref({ file: 'paid-loss-development-triangle-legacy.xls', displayName: 'Paid Loss Development Triangle (Legacy .xls)', targetPersona: 'actuarialAnalyst', owner: 'nick', status: 'complete', tags: ['reserving', 'loss triangle', 'legacy'], expiresInDays: -14 }),
    ref({ file: 'loss-ratio-by-accident-year.png', displayName: 'Loss Ratio by Accident Year', targetPersona: 'actuarialAnalyst', owner: 'luke', status: 'complete', tags: ['loss ratio', 'chart'] }),

    // --- Excel operations ---
    wf({ file: 'policy-rating-worksheet.xlsx', displayName: 'Policy Rating Worksheet', targetPersona: 'excelOperator', owner: 'cameron', status: 'inProgress', tags: ['excel', 'rating', 'worksheet'] }),
    ref({ file: 'premium-by-territory-summary.xlsx', displayName: 'Premium by Territory Summary', targetPersona: 'excelOperator', owner: 'philip', status: 'complete', tags: ['excel', 'premium', 'territory'], expiresInDays: 25 }),
    ref({ file: 'premium-by-territory.csv', displayName: 'Premium by Territory (CSV)', targetPersona: 'excelOperator', owner: 'philip', status: 'complete', tags: ['premium', 'territory', 'data'] }),

    // --- Company-wide (admin) ---
    ref({ file: 'content-portal-onboarding-guide.md', displayName: 'Content Portal Onboarding Guide', targetPersona: 'admin', owner: 'wilson', status: 'complete', tags: ['onboarding', 'guide'] }),
    ref({ file: 'document-retention-policy.html', displayName: 'Document Retention Policy', targetPersona: 'admin', owner: 'wilson', status: 'complete', tags: ['policy', 'retention', 'compliance'] }),
    ref({ file: 'organization-chart.webp', displayName: 'Organization Chart', targetPersona: 'admin', owner: 'wilson', status: 'complete', tags: ['org chart', 'company'] }),
];
