import type { Persona } from '@softeng-app/db';

/** A link-type content item (Content.linkURL instead of a file). */
export interface SeedLink {
    url: string;
    displayName: string;
    targetPersona: Persona;
    tags: string[];
}

/**
 * Links checked to resolve when this list was written. YouTube links use the
 * full `watch?v=` form because the frontend's embed detection only matches
 * that form (not youtu.be or /shorts/).
 */
export const links: SeedLink[] = [
    // --- YouTube (rendered as embeds) ---
    { url: 'https://www.youtube.com/watch?v=OzMzec7lQWk', displayName: 'National Flood Insurance Program (FEMA)', targetPersona: 'underwriter', tags: ['nfip', 'video', 'fema'] },
    { url: 'https://www.youtube.com/watch?v=teZMg_hOAdI', displayName: 'What Is an Insurance Underwriter?', targetPersona: 'underwriter', tags: ['underwriting', 'video', 'training'] },
    { url: 'https://www.youtube.com/watch?v=29oN-mzEPcY', displayName: 'How to Read a Loss Triangle', targetPersona: 'actuarialAnalyst', tags: ['reserving', 'loss triangle', 'video'] },
    { url: 'https://www.youtube.com/watch?v=cVLle0YUNyc', displayName: 'Loss Reserving: Intro to the Chain-Ladder Method', targetPersona: 'actuarialAnalyst', tags: ['reserving', 'chain ladder', 'video'] },
    { url: 'https://www.youtube.com/watch?v=ZSKMCma2f0E', displayName: 'What Is an Actuary? (Society of Actuaries)', targetPersona: 'actuarialAnalyst', tags: ['careers', 'video', 'training'] },
    { url: 'https://www.youtube.com/watch?v=Gfu26nNvrsk', displayName: 'The Ultimate XLOOKUP Tutorial', targetPersona: 'excelOperator', tags: ['excel', 'xlookup', 'video', 'training'] },
    { url: 'https://www.youtube.com/watch?v=dvbLrwD2SpA', displayName: 'Excel Pivot Tables: Step-by-Step Tutorial', targetPersona: 'excelOperator', tags: ['excel', 'pivot tables', 'video', 'training'] },
    { url: 'https://www.youtube.com/watch?v=0zjQHrkZ_70', displayName: 'Business Analyst Training: Requirements Gathering', targetPersona: 'businessAnalyst', tags: ['requirements', 'video', 'training'] },
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', displayName: 'Mandatory Annual Compliance Training (Required Viewing)', targetPersona: 'businessOps', tags: ['compliance', 'video', 'training', 'required'] },

    // --- Web pages (rendered as link previews) ---
    { url: 'https://www.floodsmart.gov/', displayName: 'FloodSmart — Official NFIP Consumer Site', targetPersona: 'businessOps', tags: ['nfip', 'policyholders', 'reference'] },
    { url: 'https://agents.floodsmart.gov/manuals', displayName: 'NFIP Manuals for Agents and Adjusters', targetPersona: 'underwriter', tags: ['nfip', 'manuals', 'reference'] },
    { url: 'https://www.ecfr.gov/current/title-44/chapter-I/subchapter-B/part-61', displayName: '44 CFR Part 61 — Insurance Coverage and Rates', targetPersona: 'admin', tags: ['regulation', 'nfip', 'sfip'] },
    { url: 'https://en.wikipedia.org/wiki/National_Flood_Insurance_Program', displayName: 'National Flood Insurance Program (Wikipedia)', targetPersona: 'businessAnalyst', tags: ['nfip', 'background'] },
    { url: 'https://en.wikipedia.org/wiki/Chain-ladder_method', displayName: 'Chain-Ladder Method (Wikipedia)', targetPersona: 'actuarialAnalyst', tags: ['reserving', 'chain ladder', 'reference'] },
    { url: 'https://en.wikipedia.org/wiki/Underwriting', displayName: 'Underwriting (Wikipedia)', targetPersona: 'underwriter', tags: ['underwriting', 'reference'] },
    { url: 'https://support.microsoft.com/en-us/office/xlookup-function-b7fd680e-6d10-43e6-84f9-88eae8bf5929', displayName: 'XLOOKUP Function — Microsoft Support', targetPersona: 'excelOperator', tags: ['excel', 'xlookup', 'reference'] },
];
