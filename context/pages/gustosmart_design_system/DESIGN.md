---
name: GustoSmart Design System
colors:
  surface: '#faf9ff'
  surface-dim: '#d2daf1'
  surface-bright: '#faf9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8ff'
  surface-container-highest: '#dbe2fa'
  on-surface: '#131b2c'
  on-surface-variant: '#5a413a'
  inverse-surface: '#283042'
  inverse-on-surface: '#edf0ff'
  outline: '#8e7069'
  outline-variant: '#e3beb6'
  surface-tint: '#b32b00'
  primary: '#ae2900'
  on-primary: '#ffffff'
  primary-container: '#d34018'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4a1'
  secondary: '#006c53'
  on-secondary: '#ffffff'
  secondary-container: '#81f5ce'
  on-secondary-container: '#007057'
  tertiary: '#5d5c59'
  on-tertiary: '#ffffff'
  tertiary-container: '#757471'
  on-tertiary-container: '#faffe7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd2'
  primary-fixed-dim: '#ffb4a1'
  on-primary-fixed: '#3c0800'
  on-primary-fixed-variant: '#891e00'
  secondary-fixed: '#84f7d1'
  secondary-fixed-dim: '#66dbb6'
  on-secondary-fixed: '#002117'
  on-secondary-fixed-variant: '#00513e'
  tertiary-fixed: '#e5e2de'
  tertiary-fixed-dim: '#c8c6c2'
  on-tertiary-fixed: '#1c1c1a'
  on-tertiary-fixed-variant: '#474744'
  background: '#faf9ff'
  on-background: '#131b2c'
  surface-variant: '#dbe2fa'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  container-margin: 1.5rem
  gutter: 1rem
---

## Brand & Style
The design system is engineered to bridge the gap between culinary warmth and high-tech efficiency. It targets a sophisticated audience that values both the artisanal quality of home cooking and the precision of smart-home integration. 

The aesthetic centers on **Modern Glassmorphism**, utilizing layered transparency and background blurs to create a sense of depth and lightweight interaction. The interface should feel "breathable" and optimistic, evoking the sensory pleasure of a well-lit, modern kitchen. We balance technical innovation with a "human-centric" approach, ensuring the UI feels like a helpful kitchen assistant rather than a cold utility.

## Colors
This design system utilizes a high-contrast palette that balances appetising warmth with technical stability.

- **Primary (Warm Terracotta):** Used for primary actions, high-priority notifications, and brand-heavy moments. It evokes heat, spices, and energy.
- **Secondary (Sage Green):** Applied to success states, healthy-choice indicators, and freshness-related features. It provides a calming counter-balance to the terracotta.
- **Backgrounds:** The light mode uses a warm cream base to keep the interface feeling organic, while the dark mode uses a deep slate navy to provide high contrast for "Chef Mode" or low-light cooking environments.
- **Surface Treatment:** Surfaces are rarely opaque. They should utilize a 60-80% opacity variant of the background or neutral colors combined with a `20px` to `40px` backdrop blur to achieve the glassmorphism effect.

## Typography
The typography strategy pairings the geometric, friendly precision of **Outfit** for headings with the systematic legibility of **Inter** for functional copy.

- **Headlines:** Set in Outfit with tight letter-spacing to create a modern, editorial feel. Use bold and semi-bold weights to establish a clear information hierarchy.
- **Body:** Inter is the workhorse for instructions and ingredient lists. High line-heights (1.5x+) are essential to ensure readability while the user is actively cooking.
- **Micro-copy:** Labels and captions use medium weights to maintain legibility against semi-transparent glass backgrounds.

## Layout & Spacing
The design system employs a **fluid grid** model with generous white space to prevent the UI from feeling cluttered—crucial for a kitchen environment.

- **Grid:** Use a 12-column grid for desktop and a 4-column grid for mobile.
- **Rhythm:** Spacing follows a 4px baseline. Components should primarily use `md` (24px) or `lg` (32px) padding to accommodate touch targets and visual "breathing room."
- **Touch Targets:** All interactive elements must maintain a minimum 44x44px hit area, acknowledging that users may have messy or wet hands while interacting with the app.

## Elevation & Depth
Depth is conveyed through **Backdrop Blurs** and **Ambient Shadows** rather than traditional elevation levels.

- **Glass Surfaces:** Secondary and tertiary panels use a semi-transparent fill (`rgba(255, 255, 255, 0.6)` in light mode) with a background-blur effect.
- **Borders:** "Inner-glow" borders (1px, low-opacity white or primary tint) should be used on glass panels to define edges against varied backgrounds.
- **Shadows:** Use extra-diffused, large-radius shadows (`blur: 40px`, `y: 10px`) with a very low opacity (5-10%) and a slight tint of the Primary color to make elements appear as if they are floating over the "kitchen counter" surface.

## Shapes
The shape language is ultra-soft and approachable, moving away from the harshness of traditional software.

- **Global Radius:** Use `1rem` (16px) as the base for standard components like buttons and input fields.
- **Containers:** Large cards and recipe modals should use `rounded-2xl` (1.5rem) or `rounded-3xl` (2rem) to emphasize the premium, friendly feel.
- **Icons:** Icons should feature rounded terminals and a medium stroke weight (2px) to match the curvature of the typography.

## Components
- **Primary Buttons:** High-saturation Terracotta fills with white text. Apply a subtle "lift" shadow on hover.
- **Glass Cards:** The signature component. Transparent background with a `24px` blur and a 1px `white/10%` border. These hold recipe previews and stats.
- **Instruction Chips:** Use Sage Green for "Step Complete" or "Active Timer" states.
- **Interactive Inputs:** Text fields should have a glass-style background with a focused state that highlights the border in Primary Terracotta.
- **Cooking Mode List:** A high-contrast list view with oversized checkboxes and increased vertical padding for easy glancing from a distance.
- **Smart Gauges:** Circular progress indicators for timers and temperature controls, utilizing gradient strokes from Terracotta to Sage.