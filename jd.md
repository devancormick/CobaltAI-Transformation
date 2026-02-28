## AI Automation Partnership Test Project

### Overview
We operate four businesses across New Zealand spanning labour hire, entertainment, hospitality, and software. We are undertaking a digital transformation to become an AI-native operation by automating repetitive tasks, connecting data sources, and designing architecture for future autonomous agents.

This test project focuses on automated review response routing driven by Claude sentiment analysis (not star rating alone), with two scenarios:

- Scenario 1: Google My Business (Make.com integration; API-connected)
- Scenario 2: Sourcr (browser automation; no API)

### Core routing logic (applies to both scenarios)
Claude classifies each review using both star rating and sentiment/content analysis, then routes it:

- 1 star (Particularly bad): HOLD, no draft generated until leadership provides context, alert leadership immediately
- 2 stars (Bad): draft generated, routed to senior leadership for approval before posting
- 3 stars (Neutral): draft generated, standard approval flow
- 4 stars (Good): draft generated, standard approval flow
- 5 stars (Exceptional): draft generated + standard approval flow, plus celebration message posted to the team channel

Critical design note:
Routing must be driven by Claude sentiment analysis of the review content, not star rating alone. A 1-star spam review routes differently from a 1-star describing a serious incident.

Team channel routing:
- Office-based businesses: Microsoft Teams (post to relevant business channel)
- Field-based businesses: ConnectTeam (post to relevant team/location group)

### Scenario 1 (Google My Business; API-connected)
1. New review posted on Google My Business listing
2. Make.com catches via webhook or polling
3. Send review text, star rating, reviewer name, and business context to Claude API (model: `claude-sonnet-4-6`)
4. Claude assesses sentiment and routes through the routing logic above
5. 1-star: alert senior leadership immediately; no draft until context is received
6. 2-star: draft generated; routed to senior leadership for approval
7. 3-4 star: draft generated; standard approval flow via email
8. 5-star exceptional: draft generated; standard approval + celebration message to team channel
9. On approval: automatically post response to Google My Business
10. Silent failures not acceptable: every failed step triggers an alert

### Scenario 2 (Sourcr; no API)
11. Scheduled Make.com trigger fires (suggested twice daily)
12. Browser automation script logs into sourcr.com using credentials stored as encrypted environment variables in Make.com
13. Script identifies reviews that have not received a response
14. For each unanswered review: extract review text, star rating, reviewer name, and reviewer type (candidate or client)
15. Content passed to Claude API using the same routing logic as Scenario 1
16. 1-star: HOLD and immediately alert leadership (Teams/ConnectTeam depending on business)
17. 2-star: draft generated; routed to senior leadership for approval
18. 3-4 star: draft generated; standard approval flow
19. 5-star exceptional: draft generated; standard approval + celebration message
20. On approval: browser script logs back in and submits approved response against the correct review
21. Script handles failure cases gracefully: login errors, session timeouts, page layout changes, review already responded to
22. All actions logged: timestamp, review ID, routing path, who approved, response submitted

### Deliverables (test project)
1. Scenario 1 working: deployed and tested against at least 3 reviews covering different star ratings to validate routing logic
2. Scenario 2 working: browser automation script deployed, tested live against Sourcr account demonstrating login, routing, and response submission
3. Documentation:
   - One page per scenario (modules, routing logic, error handling) for a developer who did not build it
   - Brief credential management notes (how credentials are stored and managed securely)
4. Handover call: 30 minutes walking through both scenarios and routing logic
5. Source files:
   - Make.com blueprint JSON and browser automation scripts via GitHub
   - No credentials included

### Evaluation criteria
1. Routing intelligence: Claude correctly classifies beyond star rating; 1-star spam vs serious incident routes differently
2. Communication: right questions upfront; issues flagged early; no chasing
3. Credential security: credentials handled safely; suitable for security review
4. Browser automation: robust real-world messiness handling (session expiry, page changes, already-answered reviews)
5. Team channel integration: alerts/celebrations land in the correct platform for the correct business
6. Error handling: graceful failure with alerting at every step; no silent failures
7. Documentation: clear enough for maintenance by another developer
8. Strategic thinking: propose improvements to sequencing/routing where applicable

### “How to respond” requirements
When responding to this brief, address all items below:

23. Technical approach to Scenario 1: Make.com modules, routing logic implementation, error handling
24. Technical approach to Scenario 2: browser automation tool and why, Sourcr login security, session management, failure cases
25. Example of a Make.com scenario built calling an AI API (Loom/screenshot/GitHub link)
26. Example of browser automation for a site requiring credential login
27. Quote for the test project, expected monthly retainer, and availability to start
28. Domain roadmap question: which domain you would prioritize differently and why

### Confidentiality
Treat the contents of this document as commercially sensitive.
No credentials should be included in any committed source.

