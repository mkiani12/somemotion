# Events Service Business Mechanics

**Product:** Shahin
**Service:** Events
**Document type:** Business mechanics — **reference**
**Audience:** PM, sales, engineering — the shared language of all three
**Basis:** [Decision-Log.md](../Process-Docs/Decision-Log.md) · session of 1405/05/09
**Folder guide:** [README.md](./README.md)

---

## What this document is and is not

This document says **how Shahin's Events service works and why** — from a business standpoint: what is sold to whom, where the scope boundaries are, what experience the customer has, and which lever pricing uses.

This document **does not** say how it is implemented. Tables, the database schema, collector behavior and SDK design live elsewhere.

**Ownership rule:** wherever any document — Tech-Specs included — contradicts this document, **this document is correct.** No technical document may set the plan model, feature bundling, or data retention period; if it needs them, it references this document.

---

# The core frame: one engine, two ways in

Shahin's Events service is **one reporting engine with two ways in** (Decision-Log, decision 18). Before 1405/08/01 this document called them "two complementary platforms"; the 2026-10 discovery round showed that they are one product.

**The ready way** — Shahin decides in advance which events matter for each industry, defines their schema in a pack, and puts ready dashboards and gallery templates on top of them. The customer designs nothing; they choose.

**The free way** — the customer sends any event with any name and any properties, and builds their own reports, dashboards and notebooks in the report builder. Shahin knows nothing in advance, and does not need to.

**Both ways end in the same place.** Pack events and custom events land in the same event list, are governed in the same Lexicon, and are counted by the same engine. Every card on a ready dashboard is an ordinary report-builder chart, and a template is a set of such charts. What differs is only who did the design work: Shahin, or the customer.

The two ways **are not competitors, and they are not for two different customer groups.** Both are open to every customer, and they complement each other:

- The ready way delivers **day-one value** — a brand-new customer with no analytics knowledge sees a full dashboard the next day.
- The free way delivers **headroom for growth** — a mature customer with questions of their own does not hit a wall.

Splitting by customer size is wrong. A large organization also wants a ready-made checkout dashboard, and a small business eventually has an event of its own too. What differs is **analytical maturity**, and maturity changes over time — so the product has to offer both at once.

**The marketing frame is separate from access.** In the sales narrative we pitch the free way to organizations with a mature analytics team, and the ready way to small and medium businesses. This is positioning only; in the product, neither is locked behind a plan or a segment.

Sections 1 to 5 define the ready way, sections 6 to 9 the free way, and sections 10 onward what both share.

---

# The ready way — packs, ready dashboards and templates

## 1. The three-level model

The Events service has three levels, and mixing them up has been the root of most past misunderstandings:

A **business type** is an industry or line of business — online store, video, media and news, crypto exchange. **This is the unit delivered to the customer.** The customer chooses their business type, not their pack.

A **pack** is a functional area — checkout, search, authentication, trading. The pack is an **internal** unit; the customer usually does not deal with it directly.

Packs come in two kinds: a **vertical pack**, which only makes sense inside one business type (checkout for a store), and a **horizontal pack**, which any business type can enable. The canonical example of a horizontal pack is **video**: a media site that publishes video and a store that has product videos both get the same single pack with the same ready-made dashboard. (Refinement of 1405/05/12 — video had earlier been recorded by mistake as a "third business type".)

An **event** is the smallest unit, and on the ready way it has four things: a predefined name, a predefined schema, validation rules, and required and optional properties.

> The old pack numbering ("pack 1", "pack 6") is retired because it had duplicates. Documents reference each other by **business type name**.

---

## 2. The unit of delivery: the overview dashboard

Each business type gets **one overview dashboard** that combines the insights of all of its packs. Existing visual reference: the `events-ecommerce/v6` wireframe.

The overview is the customer's **starting point**, and in many cases it covers all of their needs. If they want more depth, they add the other packs of the same business type.

The previous "one complete dashboard per pack" model has been dropped. No new document named `PRD-Dashboard-<pack>` is created.

**Two forms of the same dashboard** (Decision-Log, decision 19). Each ready dashboard reaches the customer in two forms:

- **A fixed page** — opened with no work, kept by Shahin, not edited by the customer. It is the equivalent of Amplitude's out-of-the-box dashboards.
- **A gallery template** — listed under «ساخت شاهین ▸ نوع کسب‌وکار» (Made by Shahin ▸ Business type). Its roles bind automatically to the pack events the project already sends; saving it gives the customer an independent dashboard of their own, which later template changes do not touch.

A customer who wants to change a ready dashboard therefore saves a copy from its template; the fixed page stays the same for everyone. Every card of both forms is a report-builder chart and opens in the report builder (section 10).

**Packs make templates instant.** Amplitude fills a template's roles with demo events and Mixpanel asks the user to pick them. In Shahin a template role binds to the pack event the project already receives, so a store that sends the commerce pack sees a full template on the first click. A role whose event is not sent shows the exact `track()` call to add instead of an empty chart.

---

## 3. The two delivery paths

Within the ready way there are two delivery paths, and **the choice of path is not ours to make** — it depends on whether Shahin has a known interface available.

### The automatic path

Where an **integration point** exists: an interface we know and can pull data from the inside.

The customer just turns on a switch. Their developer does nothing. Data starts flowing from that moment and the dashboard fills up.

This is the only place where **day-one value** truly means something, and it is Shahin's main differentiator against competitors.

### The schema path

Everywhere else. Where no shared interface exists — for example a crypto exchange, which has neither a player nor a shared platform.

Here Shahin **defines the pack** with a fixed name and schema, and **the customer's developer implements it**.

**The schema is published for everything — even the automatic paths.** No pack or business type is "connector-only": the schema of every dashboard is always available to the customer, so that anyone outside the known platforms (for example a non-WooCommerce store) can fill the same dashboard through the schema path. The connector is not a replacement for the schema; it is an accelerator on top of it.

> **Sales warning:** these two paths are two completely different experiences and must not be sold the same way. A customer on the automatic path sees a full dashboard the next day; a customer on the schema path has a technical project in front of them that may take months. Any promise of "immediate value from day one" must be limited to the automatic path.

---

## 4. Integration points

The list of integration points is effectively our **list of cheap business types**. Each new integration point moves one or more business types from the schema path to the automatic path.

**Video players** — sites use well-known players (YouTube, Vimeo, Plyr, video.js and the rest), and those players emit events. This integration point opens the **Video horizontal pack** to any business type — the only pack that is implemented in code today.

**WooCommerce** — a large share of Iran's small and medium stores run on WooCommerce. The Shahin plugin sits inside the store system itself and knows exactly when an order was placed and for how much. This integration point opens the e-commerce business type.

**WordPress** — the same plugin, on a content site, knows that this page is an article and what its author, category and tags are. This integration point opens the media business type.

> **Two integration points; two business types plus one horizontal pack.** The WordPress plugin alone yields two business types, and the players give the Video pack to everyone — this is the cheapest lever for growing the scope.

---

## 5. Current scope

The phase-one scope has two parts:

- **Two business types: media and e-commerce.**
  - **E-commerce:** a WooCommerce customer gets the dashboard automatically through the plugin; the schema of the same dashboard is also published so that a non-WooCommerce store can send data through the schema path. Both paths from day one.
  - **Media (mostly news — articles, blogs, news):** phase-one delivery is through the schema path — designing the important events of this business type, a ready-made overview dashboard, and a published schema. Automating media through the WordPress connector is an accelerator opportunity, and its timing is set in the phasing.
- **One horizontal pack: video.** Open to both business types, automatic collection from the implemented players, a ready-made dashboard — and its schema is published like all the others.

The multi-dozen-pack catalog prepared earlier **is not the current scope, but it is not throwaway either.** Those packs are the next candidate business types — exchange, fintech, SaaS, education, travel, gaming and the rest. We have no integration point for any of them, so when their customers arrive they are all delivered through the **schema path**: the business-type overview is built from that ready catalog and the customer's developer implements the events.

**Crypto exchange is a Shahin template** (Decision-Log, decision 20): it ships in the gallery as one of Shahin's own business-type templates, as Amplitude ships ready industry templates. Its content is defined in [`PRD-Business-Exchange.md`](./PRD-Business-Exchange.md). Whether it also gets a fixed page is open (section 15).

This is the value of the catalog: **day one of every new business type does not start from zero.** The catalog is maintained in [`03-Event-Catalog.md`](./03-Event-Catalog.md).

**Rule for a new business type entering the scope:** either we have an integration point for it, or a real customer is waiting for it. "The market is big" alone is not enough, because a ready-made dashboard that stays empty is worse than not having one. A pack being in the catalog means readiness, not a roadmap commitment.

---

# The free way — custom events and the report builder

## 6. Schema-less ingestion

With one simple call, the customer's developer sends an event with **their own chosen name and properties**. There is no "define the event in the panel" step, and none is needed.

**The schema is born from the data itself, not before it.** An event with an unknown name is accepted and stored unconditionally and appears immediately in the project's event list. This is the exact opposite of the ready way, which knows the schema in advance — and both behaviors are intentional.

**The event source is free.** Unlike packs, which are browser-based by nature, a custom event can come from the browser, from the customer's own backend service, or from any supported SDK. This is a serious difference: events such as payment confirmation or an order status change, which only make sense server-side, can be recorded only through this path.

**Why this half is needed:** without it, the customer has to wait for us to build a pack for every new question. The product's ceiling becomes our roadmap's ceiling.

**An honest constraint:** complete freedom without discipline produces a garbage taxonomy — duplicate names, different spellings, irregular properties. Iranian customers usually do not have an independent data team to keep that discipline in their own codebase. **This is exactly why the taxonomy half and the governance layer of section 8 exist.**

---

## 7. Report builder and workspace

The customer builds reports on their own data — custom events and pack events alike. Visual reference: the `report-builder/v12` wireframe. The full behaviour is specified in the report builder PRDs; this section fixes only the business shape.

**Report types.** The four core reports are:

- **Trends** — how often one or more events happen over time, broken down by any property. The most used report.
- **Funnels** — events in sequence as steps, with a time window and a breakdown. The customer arranges the steps; prebuilt funnels are only a starting point.
- **Retention** — the return of a cohort over time: what share of people who did something this week came back next week?
- **Journeys** — the most frequent paths before or after an event.

On top of these the discovery demo shows the rest of Amplitude's chart set: Metric Explorer, Data Table, stickiness, engagement matrix, lifecycle, impact analysis and experiment results. Compass and personas were removed from the demo and the plan on 2026-10-28 (decision 33).

**What is counted.** The unit is selectable: users, daily, weekly and monthly active users, event totals, sessions, frequency per user, and the sum, average or median of a numeric property (for example order amounts, which gives a revenue chart). «کاربران» counts people, not devices (decision 15). Counting organizations instead of people is shown in the demo but is not built yet.

**Users and cohorts.** Behavioural cohorts built from what people did, cohorts imported from a CSV, user profiles with their event stream, and «احتمال رفتار» (predicted likelihood of a behaviour). From any chart point the Microscope lists the people behind it and their event streams, and saves them as a cohort.

**Workspace.** Saved reports live in spaces: a personal space for each member and team spaces the team shares, with pinned items and an archive. Dashboards arrange saved reports with text blocks; notebooks mix live charts with written analysis. A ready dashboard and a customer dashboard are the same object; a template is a dashboard tagged for copying (section 2).

**Watching the numbers.** Alerts on any chart, automatic anomaly detection with root-cause analysis, and release markers on the time axis.

**Documented, not committed.** Under section 14 every item above is documented and in the demo. What reaches production and when is set in [`05-Phasing.md`](./05-Phasing.md). Since 2026-10-25 that is Phase 2 for everything above, except funnel 3c, items whose production prerequisite is unmet (formerly tagged «نیازمند توسعه» in the demo; decision 37 removed the tag), such as cohorts, organizations, Revenue LTV and anomaly detection, and items marked «نقشهٔ راه» (Decision-Log, decision 22). For items Shahin cannot do yet, the Reports PRDs record the production prerequisite; the demo no longer tags them, because the whole report builder is Backlog in the demo menu (PM, 2026-10-28; decision 37). The behaviour of each item is specified in the Reports PRDs ([`Reports/README.md`](./Reports/README.md)); the research behind this section is in [`research/Research-Amplitude-Parity.md`](./research/Research-Amplitude-Parity.md).

---

## 8. Lexicon and data governance

The full behaviour of the events page is in [`PRD-Lexicon.md`](./PRD-Lexicon.md).

**Lexicon** is the name of the area where a project's events are managed. It is a list that **fills itself automatically from real data** — not something the customer fills in advance.

The overall logic: governance is applied **after the data is born**, not before. Data ingestion is never blocked unless the admin explicitly asks for it.

**Four levers on every event:**

- **Display name and description** — the technical name `checkout_started` stays for the engineering team, but reports show "Checkout started".
- **Hide** — an event that is no longer used is removed from the lists without its data going away.
- **Block** — the only place where data ingestion really stops; an explicit admin decision, not the default behavior.
- **Merge** — two names that are the same thing (for example the result of a typo or a rename in code) are turned into a single event.

**Three optional layers:**

- **Approval of new events** — when it is on, a newly born event is not visible to the rest of the team until the admin approves it. **The data is always stored; only its display is suspended.**
- **Naming rules** — an event that does not match the naming convention is flagged and a fix is suggested. It is only a warning, not a barrier.
- **Bulk editing with Excel** — the event list is downloaded, the customer edits display names and descriptions in bulk, and uploads the edited file back. For projects with dozens of events, editing one by one is not practical.

**Discovery demo layer (2026-10, not phased).** `events-settings/v13` also shows Amplitude-level governance: properties and user properties, combined events, derived properties, transformations, a metric library, a tracking plan with change history, and data settings with block rules at ingestion — including «ترافیک ربات (فهرست IAB)» (decision 16). These are documented here so the model is complete; production has none of them yet.

---

## 9. User identity

The free way delivers its full value when it knows that two events belong to the same person. The identity model has three layers:

**Device default** — with no work on the customer's side, every browser gets an identifier.

**Identity declaration** — after a user logs in to their site, the customer gives Shahin their own user ID. From that moment, the behavior of that user across all of their devices is counted as one.

**Identity merge** — anonymous behavior before login on the same device is attached to the user ID, so that the purchase funnel does not break in the middle.

**An honest limitation:** anonymous behavior that never reaches a login cannot be connected — for example someone who browsed on mobile, never logged in, and then bought on a laptop. No analytics tool in the world has solved this and we do not claim to either; instead, the definitions of our metrics must state explicitly what they count.

> **Status (1405/08/01):**
> - The model is accepted (the identity-as-event design, by the owner on 2026-09-09) and was proven end to end on 2026-09-30. Pre-login behaviour on the same device is linked retroactively through an as-of mapping.
> - «کاربران» counts people (Decision-Log, decision 15). No report reads resolved identity yet; that is roadmap 4.3.
> - Decided (PM, 2026-10-28; Decision-Log, decision 29, superseding decision 28): on logout, web `reset()` clears the user and keeps the device ID, as it does today (!703). Each event is attributed to whoever was logged in at that moment, so browsing after logout stays anonymous and is not joined to the previous user, and the next person to log in is not joined to the previous user either. No SDK change is needed; issue #309 aligns the SDK reference with !703.
> - Open: hashing the ID, and Safari's cookie lifetime.
>
> **Earlier status (1405/05/12):** the engineering team has made a formal proposal — an automatic Anonymous ID in a first-party cookie, an optional ID from the customer's side, and a user profile — based on Mixpanel's Simplified ID Merge model. A full critical evaluation with five identified gaps (retroactive stitching, reset, irreversibility of the mapping, the metric basis, Safari cookie lifetime) is in [`research/2026-08-03-Identity-Model-Evaluation.md`](./research/2026-08-03-Identity-Model-Evaluation.md). A related point: the WooCommerce plugin has access to the WordPress user ID, so for the automatic path, identify without customer code is possible.

---

# Shared by both ways

## 10. One engine, both ways

Every dashboard card has an **Open in Report Builder** button that opens the same query, prebuilt with the same period and the same filters.

This is what makes the two ways one product. Without it, a customer who reaches the ceiling of the ready-made dashboard has to build everything from scratch, and effectively gives up.

**Architectural consequence:** every dashboard card must be expressible with the Report Builder engine. No dashboard card is built with a hand-written query that has no equivalent in the Report Builder.

**Side benefit:** because both come from one engine, the dashboard number and the Report Builder number are necessarily the same. Numeric inconsistency between the two areas is removed at the root.

---

## 11. Data rules

**Acceptance is open.** An event whose name is in no pack is accepted and stored. Acceptance is a one-way door: data rejected today does not come back tomorrow, so rejection is the most expensive thing we can do.

**Data that violates the schema is not thrown away, but it is not counted.** If a customer sends a pack event whose required property is missing or has the wrong type, that event is stored and flagged invalid. It is **not counted** in charts or rollups; it shows only in the Lexicon's data health, and a chart that leaves such events out states how many (PM, 2026-10-28; Decision-Log decision 30, amending decision 6).

**The denominator is always stated explicitly.** A card computed on a subset of the data, including one that left out invalid events, must say how many events it was computed on or left out. A number without a denominator is a lie in this situation.

**The customer is always informed.** Every mismatch is visible in Lexicon with a warning and a way to fix it. Silence is not acceptable.

**The conversion rate comes from funnels, not from marking.** There is no "mark this event as a conversion" mechanism in the product — as in Mixpanel, the customer builds a funnel and the rate is the funnel's output. The ready-made overviews also take their rates from the Report Builder engine's prebuilt funnels. (1405/05/12 — replacing the previous GA4-style marking model.)

---

## 12. The plan model

**The main lever between plans is raw data retention**, not access to features.

Every plan has the Report Builder and every plan can send custom events. What differs is **lookback depth**: the base plan goes back a few months, and higher plans go further.

The logic is twofold. First, storage cost multiplies directly with retention duration, so this lever is aligned with our real cost. Second, it takes no feature away from any customer, so a mid-sized customer does not hit a dead end and their growth path stays open.

> **Timing:** the direction above (lever = retention) is approved; the numbers and the pricing finalization are closed **after the whole mechanism and the production phasing are locked** (PM, 1405/05/12).

> **Legal constraint:** every external text — including the privacy policy — must be consistent with this model. A promise of "unlimited retention" is inconsistent with this model.

---

## 13. Customer onboarding experience

**On the automatic path:** the customer chooses their business type, flips the switch, and data flows from that moment.

**On the schema path:** the overview **is locked until data arrives**. The customer sees a clear list of the required events, and as they are implemented the overview unlocks. Unlocking the overview is the reward for implementing.

**Condition for the lock:** the lock must be **a checklist that ticks off** — the customer must see exactly what is required, which events have arrived and which have not. "Go send these" only works when "these" is a specific list; otherwise the lock turns into a dead end.

**There is no lock on the free way** — the first event that arrives is immediately visible in Lexicon and the Report Builder.

> **Recorded risk:** the highest chance of losing a customer is exactly during the schema-path window — between purchase and the arrival of the first data. Anything that shortens this window has a direct effect on customer retention.

---

## 14. Documentation versus release

**Documenting a component does not mean committing to release it in phase one.** Every component of both ways — including custom events and the Dashboard Builder — is fully documented and wireframed and its requirements are stated precisely, even if it does not go to production in the first release. When each component reaches production is a separate PM decision at release time, and it is recorded in the Decision-Log.

---

## 15. Open questions

**Identity model parameters.** The three-layer structure of section 9 is approved and built on the write side. Connecting pre-login behaviour is solved by the as-of mapping, proven 2026-09-30. Still waiting on the engineering team:
- the durability of the device ID (a one-year sliding anonymous lifetime is designed but not implemented; Safari caps JS cookies at seven days);
- hashing the ID for privacy.

(Resolved 2026-10-28: on logout, `reset()` keeps the device ID, and each event is attributed to whoever was logged in at that moment; the next person is not joined to the previous user. Decision-Log decision 29, superseding decision 28's fresh device ID of 2026-10-25; issue #309.)

**The exact list of components in the phase-one release.** Under section 14 everything is documented, but the final choice of what goes to production in the first release has not been made yet and rests with the PM.

(Two earlier open questions were resolved: the media business type formally entered the phase-one scope, and non-WooCommerce stores are covered through the schema path by the "both paths from day one" rule.)

**Exchange: fixed page or template only.** Exchange ships as a gallery template (decision 20). Open: whether it also keeps a fixed page (`events-exchange/v10`), and whether the scope-entry rule of section 5 now applies only to fixed pages, since a template costs far less to ship than a page.

(Resolved 1405/08/01: the boundary between a customer dashboard and a ready overview. The fixed page is not edited; the customer saves a copy from its template — decision 19.)

---

## 16. Relationship with other services

The key principle: **record once, use many times.** The Events service is itself a *shared collection layer*, not a separate Report Builder. It records each event only **once** — together with all of its automatic properties (page, traffic source, device, campaign, location, etc.) — and makes that single record available to several consumers at the same time.

On this layer, each business type gets an overview (the media overview, the e-commerce overview) and the Video horizontal pack has its own ready-made dashboard; these overviews have no separate collection pipeline and are all fed from the same single event record. The practical consequence: when an event is added to a pack, instead of one report, several consumers get richer at once.

Each relationship has two ends:
- **Input:** which event or property that service consumes.
- **Output:** what insight it builds from it.

**Content overview (engagement module)** — input: `article_viewed`, `article_read_depth`, `article_shared`, `reaction_added`. Output: "full read rate" (the ratio of `article_read_depth = 100%` to `article_viewed`), plus content-quality signals. Without a manual report, the editor sees which article was really *read*, not just opened.

**User behavior and journey (User Journey)** — input: the chronological sequence of a user's or a session's events. Output: the user's path to the goal moment. The chain `search_performed → article_viewed → newsletter_subscribed` shows which route users take to reach the goal and where they drop off — and the pass-through rate of this path comes from the Report Builder's **funnel**, not from marking an event.

**Session Replay** — input: the same events on the timeline of each session recording. Output: the visual context of each event. The analyst sees on the recording the exact moment `paywall_reached` happened. Each event is a "jump point" on the timeline.

**AI Insights** — input: events and automatic properties, as raw model data. Output: automatic combined insights. For example, the sentence "mobile users coming from Telegram buy subscriptions three times more often" is built by putting `session_referrer` and `device_type` next to `subscription_completed`, without anyone having defined this slice in advance.

> **Why this is vital for event quality:** because one record goes to several services, the discipline of the event layer (consistent naming, required fields, no duplicate events) directly affects the correctness of *all* of these consumers. One badly named or incomplete event breaks several consumers at once — exactly what the governance layer of section 8 exists to prevent.

---

## Maintaining this document

Every new business decision is first recorded in [`Decision-Log.md`](../Process-Docs/Decision-Log.md) and then applied in this document. If a decision is not here, it does not exist for the team.
