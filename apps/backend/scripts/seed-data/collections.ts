/** A demo collection with its items in display order. */
export interface SeedCollection {
    /** Unique; service-requests.ts links collections by this name. */
    displayName: string;
    /** Employee `key` from employees.ts. */
    owner: string;
    public: boolean;
    /** Content `displayName`s from files.ts or links.ts, in `position` order. */
    items: string[];
    /** Employee `key`s who favorited it; private collections should only list the owner. */
    favoritedBy?: string[];
}

/**
 * Collections per owner vary on purpose (some have none) so the demo shows
 * both full and empty "My Collections" states.
 */
export const collections: SeedCollection[] = [
    // --- Underwriting ---
    {
        displayName: 'NFIP Manual Essentials', owner: 'dylan', public: true,
        items: [
            'NFIP Flood Insurance Manual — Quick Start Guide',
            'NFIP Flood Insurance Manual — 1. Introduction',
            'NFIP Flood Insurance Manual — 2. Before You Start',
            'NFIP Flood Insurance Manual — 3. How to Write',
            'NFIP Flood Insurance Manual — 4. How to Endorse',
            'NFIP Flood Insurance Manual — 6. How to Cancel',
        ],
        favoritedBy: ['oscar', 'joey', 'wilson'],
    },
    {
        displayName: 'SFIP Policy Forms', owner: 'dylan', public: true,
        items: ['SFIP Dwelling Form', 'SFIP General Property Form', 'SFIP Residential Condominium Building Association Form'],
        favoritedBy: ['ricardo'],
    },
    {
        displayName: 'Underwriter Onboarding', owner: 'dylan', public: true,
        items: ['What Is an Insurance Underwriter?', 'Underwriting (Wikipedia)', 'National Flood Insurance Program (FEMA)', 'Residential Flood Underwriting Guidelines'],
    },
    {
        displayName: 'Referral Prep', owner: 'oscar', public: false,
        items: ['New Business Referral Checklist', 'NFIP Documentation Requirements Guide', 'NFIP Underwriting Sample Scenarios'],
        favoritedBy: ['oscar'],
    },
    {
        displayName: 'Rating Methodology', owner: 'oscar', public: true,
        items: ['NFIP Underwriting Methodology', 'Residential Flood Rate Indication Summary', 'Severe Repetitive Loss Properties'],
        favoritedBy: ['luke'],
    },

    // --- Business analysis ---
    {
        displayName: 'Claims Process Redesign', owner: 'jake', public: true,
        items: ['Claims Intake Business Requirements', 'Claims Workflow Diagram (SVG)', 'Q3 Claims Process Review', 'Business Analyst Training: Requirements Gathering'],
        favoritedBy: ['hayden', 'joey'],
    },
    {
        displayName: 'Director Remarks Archive', owner: 'jake', public: false,
        items: ['NFIP Director Remarks', 'NFIP Director Remarks Excerpt (WAV)', 'NFIP Director Remarks Excerpt (M4A)'],
    },
    {
        displayName: 'Weekly Reporting', owner: 'hayden', public: true,
        items: ['Weekly Claims Export', 'Claims Workflow Diagram (PNG)'],
    },

    // --- Actuarial ---
    {
        displayName: 'Reserving Fundamentals', owner: 'luke', public: true,
        items: [
            'How to Read a Loss Triangle',
            'Loss Reserving: Intro to the Chain-Ladder Method',
            'Chain-Ladder Method (Wikipedia)',
            'Paid Loss Development Triangle',
            'Loss Ratio by Accident Year',
        ],
        favoritedBy: ['nick', 'jake'],
    },
    {
        displayName: 'Actuarial Careers', owner: 'luke', public: true,
        items: ['What Is an Actuary? (Society of Actuaries)'],
    },

    // --- Excel ---
    {
        displayName: 'Excel Skills', owner: 'cameron', public: true,
        items: ['The Ultimate XLOOKUP Tutorial', 'XLOOKUP Function — Microsoft Support', 'Excel Pivot Tables: Step-by-Step Tutorial', 'Policy Rating Worksheet'],
        favoritedBy: ['philip', 'hayden'],
    },

    // --- Business ops ---
    {
        displayName: 'Catastrophe Response Kit', owner: 'joey', public: true,
        items: ['Catastrophe Response Playbook', 'Adjuster Assignment Procedure', 'After-Hours Escalation Contacts', 'Structural Drying Guidance', 'NOAA Flash Flooding Satellite Briefing'],
        favoritedBy: ['ricardo', 'john'],
    },
    {
        displayName: 'ICC Claims', owner: 'joey', public: true,
        items: ['NFIP Claims Manual — Increased Cost of Compliance', 'ICC Fee Schedule', 'ICC Policyholder Processing Checklist', 'ICC Claim Forms Packet'],
        favoritedBy: ['ricardo'],
    },
    {
        displayName: 'WYO Bulletins', owner: 'joey', public: false,
        items: ['WYO Bulletin W-13025a', 'WYO Bulletin W-23013'],
    },
    {
        displayName: 'Adjuster Reference', owner: 'ricardo', public: true,
        items: ['NFIP Claims Manual — Special Handling for Adjusters', 'Building Valuation (BVLA) Method and FAQs', 'NFIP Policyholder Rights', 'NFIP Definitions and Acronyms'],
        favoritedBy: ['joey', 'dylan'],
    },

    // --- Admin ---
    {
        displayName: 'New Hire Packet', owner: 'wilson', public: true,
        items: ['Content Portal Onboarding Guide', 'Organization Chart', 'Document Retention Policy', 'Mandatory Annual Compliance Training (Required Viewing)'],
        favoritedBy: ['john', 'cameron', 'philip'],
    },
];
