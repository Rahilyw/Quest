# Store screenshots

**Card:** K2, build 3. **Written:** Nov 25, 2026.
**Use:** the shot list, sizes and staging rules for App Store Connect and Google Play. Captions
follow BRAND.md §9: sentence case, plain verbs, real places, no emoji.

---

## 1. Shot list (in this order)

The set follows one quest from start to finish, the way BRAND.md §2 describes the app. Eight
shots; drop 7 and 8 if you want six.

| # | Screen | How to get there | What has to be in frame | Caption |
|---|---|---|---|---|
| 1 | **This week** (the dark screen) | Sign in, This week tab | The sentence with stickers and bold places, the week clock, the scoreboard line | Your week in Victoria, in one sentence |
| 2 | **Quests** | Quests tab | Category folders with their counts, at least four colours | Every quest, filed by what you'll do |
| 3 | **Quest page** | Tap a quest with a good location photo and recent proof photos | The location photo, the proof stack in the corner, the name, "You're in the zone", Start quest | Real places, with this week's proof photos |
| 4 | **Camera** | Start quest, standing in the zone | The zone chip "You're in the zone", the small zone map, the shutter | Get the place in frame. We check you're there |
| 5 | **Verified** | Take the photo inside the zone | The full-colour Verified screen with the badge or XP medal and the sticker | Verified on the spot. The XP lands right away |
| 6 | **City** | City tab | Three or four speech-bubble posts, each led by its proof photo | See what the city did today |
| 7 | **Rankings** | Rankings tab | The podium and a few chasers | This week's board resets Monday |
| 8 | **You** | You tab | Badges and medals above a sticker board with a few placed stickers | Your page, made of places you've been |

Shot 4 can't be taken in a simulator (no camera). Shots 3–5 need you physically inside a quest
zone, on a build where the geofence is real: never stage them with
`EXPO_PUBLIC_BYPASS_GEOFENCE`, which only works in dev builds anyway (`lib/constants.ts`).

---

## 2. Sizes

Taken from the store consoles as of late 2026. Check the upload page before you export, because
Apple and Google change these.

### App Store (iPhone only: `supportsTablet` is `false` in `app.json`, so no iPad set)

| Display | Portrait size (px) | Devices that produce it | Needed |
|---|---|---|---|
| 6.9" | 1320 × 2868 (also accepted: 1290 × 2796, 1260 × 2736) | iPhone 16 Pro Max, 15 Pro Max, 16 Plus, 15 Plus | Yes, this is the main set |
| 6.5" | 1284 × 2778 or 1242 × 2688 | iPhone 11 Pro Max, XS Max, 12–14 Pro Max | Only if you don't upload 6.9". App Store Connect scales the 6.9" set down otherwise |

1 to 10 screenshots per set. PNG or JPEG, RGB, no transparency. App previews (video) are optional.

### Google Play (phone)

| Item | Size | Notes |
|---|---|---|
| Phone screenshots | 1080 × 1920 portrait (9:16) | 2 to 8. Each side 320–3840 px, long side no more than twice the short side. At least 4 at 1080 px or wider to be eligible for featuring. JPEG or 24-bit PNG, no transparency |
| Feature graphic | 1024 × 500 | Required. Paper `#F6F2EC` or desk `#EDE6DC`, the Pilowlava wordmark, real stickers. No device frame needed |
| App icon | 512 × 512 PNG | Required in the Play listing. Export from `apps/mobile/assets/icon.png`'s source |

Android ships after iOS (card G5). Shoot the Android set on an Android phone, because the tab
bar and status bar look different.

---

## 3. Staging

- **Account.** Use a staging account you own, not the reviewer demo account (that one must stay
  untouched, APP-REVIEW.md §2). Give it a few completed quests, a streak, two badges and a
  sticker board with stickers placed by hand, so You and Rankings look lived in.
- **Content.** Use live pilot quests with real location photos and real stickers (BRAND.md §6).
  No placeholder art, stock photos, drawn stickers or emoji. A quest without a sticker shows no
  sticker, and that's fine.
- **People.** No real person's face unless they've said yes in writing, and that includes the
  background of a proof photo. Selfies never appear in screenshots: they're private in the app.
  Usernames on City and Rankings must belong to accounts you own or to players who've agreed.
  Otherwise, take shots 6 and 7 while only your accounts are on screen.
- **Where.** Shoot 3–5 at a quest you can stand in, during the day, so the location photo and
  your proof photo agree. Dallas Road, Moss Street Market and the Inner Harbour all photograph
  well.
- **Status bar.** Full battery, full signal, a plain time. In a simulator:
  `xcrun simctl status_bar booted override --time 9:41 --batteryLevel 100 --cellularBars 4`.
  On a phone, use Focus to hide notifications.
- **Text size.** Default system text size, light appearance.
- **Captions.** If you add caption bands above the phone, use Figtree on paper with ink text
  (BRAND.md §3–4). Category colours only behind the matching category. No gradients.
- **Honesty.** Every shot must be the real app in a real state. Apple rejects screenshots that
  show features the app doesn't have (Guideline 2.3.3), so leave duo quests, flash quests and
  anything else not shipped out of the set.
