# Event System Mechanics

**Product:** Shahin
**Service:** Events
**Document type:** Product mechanics
**Decision reference:** [Decision-Log.md](../Process-Docs/Decision-Log.md)
**Folder guide:** [README.md](./README.md)

> This document was split out of the former unified document on 1405/05/09, and on 1405/05/20 it was synced with all 14 Decision-Log decisions — reference for the corrected model: [`00-Business-Model.md`](./00-Business-Model.md) sections 3 and 11.

---

## 5. Event System Architecture

### 5.1. The event and its data structure

When a user opens an article, Shahin records an **event**. Like Mixpanel's modern data model, Shahin keeps each event in **three layers**. The key to this model is one simple separation: the moment of the occurrence is stored separately from the user's persistent identity.

**Layer 1 — EVENT (what happened?)**
The name of the event itself; a short, readable string that only says what the user did. It is always written as `object_action`: first the object, then the action.
- Example: `article_viewed` (article / opened) · `video_played`

**Layer 2 — PROPERTIES (under what conditions?)**
The details of that moment of the event, as free-form key/value pairs (JSON). This layer has two sources, but both sit in the same place:
- What the site sends (the content of the occurrence): for example `article_category: "سیاسی"` ("Politics") · `author_name: "علی احمدی"` ("Ali Ahmadi") · `quality: "1080p"`.
- What Shahin attaches automatically (the environment of the occurrence): for example `device_type: mobile` · `city: Tehran` · `utm_source: telegram` · `timestamp: 14:32:00`.

Every key automatically becomes a filterable column — without us having defined it in advance.

**Layer 3 — USER PROFILE (who?)**
The user's persistent identity, which stays on the user **separately from the events** and is constant across all sessions. This layer does not depend on a single occurrence; it holds the user's ongoing state.
- Example: `user_plan: premium` · `signup_date: "2024-02-10"`

> **Why does this separation matter?** Properties belong to the *moment* (what quality the user had in this playback), while the User Profile belongs to the *person* (this user has a premium subscription). This separation is what lets us ask, without a single extra line of code, "which videos do premium users watch to the end?" — a slice built by putting layer 2 and layer 3 side by side.

---

### 5.2. Event collection layers

The central question: **"How does this event reach Shahin?"**

There are three cases, and they differ in who does the work:

- **Basic automatic collection:** no action needed; recorded from the moment the script is installed.
- **Activation with a switch:** no coding; the site admin turns it on in the panel. Packs that have an integration point (video, WooCommerce, WordPress) belong to this group.
- **Specialized pack with a schema:** the site's developer writes code; for business types that have no integration point.

Alongside these three there is the **custom event**, whose name and properties the customer defines themselves — the second half of the product, open to everyone.

> The "four-layer Tier" model that used to be here has been removed. Its axis was "implementation effort", whereas the correct axis is **whether or not an integration point exists**. Authoritative definition: [`00-Business-Model.md`](./00-Business-Model.md) sections 3 and 4.

---

#### Basic automatic collection

These events are recorded from the moment the Shahin script is installed — with no configuration or coding. Shahin either records them directly when the user's action happens, or infers them from session behavior:

- **Directly from the user's browser:** page view (`shahin_page_view`) and client-side JavaScript error (`shahin_client_error`).
- **Inferred from session behavior:** session start (`shahin_session_start`), the user's first visit (`shahin_first_visit`) and the user's return (`shahin_return_visit`) — these are derived by comparing the user's entry time with their session time.

**The automatic events and what each one means:**

```
shahin_page_view        — every time a page loads
shahin_session_start    — the start of each session (30-minute window)
shahin_first_visit      — the user's first visit to the site
shahin_return_visit     — a session start for a user who has visited before
shahin_client_error     — JavaScript errors in the user's browser (error message and details)
```

**Auto-properties — data attached automatically to every event:**

```
── Page ──────────────────────────────────────────────
page_url           canonical_url      page_title
page_lang          is_iframe          is_touch_support
entity_id          entity_module      entity_taxonomy_id
keywords[]         breadcrumb (up to 5 levels: name + path)

── Traffic source ────────────────────────────────────
referrer_url       referrer_domain    referrer_type
                   (organic | social | mail | other)
session_referrer   — source of the session's first page_view

── Campaign (UTM) ────────────────────────────────────
utm_source         utm_medium         utm_campaign
utm_term           utm_content        utm_id
utm_valid          — are source+medium+campaign all present together?

── Device ────────────────────────────────────────────
device_type        browser            browser_version
os                 os_version         device_brand
device_model

── Screen ────────────────────────────────────────────
screen_size        viewport_size      pixel_ratio
color_depth        orientation

── Geolocation ───────────────────────────────────────
country            city               admin_area
isp_asn            isp_name

── Performance (Performance API) ─────────────────────
page_load_time     domain_lookup_time tcp_connect_time
server_response_time page_download_time redirect_time
dom_interactive_time content_load_time

── session / user ────────────────────────────────────
session_id         user_id
session_start_time first_visit_time

── Custom segments ───────────────────────────────────
segment_1..5_name  segment_1..5_value  — up to 5 custom key/value pairs
```

**Capabilities ready to use (existing)**

The system already records all of the user's environment information automatically (such as device type, geolocation, traffic source and marketing campaign information, i.e. UTMs).

**Product value and output:** because this data is already available, the Shahin platform can compute and display "user engagement indicators (Engagement)" in dashboards without the client defining any new event. The conversion rate — as in Mixpanel — comes from a funnel the customer builds in the Report Builder, not from a predefined session-based or user-based calculation basis (full definition in §5.4).

**What needs to be built**

Shahin's current event storage model is legacy (the classic Google Analytics style, i.e. GA3, which only had rigid, limited fields such as Category and Action), and no dashboard or view uses it today. The modern event system described in this document requires the engineering team to build an entirely new layer.

**Named events with flexible parameters (Key: Value):** the system must be upgraded so that the client can send events with a standard name (Event Name) and any set of details as key/value pairs (Key: Value Pairs). The system must not limit the structure or number of these keys for the client; every business must be able to define its own parameters to fit its revenue model (e-commerce, media, education, etc.).

> **Product note:** all of the automatic environment properties listed in this section (the Auto-properties list of the layer) must be attached automatically to these new events as inherited data, and the client does not need to send them again.

---

#### Activation with a switch (no code)

The Shahin SDK can capture these events, but they are off by default. The site admin turns them on with a toggle in Settings → Events; no code is required.

**The events:**

```
scroll_depth       — scrolling to 25% / 50% / 75% / 100% of the page
outbound_click     — clicks on outbound links
search             — internal search (the query, without domain metadata)
form_start         — starting to fill in a form
form_submit        — successful form submission
video_start        — video playback start
video_progress     — 25% / 50% / 75% milestones
video_complete     — full viewing (90%+)
file_download      — file download
```

These events are the "general floor" — they work on any page, without knowing whether the page is an article or a product. When a site implements a Domain Pack, the same signals are enriched with domain metadata (for example `search` → `search_performed` with `search_query` and `results_count`).

---

#### Specialized pack with a schema (the site's developer writes code)

Shahin has predefined the schema of each event; the site's developer only needs to add the SDK call at the right moment. If a required field is not sent, the event **is stored but not counted** in charts or rollups; it shows in the Lexicon's data health with a warning, and a chart that leaves such events out states how many (Decision 6, amended by decision 30, 2026-10-28).

This layer covers **all domain packs** (the catalog of section 7). The next layer is **Custom Events** (the user defines the schema themselves) — the second half of the product, open to everyone.

> The business definition of **Custom Events** is in [`00-Business-Model.md`](./00-Business-Model.md) sections 6 to 9; its operational mechanism is in §5.4.1 of this document.

---

### 5.2.1. Data consistency

In Shahin's data management, separate, same-level, parallel events are never created to record similar user actions and behaviors. Instead of multiplying the number of events, we use "inner properties or parameters" (Event Properties) so that the database architecture stays fully minimal, lightweight and scalable.

The standard example of this approach in the product:
- ❌ Non-standard, heavy approach: creating two separate events for similar actions — `click_telegram` and `click_instagram`.
- ✅ Optimized, smart architecture: creating one comprehensive event named `outbound_click` with an inner parameter named `destination`; the value of this parameter changes according to the user's click (such as `telegram` or `instagram`).

---

#### The shared core (Canonical Core)

The events in the "Canonical Core" are the analytical foundation of the Shahin platform, and their technical logic follows these rules:

- **Domain-independent:** these events do not depend on a particular industry or domain (such as e-commerce, media or education). They track general, basic user behavior on the web and apply the same way to every client.
- **No-code setup ( / Toggle):** most events in this layer fall into the category. The client needs no technical change to the site's code to set them up; these events are activated and loaded simply by turning on a switch (toggle) in the Shahin panel.
- **Replacement by a specialized pack (preventing double-counting):** whenever the client implements a "specialized pack" (Domain Pack), that pack's enriched, advanced events replace the simple events of the shared core. In that case the system must automatically turn off the toggle of the previous general event, to prevent simultaneous, duplicate recording of data (double-counting).
- **Canonical identity lives on the reference event itself:** the structural identity of an event — the canonical name, ownership (the pack that owns the concept) and the reference event that other packs point to — belongs directly to the reference (canonical) event itself, not to the pack that uses it. An event name has the same canonical identity across the whole platform, in every pack and under every condition, and does not change locally or at the pack level. (There is no `tier` property or conversion flag on an event — the conversion rate comes from funnels; §5.4.)

Each of the twenty shared-core events is defined with the engineered structure below — definition, firing condition (Trigger), parameters (with data type) and role in the funnel — so that the frontend and backend teams do not have to guess when each event fires or how it is validated:

**1. `search_submitted` event** — toggle / 3-enriched`
- **Definition:** the user runs a search.
- **Firing condition (Trigger):** after the query is submitted (pressing Enter or the search button), and only after the results come back from the server (so that `results_count` is known); for instant search, only the final query after the debounce, not every keystroke.
- **Parameters:** `search_query` (String) the user's query text; `search_id` (String) the unique ID of this search; `results_count` (Number) the number of results returned; `search_context` (String) the search area; `search_scope` (String) the search scope; `search_source` (String) where the search started.
- **Role in the funnel:** usually an entry or middle step of the search funnel, not the end goal. The general-floor `search` is turned on with a toggle; when a pack implements the enriched version (containing `search_context` and `search_id`), the general toggle is turned off to avoid double-counting. **GA4 mapping:** reserved name `search`.

----

<br>


**2. `search_no_results` event** — toggle / 3-enriched`
- **Definition:** a search that returns no results.
- **Firing condition (Trigger):** when the server's response for a search has zero results (after the response comes back, not before).
- **Parameters:** `search_query` (String) the query text; `search_context` (String) area; `search_scope` (String) scope.
- **Role in the funnel:** rarely a funnel goal; mostly a signal of search friction/failure and a common drop-off point. The owner of this concept is Search, and E-commerce/Travel/Marketplace reference it.

---

<br>

**3. `form_started` event**
- **Definition:** the user starts filling in a form.
- **Firing condition (Trigger):** the first interaction (focus or typing) with one of the form's fields — not merely the form being seen.
- **Parameters:** `form_id` (String) the form's ID or dedicated name in code.
- **Role in the funnel:** usually the opening step of the form funnel, not the end goal.

---
<br>


**4. `form_submitted` event**
- **Definition:** the user successfully submits a form's data.
- **Firing condition (Trigger):** after the form is submitted and **only after a successful response (Status 200)** is received from the server; an empty click on the submit button does not count.
- **Parameters:** `form_id` (String) the form's ID or dedicated name in code.
- **Role in the funnel:** the most used final step of the form funnel; in B2B it is usually chosen as the goal step of the lead/demo funnel, and its conversion rate comes out of that funnel in the Report Builder.

--- 
<br>

**5. `file_download` event**
- **Definition:** the user downloads a file.
- **Firing condition (Trigger):** when the download link is clicked or the download starts.
- **Parameters:** `file_name` (String) file name; `file_type` (String) file type/extension.
- **Role in the funnel:** usually a middle step of the funnel, not the end goal. **GA4 mapping:** the reserved name `file_download` is deliberately kept with this exact spelling to preserve connector compatibility. Offline media downloads go to a domain pack only where they carry a domain-level entitlement meaning.

---

<br>

**6. `file_uploaded` event**
- **Definition:** a file is uploaded successfully.
- **Firing condition (Trigger):** after the upload finishes successfully on the server — not when the file is selected.
- **Parameters:** `file_type` (String) file type; `file_size` (Number) file size in bytes.
- **Role in the funnel:** usually a middle step of the funnel. It is the canonical floor; the SaaS pack only references it and does not redefine it.

---

<br>


**7. `share` event**
- **Definition:** the user shares a piece of content.
- **Firing condition (Trigger):** when a sharing channel is chosen and the share action is completed.
- **Parameters:** `share_channel` (String) the share channel (telegram, instagram, …); `content_id` (String) the ID of the shared content; `entity_type` (String) the entity type (article, video, …).
- **Role in the funnel:** usually an engagement/middle step, not the end goal. **GA4 mapping:** reserved name `share`. Share types are distinguished by combining `share_channel` and `entity_type`.

---

<br>


**8. `error_shown` event**
- **Definition:** a logic/validation error is shown to the user.
- **Firing condition (Trigger):** the moment a user-facing error (page, banner or inline) is shown to the user. Distinct from the automatic JavaScript error (`shahin_client_error` in).
- **Parameters:** `error_type` (String) error category; `error_code` (String) error code; `screen` (String) the page or place where the error occurred.
- **Role in the funnel:** not a funnel goal; a signal of experience quality/health (usually a drop-off point in the funnel).

---

<br>


**9. `empty_state_viewed` event**
- **Definition:** the user sees an empty/no-data state.
- **Firing condition (Trigger):** when a cold-start or no-data surface is rendered on the user's screen.
- **Parameters:** `surface_type` (String) surface type; `screen_name` (String) screen name; `reason` (String) why it is empty.
- **Role in the funnel:** not a funnel goal. Distinct from `search_no_results`, which is the result of a typed search.

---

<br>


**10. `scroll_depth_reached` event**
- **Definition:** the user's scroll reaches a depth threshold on the page.
- **Firing condition (Trigger):** crossing the page-depth milestones: 25%, 50%, 75% and 100%.
- **Parameters:** `depth_percent` (Number) the depth percentage reached (25, 50, 75 or 100).
- **Role in the funnel:** usually an engagement/middle signal, not the end goal. **GA4 mapping:** reserved name `scroll`. The enriched version limited to the article body, `article_read_depth` (Article pack), references this event.

---

<br>


**11. `outbound_click` event**
- **Definition:** a click on a link that takes the user off the site.
- **Firing condition (Trigger):** when a link whose destination is outside the site's domain is clicked.
- **Parameters:** `outbound_domain` (String) destination domain; `url` (String) the full destination URL.
- **Role in the funnel:** usually a middle step; on metasearch/affiliate sites it is often chosen as the goal step of the funnel in the Report Builder.

---

<br>



**12. `cta_clicked` event**
- **Definition:** a click on a call-to-action (CTA) button.
- **Firing condition (Trigger):** when the CTA element is clicked.
- **Parameters:** `cta_id` (String) CTA ID; `cta_label` (String) button text; `placement` (String) where the CTA is displayed.
- **Role in the funnel:** usually a middle intent step, not the end goal. Upgrade CTAs in Subscription/SaaS reach this event through `placement`.

---

<br>


**13. `link_clicked` event**
- **Definition:** a click on an internal link.
- **Firing condition (Trigger):** when a link whose destination is inside the same domain is clicked.
- **Parameters:** `link_url` (String) destination URL; `link_text` (String) link text.
- **Role in the funnel:** usually a middle step, not the end goal. Distinct from `outbound_click` (whose destination is outside the site).

---

<br>


**14. `onboarding_started` event**
- **Definition:** the user enters the onboarding (initial setup) process.
- **Firing condition (Trigger):** when the activation flow starts (the first step is shown).
- **Parameters:** `flow_id` (String) the onboarding flow ID.
- **Role in the funnel:** usually the opening step of the activation funnel. The Mobile App and SaaS/B2B packs reference it.

---

<br>


**15. `onboarding_step_completed` event**
- **Definition:** a step of the onboarding process is completed.
- **Firing condition (Trigger):** after each step of the flow finishes successfully.
- **Parameters:** `flow_id` (String) flow ID; `step_name` (String) step name; `step_index` (Number) step number.
- **Role in the funnel:** a middle step of the activation funnel.


---

<br>


**16. `onboarding_completed` event**
- **Definition:** the onboarding process is fully completed.
- **Firing condition (Trigger):** after the last step of the flow is completed.
- **Parameters:** `flow_id` (String) flow ID; `duration_sec` (Number) total activation time in seconds.
- **Role in the funnel:** the final step of the activation funnel (terminal success); usually chosen as the funnel's goal step.

---

<br>


**17. `sign_up` event**
- **Definition:** a user account is created successfully.
- **Firing condition (Trigger):** **after the server confirms** the account creation — not when the sign-up button is clicked.
- **Parameters:** `method` (String) sign-up method (email, google, …); `signup_source` (String) sign-up source; `invited` (Boolean) was the user invited?
- **Role in the funnel:** a frequently used final step; often chosen as the goal step of the sign-up funnel. **GA4 mapping:** reserved name `sign_up`. The owner of the enriched version is the Authentication pack (`register_completed` with the alias `account_created`), and SaaS references it.

---

<br>


**18. `login` event**
- **Definition:** the user logs in to their account successfully.
- **Firing condition (Trigger):** after the server confirms a successful login.
- **Parameters:** `method` (String) login method; `is_new_device` (Boolean) is the device new?; `mfa_used` (Boolean) was two-factor authentication used?
- **Role in the funnel:** more a retention metric than a funnel step; rarely a funnel goal. **GA4 mapping:** reserved name `login`. The owner is the Authentication pack (`login_completed`); the Security pack co-fires the `login_succeeded` event under the same `session_id`, without counting it twice.

---

<br>


**19. `logout` event**
- **Definition:** the user logs out of their account.
- **Firing condition (Trigger):** when the user logs out — manually or when the session ends.
- **Parameters:** `logout_type` (String) logout type (manual/automatic); `session_duration_sec` (Number) session length in seconds.
- **Role in the funnel:** not a funnel goal. Its canonical name is `logout_completed` (owner: Authentication); GA4 has no reserved logout name.

---

<br>


**20. `consent_updated` event**
- **Definition:** the user's consent/privacy status changes.
- **Firing condition (Trigger):** when the user changes their consent settings (cookie banner or CMP).
- **Parameters:** `consent_state` (String) consent status (granted/denied); `consent_categories` (String) consent categories; `consent_scope` (String, advertising-specific) the scope of advertising consent.
- **Role in the funnel:** not a funnel goal. The owner is the Authentication pack (this event gates the tracking itself); Security and Advertising reference it.

---

<br>


#### Parametric families

The goal of this section is to solve a big problem called "event explosion".

If we do not put this rule in place in Shahin, different clients will send us dozens of different event names for nearly identical actions; for example one sends `video_start`, another `audio_start` and another `podcast_play` — and our database fills up with scattered names.

To solve this problem, Shahin has defined 5 large families. The rule is: **for actions in the same family, we have only one main event name, and the differences are distinguished with Key: Value pairs (parameters).**

##### Family 1 — MEDIA playback

Canonical events: `video_started`, `video_progress`, `video_completed`, `video_seeked`, `video_quality_changed`, `video_buffered`, `video_fullscreen_toggled`, `video_paused`, `video_resumed`, `video_heartbeat`, `video_error`, `ads_video_started`, `ads_video_completed`, `ads_video_skipped`, `ads_video_clicked`, `video_rate_changed`, `video_interrupted`, `video_next_autoplayed`.

Distinguishing parameter: `media_type` (values `video` | `audio` | `vod`) plus `placement` (values `content` | `ad`); the ad values include `pre_roll` | `mid_roll` | `post_roll`. Owner pack: **Video (the Media/Playback baseline)**. One important note: in-stream advertising sits in this same family under `placement=ad`. But the display/inventory cycle of the Advertising pack (from `ad_slot_requested` to `ad_revenue_recorded`) is a separate concept and must not be merged with this family.

##### Family 2 — LIST/ITEM browse

Canonical events: `item_list_viewed`, `item_list_filtered`, `list_item_clicked`, `list_item_impressed`, `item_viewed`.

Distinguishing parameter: `item_type` (values `product` | `listing` | `offer` | `article` | `title` | `course` | `post`) plus `list_type` (values `category` | `feed` | `collection` | `related` | `recommended`; also `search` and `direct` as origins). Owner pack: **Search & Discovery**.

##### Family 3 — COMMERCE funnel

Canonical events: `add_to_cart`, `remove_from_cart`, `add_to_wishlist`, `remove_from_wishlist`, `begin_checkout`, `purchase`, `refund_issued`, `shipping_info_submitted`, `payment_info_submitted`, `coupon_applied`, `coupon_denied`, `cart_viewed`.

Distinguishing parameter: `vertical` (values `ecommerce` | `marketplace` | `travel` | `gaming`). Owner pack: **E-commerce**. Note: GA4 reserved names (`purchase`, `begin_checkout`, …) are kept with their canonical spelling, and the equivalents `booking_completed`/`order_completed` are distinguished under `purchase` by `vertical`.

##### Family 4 — SUBSCRIPTION lifecycle

Canonical events: `subscription_started`, `subscription_renewed`, `subscription_cancelled`, `subscription_upgraded`, `subscription_downgraded`, `subscription_reactivated`, `subscription_expired`, `subscription_paused`, `subscription_resumed`, `subscription_failed`, `trial_started`, `trial_converted`, `trial_expired`, `paywall_viewed`, `paywall_dismissed`, `plan_viewed`, `plan_selected`.

Distinguishing parameter: `product_context` (values `saas` | `vod` | `news` | `gaming`). Owner pack: **Subscription / Paywall**.

##### Family 5 — ENGAGEMENT verbs

Canonical events: `reaction_added`, `reaction_removed`, `comment_added`, `comment_replied`, `comment_deleted`, `entity_followed`, `entity_unfollowed`, `item_saved`, `item_unsaved`, `content_reported`, `message_sent`.

Distinguishing parameter: for follow, the `entity_type` parameter (values `author` | `topic` | `user` | `podcast` | `instructor` | `community`); for save, the `item_type` parameter; for reaction/report, the `target_type` parameter (values `post` | `comment` | `article`; also `listing`, `offer`, `title`). Owner pack: **Community**.

---

#### Naming compatibility and data structure alignment

##### Managing data structure alignment (Data Schema Alignment)

The Shahin platform is architected on the principle of separation of concerns and is tool-independent (Tool-Agnostic). Because Shahin's clients may be using international analytics tools at the same time (such as Mixpanel, Amplitude, Segment, Meta Pixel or GA4), or may intend to migrate from them, Shahin does not tie its data structure to any external platform. Full compatibility with external data ecosystems is provided through an explicit metadata layer (Alias Map) and a two-way mapping engine (Aliasing Engine).

**1) Shahin's standard naming (Canonical Name):** every concept in the core of the Shahin platform has an independent standard canonical name that follows the rigid `object_action` rule (such as `purchase_completed`). This naming is Shahin's independent identity and is not affected by the spelling requirements of external tools.

**2) Multi-platform alias map (Alias Map):** in the database layer, every canonical event carries a set of alternative names (aliases) as metadata (`ga4_name`, `mixpanel_name`, `amplitude_name`, `segment_name`, `meta_name`). These maps guarantee that when data is exported, the special, native behavior of the destination platform (such as Google's Enhanced Ecommerce capability) is activated correctly.

**3) Explicit two-way mapping engine (Aliasing Engine) — [development phase 2]:** this module acts as a structured, config-driven translator in two directions:
- **Inbound (Normalize):** if the client sends events using the naming structure of other tools, the system translates them, based on the config, to Shahin's canonical name (so the client can migrate without changing the site's code).
- **Outbound (Export):** when data is sent to external destinations, the engine converts Shahin's canonical name back to that destination's native alias.

With this architecture in place, Shahin becomes an independent data hub and removes the risk of lock-in to any specific platform.

**How it works (a concrete example).** Suppose a client has had an event named `Video Play` in Mixpanel for years and is now migrating to Shahin. Shahin does not want to force them to change either the names or rewrite their site's code. The solution is a "translation book" (Alias Map) that, for each Shahin canonical event, keeps its equivalent name on each platform as metadata next to the event itself. For example, for the video playback event:
- Shahin canonical name: `video_played`
- `mixpanel_name`: `Video Play`
- `ga4_name`: `video_start`

This book works in two directions:
- **Inbound (Normalize):** when the client sends the event with the Mixpanel name `Video Play`, Shahin looks at this map, translates it to `video_played` and stores it. So the client migrates without changing their site's code, and their historical data also sits under one consistent name.
- **Outbound (Export):** when Shahin passes data to an external destination, it again uses this map to return that destination's native name (for GA4, for example, it becomes `video_start`).

This map is **config-driven**: translations are defined in a configuration, not in hard-coded logic; so adding a new platform is just adding one name column to the same map. ⚠️ Note: the two-way mapping engine itself (Aliasing Engine) is built in **phase 2**; in the current version, only the *Alias metadata structure* is reserved on each canonical event so that this translation becomes possible later.

##### House-style normalization and mapping metadata

Shahin's house style is the past tense. So inconsistent suffixes must be normalized: `*_change` → `*_changed`, `*_complete` → `*_completed`, `*_start` → `*_started` (for example `video_quality_change` → `video_quality_changed`, `audio_speed_change` → `video_rate_changed`). The full naming rules are in §5.3.

The `shahin_` prefix is reserved exclusively for system events, and user/domain events must never use it.

In addition to its own name, every canonical event carries the aliases `ga4_name` and `segment_name` as metadata so that a clean two-way mapping is possible. To close, one principle is worth repeating: **canonical identity (name, ownership, reference event) is a property of the canonical event, not of the pack's copy** — so one name always resolves to a single identity everywhere. (There is no tier or conversion property on an event; the conversion rate comes from funnels — §5.4.)
### 5.3. Naming rules (Naming Convention)

Shahin has a single naming convention for all events. The goal is simple: preventing scattered and inconsistent data.

**Rule 1: snake_case**

Write every event name in lowercase letters and join the words with `_`:

```
✅ article_viewed
✅ purchase_completed
✅ form_submit

❌ ArticleViewed
❌ articleViewed
❌ article viewed
❌ ARTICLE_VIEWED
```

**Rule 2: the object_action pattern**

Write the object first (what?), then the action (what happened?):

```
article  _  viewed      → object: article  | action: viewed
video    _  completed   → object: video    | action: completed
purchase _  completed   → object: purchase | action: completed
```

This pattern places all the events of one object next to each other. As a result, filtering and reporting become much easier.

**Rule 3: reserved prefix**

The `shahin_` prefix belongs only to Shahin's system events. No user is allowed to use this prefix (examples at the end of this section).

**Rule 4: case sensitivity**

Shahin is case-sensitive in event names and properties. `Article_Viewed`, `article_viewed` and `ARTICLE_VIEWED` are three completely separate entities in storage, and their stats are never combined.

> ⚠️ **This is one of the most common causes of data loss in event systems.** So, as a product rule, event names and property keys must be normalized to a consistent form (`lowercase`) before they are stored. This prevents duplicate events with different names from coming in. (How this normalization is implemented technically will be finalized with the engineering team.)

```
shahin_session_start  ← Shahin system only
shahin_page_view      ← Shahin system only
article_viewed        ← site / user — allowed ✅
shahin_my_event       ← user — forbidden ❌
```

---
### 5.4. Conversion rate: from funnels only

In Shahin there is no "mark this event as a conversion" mechanism — no flag on the event, no cap, no choice of session-based/user-based basis, and no automatic conversion column or badge. **The conversion rate is the output of a funnel**, exactly as in Mixpanel: in the Report Builder the customer lines up several events in sequence as steps, and the pass-through rate of that funnel is the "conversion rate". Any event can be the final step of a funnel; which event is the goal is that funnel's decision, not a fixed property of the event.

The ready-made overviews also take their conversion rates from **prebuilt funnels on the same Report Builder engine**, not from a separate calculation. The consequence is that the dashboard number and the Report Builder number come from one engine and **cannot diverge** — the principle of "one engine, one number" (§10 of the business document `00-Business-Model.md`).

The No-Backfill rule holds for funnels too: a rate only has meaning from the moment the events of the funnel's steps started arriving; the period before that has no funnel data at all and must not be read as zero.

> **Cleanup of the previous model.** The GA4-style marking model (the is_conversion flag, the Mark-as-Conversion toggle, the 30-conversion cap, the session-based/user-based basis switch, and automatic publishing of a rate column/badge) has been removed completely (1405/05/20, Decision-Log decision; reference: `00-Business-Model.md` §11). In the video dashboard wireframe, the conversion definition banner was also removed, and the up-to-date reference is `video-dashboard/v36` (the old v27 is deprecated). From now on, the specialized conversion narrative in each dashboard (for example "CTA click rate" in VOD) is simply a prebuilt Report Builder funnel, not a separate badge.

### 5.4.1 The Custom Event pattern

#### What it is and where it sits

Custom Event is **the second half of the product** and is open to every customer — not a phased layer. The customer sends any event with any name and properties they want, and the schema is born from the data itself, instead of being chosen from Shahin's predefined catalog.

The full business definition of this half — schema-less ingestion, Report Builder and Dashboard Builder, Lexicon and governance, and identity — is in [`00-Business-Model.md`](./00-Business-Model.md) sections 6 to 9. What follows is the operational mechanism for it.

This pattern invents nothing new; it rides on Shahin's existing primitives: the same naming convention of §5.3 (snake_case, the object_action pattern, the reserved `shahin_` prefix, lowercase normalization); the same three-part event structure of §5.1/§5.5 (name + Event Properties + Auto-properties that are attached automatically); and the same conversion-rate-from-funnels model in the Report Builder (§5.4).

Only two genuinely new things are added. First, a **schema-builder at `Settings → Events → Custom Events`**, where the site's author registers the name and required/optional parameters of a custom event before sending any data. Second, a **"Custom" badge** that separates user-defined events from Shahin's predefined events everywhere.

#### Schema definition by the site

Every custom event equals: **a name + a list of Event Properties** (each with key, type, required or optional, and a description). This structure mirrors §5.1/§5.5. The Auto-properties (the §5.2 list — `page_url`, `device_type`, `city`, `utm_*`, `session_id`, etc.) are attached automatically. They are shown in a read-only section titled "Attached automatically" (Persian: `به‌صورت خودکار ضمیمه می‌شود`) that the user cannot edit — exactly as predefined events receive these properties.

**Validation contract:** a required property that is missing or has the wrong type **does not reject** the event. The event is stored and flagged invalid, but it is not counted in charts or rollups; it shows in data health, and a chart states how many invalid events it left out (Decision 6, amended by decision 30, 2026-10-28). The role of the required/optional toggle is to decide whether the absence of a property produces a data quality warning or not — not to throw the event away.

#### Naming per the naming rules

The four rules of §5.3 apply as they are:

- **Rule 1 — snake_case:** the name field only accepts `[a-z0-9_]`. Live inline validation while typing rejects CamelCase, spaces, a leading digit and uppercase letters, and shows the violated rule with the same examples as §5.3: ✅ `article_viewed` / ❌ `ArticleViewed` / ❌ `articleViewed` / ❌ `article viewed` / ❌ `ARTICLE_VIEWED`.
- **Rule 2 — object_action:** this pattern is shown as **guidance**, not a hard block (in §5.3 it is a convention, not a parseable rule). A non-blocking hint, "Suggested pattern: object_action" (Persian: `الگوی پیشنهادی: موضوع_عمل (object_action)`), is shown with an example; no name is rejected merely for not matching this pattern.
- **Rule 3 — reserved prefix:** a **hard block** on any name that starts with `shahin_`. This is the non-negotiable governance of rule 3 of §5.3 — the error `پیشوند shahin_ رزرو سیستم است` / `shahin_ prefix is reserved for system events`, and Save is disabled. This guard applies both at **registration** time and at **ingestion** time: a custom event that arrives over the wire with `shahin_` is rejected, not normalized.
- **Rule 4 — lowercase normalization:** per rule 4 of §5.3, the event name and every property key are normalized to lowercase before they are stored, so that `Article_Viewed`, `article_viewed` and `ARTICLE_VIEWED` do not create three diverging entities. The builder must **show the normalized form the user is about to register** ("Saved as: article_viewed"; Persian: `ذخیره می‌شود به‌صورت: article_viewed`) so that the normalization is transparent, not silent. (The exact normalization mechanism will be finalized with engineering; the UI expresses the behavior, not the implementation.)

**Property key governance:** property keys follow the same snake_case + lowercase normalization + `shahin_` prefix ban rules (in §5.3, both event names and property keys are case-sensitive). Keys are validated with the same rules as the name field.

#### The "Custom" badge everywhere

A single, consistent "Custom" badge (Persian: `سفارشی` / English: `Custom`) marks every user-defined event **everywhere** it appears next to predefined events: the Events list in Settings, every automatic dashboard widget, and every cross-service picker (filters, segment builder, funnel steps). Predefined events never have this badge.

The Custom badge only shows the event's **origin**: "this event was defined by your site, not by Shahin's catalog". An event's business importance is told elsewhere — through the funnel the customer builds in the Report Builder (§5.4), not a fixed mark on the event itself.

**Badge styling via tokens only:** the Custom badge uses the `--sh-*` tokens (a neutral/secondary chip, **not** the brand orange `#FF5C2F`, which is reserved for primary actions and brand emphasis), supports the dark/light theme, and has a bilingual `#gtt` tooltip that explains "This event was defined by your site, not taken from Shahin's catalog" (Persian: `این ایونت توسط سایت شما تعریف شده، نه از کاتالوگ شاهین`).

#### The Pending / Unrecognized queue

Shahin must neither **silently drop** nor **silently accept** a custom event that has no registered schema. Such events land in the "Pending / Unrecognized Events" queue (Persian label: `شناسایی‌نشده`) in `Settings → Events`, which shows the event name, the first-seen time, the hit count and the observed property keys. From this queue the user can, with one click, choose **Register schema from observed** (which pre-fills the builder with the detected keys, all defaulting to optional, so that the user confirms required/optional) or press **Ignore/Block**. This is the safety net for the gap between the SDK sending data and the schema being registered.

**Flag versus Drop — two different failure modes:**

- A **registered** event + a missing required property = **accepted with a data quality warning** — stored but not counted, shown in data health, with charts stating how many were left out (decision 30).
- An entirely **unregistered** event name = **FLAGGED** to the Pending queue, and not counted in clean reports until it is registered — an unknown event awaiting governance.

The UI must show these two with different labels and must not mix them up.

#### Automatic reporting

**Automatic widgets:** as soon as a custom event is registered and data arrives, Shahin automatically generates its own dashboard widgets (volume trend, top values for each required property, a breakdown by key auto-properties such as device/city/source) — the same widget grammar as predefined events, only sourced from the user's schema. Each widget's header carries the Custom badge.

**Cross-service access:** registered custom events and their properties become selectable in cross-service tools — as a filter dimension, a segment condition, and (in the future) a funnel step — exactly like predefined events. Each one is shown in the picker with the Custom badge so that its provenance is clear. Use as a funnel step is shown but disabled, with the note "Funnel Builder — coming in Phase 2" (a forward reference per §5.4).

**Use as a funnel step:** custom events, exactly like predefined events, can be a step of any funnel in the Report Builder — including the final/goal step from which the conversion rate comes (§5.4). There is no marking, flag or cap involved; the rate is the output of that funnel and, like any funnel, has No-Backfill (it only has meaning from the time the step events arrive). The use of a custom event as a funnel step is currently shown with the note "Funnel Builder — coming in Phase 2".

#### Empty state and no hard delete

**Empty state / new event:** a newly registered custom event with zero hits shows an explicit empty state (`در انتظار اولین ایونت` / `Awaiting first event`) together with an SDK call snippet to copy — not a broken zero chart that looks like a system failure. This is aligned with the §5.4 philosophy, which never confuses "no data yet" with "the system is broken".

**No hard delete of a schema** — both in the wireframe-project sense and in the product sense: disabling a custom event **archives** it (it stops new widget generation and keeps the history), rather than destroying the collected data. Surface it as "Archive", not "Delete".

#### Key scenarios

- **First visit:** the page loads. It has two areas: "My Custom Events" (an empty state with the CTA "Register new event" and a short explanation that this is for events outside Shahin's catalog) and the "Pending / Unrecognized" queue. A "Phase 2" pill is visible on the menu entry.
- **Typing the name `ArticleViewed`:** inline validation flags rule 1 (snake_case) in red with the example ❌ `ArticleViewed`; the field stays invalid and Save is disabled until the user corrects it to `article_viewed`. The object_action pattern hint is shown as non-blocking.
- **Trying a name with `shahin_` (such as `shahin_my_event`):** hard block. The error `پیشوند shahin_ رزرو سیستم است` / `shahin_ prefix is reserved`. Save is disabled. No normalization happens — the reserved prefix is rejected, not rewritten.
- **Registering `purchase_completed`** with the required props `order_id`, `total_amount` and the optional `coupon_code`: the builder shows the three-part structure (editable Event Properties with key + type + required/optional toggle + description; the read-only Auto-properties section; confirmation of the normalized name). After saving, it appears in "My Custom Events" with the Custom badge and a zero-state widget.
- **A registered event arrives without the required `order_id`:** the event is stored and flagged invalid, but not counted in charts or rollups (decision 30, 2026-10-28). Charts that leave it out state how many events they left out. Lexicon shows a data quality counter ("N events without order_id"; Persian: `N رویداد بدون order_id`) so that the developer fixes the SDK call.
- **An unregistered `newsletter_signup` starts arriving:** it is neither silently dropped nor does it pollute the clean reports. It appears in the Pending queue with first-seen, hit count and observed keys. The user presses **Register schema from observed** → the builder opens pre-filled with the detected keys (all defaulting to optional) so that the user confirms required/optional, and it is then promoted to a registered Custom event.
- **An Events dashboard mixing predefined and custom events:** pack events have no Custom badge; user events have a neutral "Custom" chip (tokens, theme-aware, bilingual `#gtt` tooltip). The Custom badge only shows origin (provenance); business importance is told separately, through the Report Builder funnel, not a mark on the event.
- **Using `subscription_completed` as the goal step of a funnel in the Report Builder:** the customer builds a funnel in the Report Builder whose final step is `subscription_completed`, and the funnel's pass-through rate is the conversion rate. No cap or marking is involved (§5.4), and the rate only has meaning from the time the funnel's events arrive (No-Backfill). The custom event is shown in the funnel-step picker with the Custom badge.
- **Opening a cross-service tool (filter / segment builder):** the registered custom event and its declared properties are selectable as a dimension/condition alongside the predefined ones, each with the Custom badge in the picker. Use as a funnel step is shown but disabled, with the note "Funnel Builder — coming in Phase 2".
- **A registered event with zero hits:** its dashboard widget shows the explicit empty state `Awaiting first event` / `در انتظار اولین ایونت` with a copyable SDK snippet — not a flat zero-line chart that reads like a system failure.

### 5.5. The full structure of an event

A complete example of an event recorded in Shahin:

```
event_name:    article_viewed
owner_pack:    Article & Content (automatic path — WordPress connector)

─── Auto-properties ─────────────────────
  timestamp:         2026-05-09T14:32:00Z
  session_id:        sess_abc123
  user_id:           usr_xyz789
  page_url:          khabar.ir/articles/12345
  page_title:        "خبر فوری: ..."  ("Breaking news: ...")
  referrer:          t.me/channel
  device_type:       mobile
  os:                Android
  browser:           Chrome
  city:              Tehran
  utm_source:        telegram
  utm_campaign:      nowruz-2026

─── Event Properties ────────────────────
  article_id:        "12345"          ← required
  article_title:     "خبر فوری: ..."  ← required  ("Breaking news: ...")
  article_category:  "سیاسی"         ← required  ("Politics")
  author:            "علی احمدی"     ← optional  ("Ali Ahmadi")
  word_count:        850              ← optional
  is_premium:        false            ← optional
```

---
## 6. Event design methodology + event→value mapping

### 6.1. The 5-step event design checklist

To add any new event, the product team must go through these 5 steps:

- **Step 1 — Discover the need (Business Question):** the process never starts with "which event should we send?". First this question is answered: "What does the stakeholder want to know that they currently have no tool for?" (Example: the question "Is the content being read?" produces the `article_read_depth` event.)
- **Step 2 — Standard naming:** direct application of the `object_action` pattern and the snake_case structure (see the rules in section 5.3).
- **Step 3 — Define the parameter types:** classify fields into exactly three groups: Dimension, Metric or Identifier (see the definitions in section 5.3).
- **Step 4 — Layered separation of data:** place each field in its correct layer (Event, User or Auto). User-level data must not be repeated at the event level.
- **Step 5 — The No Orphan Events rule:** the condition for an event to enter Shahin's catalog is having a clear consumer in the panel.
