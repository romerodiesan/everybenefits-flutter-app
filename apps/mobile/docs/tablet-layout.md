# Tablet layout (Pulse Flutter)

Window classes use the **shortest side** so phones stay compact in landscape.

| Class | Shortest side | Chrome | Content |
| --- | --- | --- | --- |
| compact | `< 600` | Bottom `PulseTabBar` | Full-screen pushes |
| medium | `600–839` | `PulseNavRail` | Constrained widths |
| expanded | `≥ 840` | `PulseNavRail` | Master-detail (chats, forums), academy grids |

## When to split

`pulseUseMasterDetail` is true when **width ≥ 840** (iPad landscape and large tablets). Inbox/feed stays on the left; conversation/thread on the right.

## Tokens

- Feed / reading: 680
- Forms: 720
- Shell body: 1100
- Inbox pane: 360 (clamped 280–420)

Helpers live in `lib/app/layout/`.
