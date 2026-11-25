import type { RequestType } from '@softeng-app/db';

/**
 * A demo service request. Links to content or a collection are declared here,
 * even though the FK lives on Content / Collection, so each request reads as
 * one unit; the seed sets the FK on the other side.
 */
export interface SeedServiceRequest {
    /** Unique; collections.ts doesn't reference it, but the seed's lookups key on it. */
    name: string;
    type: RequestType;
    /** Employee `key` from employees.ts. */
    owner: string;
    /** Employee `key`; omitted = unassigned. */
    assignee?: string;
    /** Deadline relative to seed time, in days (negative = overdue); omitted = none. */
    deadlineInDays?: number;
    notes?: string;
    /** Content `displayName` from files.ts or links.ts. */
    linkedContent?: string;
    /** Collection `displayName` from collections.ts. */
    linkedCollection?: string;
}

export const serviceRequests: SeedServiceRequest[] = [
    {
        name: 'Review basement flood claim — Cedar Rapids',
        type: 'reviewClaim', owner: 'joey', assignee: 'dylan', deadlineInDays: 5,
        notes: 'Policyholder disputes the basement contents exclusion. Check against the SFIP Dwelling Form before we respond.',
        linkedContent: 'SFIP Dwelling Form',
    },
    {
        name: 'Assign adjuster for Gulf Coast CAT event',
        type: 'requestAdjuster', owner: 'ricardo', assignee: 'joey', deadlineInDays: 2,
        notes: 'Expect high claim volume after the storm. Follow the catastrophe playbook for staging.',
        linkedCollection: 'Catastrophe Response Kit',
    },
    {
        name: 'Check ICC claim status for elevated home',
        type: 'checkClaim', owner: 'oscar', assignee: 'ricardo', deadlineInDays: -3,
        notes: 'Policyholder called twice. ICC paperwork was submitted last month.',
        linkedContent: 'ICC Policyholder Processing Checklist',
    },
    {
        name: 'Review repetitive loss property renewal',
        type: 'reviewClaim', owner: 'dylan', assignee: 'oscar', deadlineInDays: 10,
        notes: 'Third flood claim in five years. Confirm severe repetitive loss designation before renewal.',
        linkedContent: 'Severe Repetitive Loss Properties',
    },
    {
        name: 'Validate loss development for Q3 report',
        type: 'checkClaim', owner: 'jake', assignee: 'nick', deadlineInDays: 14,
        notes: 'Q3 review numbers look off against the paid triangle. Can actuarial take a look?',
        linkedCollection: 'Reserving Fundamentals',
    },
    {
        name: 'Request adjuster for commercial property claim',
        type: 'requestAdjuster', owner: 'cameron', deadlineInDays: 7,
        notes: 'General Property Form claim, roughly $250k in damages. Still needs an adjuster.',
    },
    {
        name: 'Review condo association claim',
        type: 'reviewClaim', owner: 'wilson',
        notes: 'Building association claim referred from intake. No deadline set yet.',
        linkedContent: 'SFIP Residential Condominium Building Association Form',
    },
    {
        name: 'Check claim status after litigation notice',
        type: 'checkClaim', owner: 'hayden', assignee: 'ricardo', deadlineInDays: 1,
        notes: 'Received notice of intent to sue. Pull the claim history and loop in legal.',
        linkedContent: 'NFIP Litigation Manual (2023)',
    },
];
