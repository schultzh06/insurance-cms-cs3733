---
title: Claims Intake Modernization — Business Requirements
subtitle: Draft v0.4 for stakeholder review
---

# Background

First notice of loss (FNOL) for flood claims currently arrives by phone, email
and agent portal, and is re-keyed by hand into the claims system. Median time
from FNOL to adjuster assignment was 2.6 business days last quarter, against a
target of 1 day. During catastrophe events the backlog grows past a week.

# Goals

1. Capture FNOL once, in a structured form, from every channel.
2. Assign an adjuster automatically for straightforward claims.
3. Give policyholders a status page so they stop calling for updates.

# Out of scope

- Payment processing changes.
- Commercial (non-residential) claims, planned for phase 2.

# Stakeholders

| Group | Interest |
| --- | --- |
| Claims operations | Faster assignment, fewer status calls |
| Underwriting | Accurate loss data feeding renewal decisions |
| Agents | Fewer re-submissions, visibility into status |
| IT | Fit with the existing policy administration system |

# Functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Capture policy number, date of loss, cause of loss, and contact details | Must |
| FR-2 | Validate the policy is in force on the date of loss | Must |
| FR-3 | Allow photo and document upload at intake | Must |
| FR-4 | Auto-assign an adjuster when estimated loss is under $25,000 | Should |
| FR-5 | Send status updates by SMS and email | Should |
| FR-6 | Flag possible duplicate claims for the same property and date | Could |

# Non-functional requirements

- Intake form usable on a phone with a poor connection.
- Peak load of 2,000 FNOLs per hour during a catastrophe event.
- All uploaded files retained according to the document retention policy.

# Open questions

1. Should agents be able to submit FNOL on behalf of policyholders without a
   signature?
2. Which adjuster-assignment rules are fixed by contract with our independent
   adjusting firms?
3. Who owns the duplicate-claim rules — claims or the special investigations unit?
