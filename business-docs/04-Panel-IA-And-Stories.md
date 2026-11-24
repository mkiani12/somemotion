# Panel Layout and User Stories

**Product:** Shahin
**Service:** Events
**Document type:** PRD
**Decision reference:** [Decision-Log.md](../Process-Docs/Decision-Log.md)
**Folder guide:** [README.md](./README.md)

> This document was split out of the former unified document on 1405/05/09, and in the 1405/05/20 sync round its text was aligned with all 14 Decision-Log decisions (removal of conversion marking, a business-type overview instead of a per-capability dashboard, video as a horizontal pack, corrected quarantine behavior).

---

## 8. Handling in the panel across the phases (Panel IA)

### 8.1. Principle: configuration is separate from analysis

The rule is simple: "Is the site admin doing this to **set something up** or to **understand something**?"
- Set up → Settings and the events page (Lexicon)
- Understand → Analytics (the fixed ready dashboards) and Reports (the report builder and its workspace)

Both halves read one engine (Decision-Log, decision 18): a ready dashboard card, a gallery template and a customer's own chart are the same kind of report.

### 8.2. Settings — the home of configuration

**Settings → Data Collection → Events:**
- The event catalog, with the receiving status of each event; the delivery path (automatic or schema) is a property of the pack, not of the event
- Domain Pack section: coverage percentage, plus a link to each event's documentation
- Data quality warning: events whose properties violate the schema are flagged with the reason and a sample payload — these events **are stored but not counted** (they are not rejected or quarantined; they are left out of charts and rollups, show in data health, and a chart states how many it left out — Decision 6, amended by decision 30, 2026-10-28)
- Debug / Live Events section: a real-time view for verifying the implementation
- Conversion definition: there is no "mark event as conversion" option and no cap; the customer builds a funnel from the **Build a funnel** card, and the rate is the output of the funnel (Decision 13; visual reference `events-settings/v8`)

### 8.3. Analytics — the business-type overviews

The unit of delivery is the "business type", and each business type has **one overview dashboard** that combines the insights of all of its packs. The previous "one dedicated dashboard per pack" model has been removed.

- **E-commerce business type** (WooCommerce for now) → [`PRD-Business-Ecommerce.md`](./PRD-Business-Ecommerce.md)
- **Media business type** (content and articles + gallery) → [`PRD-Business-Media.md`](./PRD-Business-Media.md)
- **Video horizontal pack** (not a business type — both business types can enable it, and it has its own ready-made dashboard) → [`PRD-Business-Video.md`](./PRD-Business-Video.md)

The next candidate business types come through the schema path, and their catalog is ready in [`03-Event-Catalog.md`](./03-Event-Catalog.md) §7.4. Model reference: [`00-Business-Model.md`](./00-Business-Model.md) sections 2 and 5.

Each ready dashboard is also a template in the gallery (decision 19), so the same content appears once as a fixed page here and once as a copyable starting point under Reports.

### 8.3a. Reports — the report builder and its workspace

Reference surface: `report-builder/v12`. Reference text: `00-Business-Model.md` §7.

- **Home** — recent work, a project overview, live events, favorites, most viewed and "start from a template".
- **Spaces** — a personal space for every member and team spaces shared by the team; all content, pinned, archive, members and settings. Saved reports, dashboards and notebooks live here.
- **Create** — a new chart (trend, funnel, retention, journeys and the rest of the chart set), dashboard, notebook or cohort.
- **Users** — cohorts, user profiles, groups, computations and «احتمال رفتار».
- **Template gallery** — Shahin's business-type and use-case templates, and templates made inside the project.
- **Alerts** — the alerts on the project's charts and the release markers.

### 8.3b. The events page (Lexicon)

Reference surface: `events-settings/v13`. Tabs: events, properties, combined events, derived properties, transformations, metrics, history, and data settings (block rules at ingestion, including bot traffic — decision 16). Only the base Lexicon of `00-Business-Model.md` §8 has a production phase; the rest is the discovery demo.

### 8.4. Phase map

**Phase 1 (the ready way):**
- Settings: event catalog + pack activation + data quality warning + Debug/Live + the **Build a funnel** card
- Analytics: the media business-type overview, the e-commerce business-type overview, and the Video horizontal pack dashboard (not a separate dashboard per pack — Decision 2)

**Phase 2 (the free way):**
- Settings: the Custom Event builder is added to the same catalog
- Analytics: custom events appear in the same dashboards
- Reports: the four core reports, saved reports and dashboards

**Phase 2 as well (PM, 2026-10-25; Decision-Log, decision 22):** everything else the demo shows for Reports in §8.3a, except funnel 3c, items whose production prerequisite is unmet (formerly tagged «نیازمند توسعه» in the demo; decision 37 removed the tag) and items the demo marks «نقشهٔ راه».

**Not phased (discovery demo):** those exceptions, including cohorts, and the Lexicon layers in §8.3b. See `07-Features-And-Integration.md` B2.

### 8.5. Requirements shared by all pack dashboards

These requirements are mandatory for every business-type overview, and each business-type PRD references this section:

1. **No-Backfill banner:** every dashboard shows, in its header, the date data collection started for each pack ("Data collected since X"; Persian: `داده‌ها از تاریخ X جمع‌آوری شده‌اند`) — this is the requirement of section 10.
2. **Lock on the schema-path overview until data arrives (Decision 9):** the overview of a business type that comes through the schema path stays **locked** until the first data arrives, and shows a **clear checklist that ticks off** the required events (which have arrived and which have not); once the implementation is complete, the overview unlocks. The "open overview with pending widgets" and "sample data" models were rejected. On the automatic path (connector), data flows from the moment of activation and there is no lock.
3. **Minimum-sample guard:** no alert (Push/Email/Badge) is sent with a denominator below 100 events in the period; instead of the rate, the card shows "Insufficient data" (Persian: `داده ناکافی`). Thresholds of the "compared with the 7-day average" kind need at least 7 days of complete data.
4. **Division by zero:** a zero denominator → show "—" (no data), not "0.00%" — and the related alert is suppressed too. A real zero (there is a denominator and the numerator is zero) is distinguished from "no data".
5. **Calendar and timezone:** the day boundary is the UTC day, which runs from 03:30 to 03:30 Tehran time, for every report, dashboard and the Sheets sync, with no time-zone switch (PM, 2026-10-25; Decision-Log, decision 21). Production legacy reports still count days from Tehran midnight until issue #305 lands. Time axes use Jalali dates; the week starts on Saturday (for day-of-week heatmaps).
6. **Number format:** Persian digits with the "٬" separator; amounts in Toman with an explicit unit label and no decimal digits; percentages with at most 2 decimal digits.
7. **Conversion rate from funnels:** there is no conversion column or marker on any single event. Wherever an overview shows a conversion rate, that rate is the output of a **prebuilt funnel** on the Report Builder engine (each card also has an **Open in Report Builder** button that opens the same funnel with the same period and filters — Decisions 7 and 13).
8. **Bot traffic:** bot and crawler traffic is handled by a block rule at ingestion, «ترافیک ربات (فهرست IAB)», as in Amplitude (decision 16): blocked events are never stored, so they never enter a denominator. This is demo-only; production has no block filter yet.
9. **Pages without JS (AMP/NoScript):** visits that cannot fire interaction events are left out of the denominator of interaction rates (such as Completion and Read Depth).

---

## 9. User Stories

### 9.1. Epic 1: Activating the event system

#### US-1.1: Showing automatic events to the site admin

**As** a site admin who has installed the Shahin script,
**I want** to see in the Events section which events are being recorded automatically,
**so that** I know what information has been collected from day one and that I need no extra setup.

**Acceptance criteria:**
- Auto-collected events are shown in the Events section with the status "Active"
- For each event, the count recorded in the selected time range is shown
- Each event has a short description (what occurrence this event records)
- The site admin cannot disable these events (Always on)

#### US-1.2: Activating Enhanced events

**As** a site admin,
**I want** to enable or disable Enhanced events with a toggle in the dashboard,
**so that** I get more behavioral data without writing code.

**Acceptance criteria:**
- There is a page listing all the events
- Each event has a toggle
- Each toggle comes with a short description and an example
- A toggle change takes effect immediately, with no redeploy needed
- The current state of each toggle is saved

#### US-1.3: Choosing and activating a Domain Pack

**As** a site admin,
**I want** to choose my site type during onboarding so that I see the relevant recommended events,
**so that** I know exactly which events I need to implement.

**Acceptance criteria:**
- The onboarding flow has a "Select site type" step
- After the selection, the list of recommended events is shown
- For each event: name, description, Required/Optional fields and a code example
- The implementation status of each event (recorded / not recorded) is shown

---

### 9.2. Epic 2: Viewing and analyzing events

#### US-2.1: Overall events dashboard

**As** a site admin,
**I want** an overall dashboard of all recorded events,
**so that** I can see the overall state of user engagement at a glance.

**Acceptance criteria:**
- The total number of events in the selected time range is shown
- The top 10 events by recorded count are shown
- A line chart of the event trend over time is shown
- Filtering by time range, device type and country is available

#### US-2.2: Detail report for a single event

**As** a site admin,
**I want** to see the full details of any event by clicking it,
**so that** I can analyze user behavior at that point in more depth.

**Acceptance criteria:**
- Total count, user count and occurrence rate are shown
- Breakdowns by Device, OS and city are shown
- The recorded properties and the distribution of their values are shown
- There is a time-trend chart for this event

---

### 9.3. Epic 3: Schema management and validation

#### US-3.1: Showing data quality (schema) warnings

**As** a site admin,
**I want** to see which events have properties that violate the schema,
**so that** the site's developer can fix them quickly.

**Acceptance criteria:**
- There is a "Data quality warning" section in Lexicon/the dashboard
- Each warning includes the event name, the type of mismatch and a sample payload
- These events **are stored but not counted** (they are not rejected or quarantined); charts and rollups leave them out and state how many they left out: «در این نمودار N ایونت با ساختار نامعتبر شمرده نشد» / "N events with an invalid structure weren’t counted in this chart", with the link «خطاهای اعتبارسنجی» / "Validation errors", which opens the events page's «تنظیمات داده» tab in a new tab (Decision 6, amended by decision 30, 2026-10-28). This covers registry (pack) events only; the demo shows the note on Trend charts. A custom event can still be marked «نامعتبر» in validation, but it stays counted
- If a mismatch keeps recurring, an email notification is sent

#### US-3.2: Showing implementation status

**As** a site admin,
**I want** to see which recommended events have been implemented and which have not yet,
**so that** I know where my site's tracking coverage stands.

**Acceptance criteria:**
- The Domain Pack list is shown with the status "Active / Awaiting implementation / Inactive" for each event
- The overall coverage percentage of the Domain Pack is shown (for example: 7 of the pack's total active events)
- There is a link to the implementation documentation of each event

#### US-3.3: Debug Mode for the developer

**As** the site's developer who is implementing the events,
**I want** a real-time view that shows incoming events immediately,
**so that** I can verify the implementation without waiting for the 5-minute reports.

**Acceptance criteria:**
- There is a "Debug / Live Events" view in the dashboard
- Each incoming event is shown with all of its properties (both auto-properties and event properties)
- Schema errors (a missing required field, a wrong data type) are highlighted on that event
- This view shows real production data — that is, there is no separate debug mode, and the developer must use a test site or a sandbox project for testing

> **Open decision:** Does every account get a free sandbox project as a test environment? This needs to be reviewed in the Billing Model.

---

### 9.4. Epic 4: Building and saving reports

#### US-4.1: Building a chart from any event

**As** a product or marketing lead,
**I want** to pick any event (pack or custom), choose what to count, filter and break it down,
**so that** I answer my own question without waiting for a new dashboard.

**Acceptance criteria:**
- Pack and custom events appear in one list; a custom event carries only a "Custom" badge
- Users, event totals, active users, frequency and a numeric property's sum, average or median can be chosen
- «کاربران» counts people, and the chart's info states this (decision 15)
- Every chart point opens the Microscope: see the users, view their event streams, save them as a cohort

#### US-4.2: Opening a ready dashboard card as a report

**As** a store owner looking at the ready store dashboard,
**I want** to open any card in the report builder with the same period and filters,
**so that** I can dig deeper without rebuilding the query (decision 7).

**Acceptance criteria:**
- Every card has **Open in Report Builder**
- The number in the report equals the number on the card
- The opened report is new and unsaved; the fixed dashboard is unchanged

#### US-4.3: Saving to a space

**As** a team member,
**I want** to save a report to my personal space or a team space,
**so that** the team shares one definition instead of rebuilding it.

**Acceptance criteria:**
- Save asks for a name and a space; the personal space is the default
- A report in a team space is visible to every member of that space
- A saved report can be added to a dashboard or a notebook

### 9.5. Epic 5: Starting from a template

#### US-5.1: Using a Shahin template

**As** a new customer with no analytics team,
**I want** to start from my business type's template,
**so that** I get a working dashboard of my own on the first day.

**Acceptance criteria:**
- The gallery lists Shahin's business-type and use-case templates
- The template's roles bind to the pack events the project already sends
- A role with no event shows a picker, and if its pack event isn't sent, the exact `track()` call to add
- «ذخیره به‌عنوان داشبورد» stays disabled until every role has an event (decision 19)
- The saved dashboard is an independent copy in the personal space

#### US-5.2: Turning a dashboard into a template

**As** a project admin,
**I want** to tag a dashboard as a template with instructions,
**so that** other members of the project start from the team's own best dashboard.

**Acceptance criteria:**
- Only an admin or owner publishes a template to the project's gallery
- The template page lists the events, values and text a user should replace
- Templates are visible only inside the project

### 9.6. Epic 6: Understanding users

#### US-6.1: Building a cohort

**As** an analyst,
**I want** to define a group of people by what they did, or import one from a CSV,
**so that** I can compare that group in any report.

**Acceptance criteria:**
- A cohort can be built from behaviour, from a chart point, or from a CSV of user IDs
- A cohort can be used as a filter or a segment in every report
- The cohort shows its size and how it changes over time

#### US-6.2: Seeing one user's story

**As** a support or product lead,
**I want** to open one user's profile with their sessions and events,
**so that** I understand what a real person did before a complaint or a purchase.

**Acceptance criteria:**
- The profile shows the user's properties, sessions and event stream
- An anonymous user is shown per device; an identified user across devices (decision 15)
- Where a session has a recording, the profile links to the replay

---

## 10. The No-Backfill rule (product behavior)

Shahin does not show data from before a schema was registered or an event was activated in its reports. This is a deliberate product behavior, not a bug.

Two important scenarios:

**Scenario 1 — toggle activation:** if the site admin turns on the `scroll_depth` toggle today, Scroll Depth stats start from that moment. Yesterday's visits are not in this report.

**Scenario 2 — event implementation:** if the site's developer implements the `article_viewed` event starting next month, there will be no data from earlier visits in this report.

> ⚠️ **UX requirement:** wherever an event is activated for the first time (a toggle or a new implementation), the dashboard must show clearly from which date data starts, so that the site admin does not mistake an empty history for a system failure.

> 🔧 **The technical implementation requirements (ingest architecture, storage, validation, payload/rate limits, etc.) are not final yet and will be added to this document after negotiation with the engineering team.**
