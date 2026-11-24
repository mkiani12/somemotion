# Chart style convention

One look for every chart in Shahin. The convention covers the 17 chart types that are live today or ready in the hub designs. It never changes a chart's type. It only fixes how each type looks and behaves: color, axis, legend, tooltip, numbers, states and interaction.

## Open it

`chart-style-convention.html` is a single self-contained file (Persian, RTL, 49 pages). Open it in a browser. The screenshots are embedded. Only the Vazirmatn font loads from Google Fonts, so offline it falls back to a system font.

## What's inside

- **Part 1, shared bases (پایه ۱ to ۱۲):** the rules that are the same for all 17 types. These are the 6-color series ramp for light and dark themes, the four color roles (categorical, intensity, status, neutral), axis and grid, numbers and dates, tooltip, legend, the loading, empty and incomplete-period states, interaction, container, comparison period, mobile degradation, and touch and pin.
- **Part 2, the 17 chart types:** one page per type, each with today's screenshot, the mock after the change, and the specs.
- **Part 3, handoff:** the 24-point acceptance checklist and the five-wave implementation order.

## Key rules at a glance

- Series colors come from the fixed 6-color ramp, always in the same order. The same metric gets the same color on every page. Light: `#3CA3FA #FFA52C #9385FF #FF5D75 #4FD9AD #E96BD0`, "Other" `#B4C2DF`. Dark: `#85C1FF #FFBE5C #A29BFE #FF8595 #81ECE1 #F8A5EC`, "Other" `#A3B3D2`.
- Brand orange `#FF5C2F` never enters the chart canvas.
- One chart uses one color role. Status colors never sit next to series colors in the same chart.
- The grid is horizontal only, solid and 1px, with four lines. There's no frame, no ticks, and labels never rotate.
- The legend sits under the chart, centered, with a 12px rounded square. A single-series chart has no legend.
- The chart title goes in the card header, never inside the chart canvas.

## Open decision

The donut's inner radius (60% with the total in the center) is the only form change in the deck. It's flagged as open on the pie/donut page.

## Who uses it

- **Engineering (front-cp):** `.claude/skills/chart-style-convention/SKILL.md` distills this deck into implementation rules.
- **Wireframes and chart reviews:** the PM's `chart-review` skill applies the same rules to the demo.

This convention supersedes `product/design-system/tokens/dataviz.spec.md` wherever the two disagree.
