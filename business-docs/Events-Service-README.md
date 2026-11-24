# Events Service — Document Guide

**Product:** Shahin
**Service:** Events
**Last restructure:** 1405/05/09 — 2026-07-31 · **Renamed to README:** 1405/08/01 — 2026-10-23

> This file used to be a 3,078-line document that held strategy, catalog, architecture and PRD all at once. In the 1405/05/09 restructure it was split into pieces, and the file itself became this guide page so that old links do not break. **No content was deleted.**

---

## Where to start

**If you want to know how the product works and why** → [`00-Business-Model.md`](./00-Business-Model.md)
The service's business reference. The three levels of business type, pack and event; the two delivery paths; the integration points; the current scope; the plan model; and the data rules. **This document is the reference; wherever another document contradicts it, this one is correct.**

**If you want to know which decision was made, when and why** → [`Decision-Log.md`](../Process-Docs/Decision-Log.md)

---

## Document map

**00 — [`00-Business-Model.md`](./00-Business-Model.md)** · Business mechanics · **Reference**
Where business decisions live. The frame "one engine, two ways in" (decision 18), vision, scope, the two delivery paths, the report builder and workspace at business level, and "Relationship with other services" (the old `01` document was merged into this one and deleted on 1405/05/12; its standalone content is section 16 here).

**02 — [`02-System-Mechanics.md`](./02-System-Mechanics.md)** · Product mechanics
From sections 5 and 6: data layers, the **two delivery paths** (replacing the Tier model), naming rules, **conversion rate from funnels** (no conversion marking), custom events, and the event design methodology.

**03 — [`03-Event-Catalog.md`](./03-Event-Catalog.md)** · Data catalog
From section 7: the full catalog of packs and events. It is large because it is data by nature, not narrative.

**04 — [`04-Panel-IA-And-Stories.md`](./04-Panel-IA-And-Stories.md)** · PRD
From sections 8 to 10: panel layout, User Stories, and the No-Backfill rule.

**05 — [`05-Phasing.md`](./05-Phasing.md)** · Release phasing
The order in which components reach production: phase zero (technical blockers), phase one (taxonomy), phase two (schema-less), phase three (accelerators).

**06 — [`06-User-Flows.md`](./06-User-Flows.md)** · User flows
The six main flows (automatic WooCommerce, schema-driven media, custom event, the bridge between the two ways, identity, starting from a template) with their failure states and aha moments; the basis for wireframes and the technical handoff.

**07 — [`07-Features-And-Integration.md`](./07-Features-And-Integration.md)** · Feature list and integration
Twenty-three phased features, twelve discovery-demo features that have no phase yet (B2), and the five things the two ways share in one engine, with three global constraints.

---

## Business-type PRDs

One per business type. The unit delivered to the customer is the "business type", not the "pack". Each ready dashboard is both a fixed page and a gallery template (Decision-Log, decision 19).

- [`PRD-Business-Ecommerce.md`](./PRD-Business-Ecommerce.md) — E-commerce (for now, this means WooCommerce)
- [`PRD-Business-Video.md`](./PRD-Business-Video.md) — Video
- [`PRD-Business-Media.md`](./PRD-Business-Media.md) — Media and content
- [`PRD-Business-Exchange.md`](./PRD-Business-Exchange.md) — Crypto exchange; ships as a Shahin gallery template (decision 20)

---

## Report builder and workspace

The PRDs for everything under Reports (the report builder, cohorts and users, dashboards, notebooks, the template gallery, alerts and AI) are in [`Reports/`](./Reports/), indexed in [`Reports/README.md`](./Reports/README.md). The events page has its own PRD: [`PRD-Lexicon.md`](./PRD-Lexicon.md).

## Other documents

- [`Runbook-Events-Operations.md`](./Runbook-Events-Operations.md) — Operational procedures
- [`research/`](./research/) — Research, benchmark and review documents, including the 2026-10 [Amplitude parity research](./research/Research-Amplitude-Parity.md)
- [`_archive/`](./_archive/) — PRDs for packs that are outside the current product scope. They have not been deleted and will come back if their business type enters scope.

---

## Rules for this folder

**Each document has one genre and one owner.** Strategy, business mechanics, catalog, PRD and Tech-Spec are not mixed in one file — that mixing is exactly what this restructure was done to fix.

**Business decisions live only in `00-Business-Model.md`.** No Tech-Spec may set the plan model, feature bundling, or data retention period; if it needs them, it references this document.

**The unit of delivery is the business type, not the pack.** No new document is created with the name `PRD-Dashboard-<pack>`.

**The pack number is not a reference key.** The old pack numbering had duplicates (pack 1 was both video and article) and is retired. Documents reference each other by business type name.

---

## Remaining work

In the 1405/05/09 round only the **structure** changed, and the text of documents 01 to 04 was moved untouched. In the 1405/05/20 sync round, the text of documents `02`, `03`, `04` and the PRDs was aligned with all 14 Decision-Log decisions (full removal of the conversion-marking model, rewriting the Tier model as the two delivery paths, correcting quarantine behavior, video as a horizontal pack), and document `01` was merged into `00` and deleted.
