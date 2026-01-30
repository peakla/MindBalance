# MindBalance

## Overview

MindBalance is a static website platform providing curated, credible information and resources on mental health topics like anxiety, depression, stress, and mindfulness. It offers a resource library, blog content, and user authentication for personalized features such as saving articles. The project aims to be an accessible digital hub for mental wellness, sourcing information from authoritative providers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Design
MindBalance is a static website built with HTML, CSS, and JavaScript, employing a component-based styling approach with a strong focus on accessibility and user experience.

### Frontend
-   **Structure & Styling**: Multiple static HTML pages, custom CSS with a robust custom properties system for theming, and Poppins font family.
-   **Interactivity**: Vanilla JavaScript for DOM manipulation and managing user preferences.
-   **Animation System**: Comprehensive shared animation library (`css/animations.css` and `js/animations.js`) providing:
    - Scroll-triggered animations via IntersectionObserver (fade-in, slide-up, slide-left, slide-right, scale-in, blur-in)
    - Staggered card reveal animations for grids
    - Hover effects (lift, scale, glow, 3D tilt, shine)
    - Continuous animations (float, pulse, shimmer, bounce)
    - Enhanced quote-block component with floating animation and decorative elements
    - Back-to-top button with bounce animation
    - Full dark mode support for all animations
    - Respects `prefers-reduced-motion` for accessibility
-   **Accessibility**: Comprehensive settings panel offering 7 options (Dark Mode, Font Size, High Contrast, Colorblind modes, Focus Mode, Dyslexia Font, Reduced Motion) with preferences persisted via localStorage.
-   **User Accent Color System**: Theme-aware accent color picker with 8 color options (gold, purple, blue, green, teal, pink, orange, red). Applied via CSS custom properties (`--user-accent`, `--user-accent-hover`, `--user-accent-rgb`, `--user-accent-glow`) at `:root` level. Default accent is gold-crayola (#af916d) for light mode and purple (#9b7ed9) for dark mode. User-selected accent persists independently of theme and is applied to all interactive elements (buttons, links, progress bars, TOC pills, TTS controls, scrollbars).
-   **Responsiveness**: Full responsive design with orientation lock messages and safe area support.
-   **Multilingual Support**: Supports 6 languages (English, Spanish, French, Chinese Simplified, Hindi, Korean) using `data-translate` attributes and JSON-based translation files. Language preference persists in localStorage. A CSV master file (`translations.csv`) is the single source of truth for translations, with Python scripts to generate JSON files and audit for completeness.

### Backend/Data
-   **Authentication**: Utilizes Supabase for email/password authentication and user sessions.
-   **Community Hub**: Live forum with posts, comments, and likes stored in Supabase, featuring real-time updates, profanity filtering, media uploads, and admin moderation.
-   **Data Storage**: Resource library data is stored in static JSON files, linking to external authoritative sources.
-   **Resource Suggestions**: User-submitted resource suggestions are stored in a Supabase table for administrative review.

### Key Features
-   **Resource Library**: Interactive directory with featured resources spotlight, non-profit organizations (NAMI, Mental Health America, Crisis Text Line, The Trevor Project, 988 Lifeline), community resources with local examples, a suggestion form, real-time search and filtering (including Non-Profit and Community categories), share buttons, and visual polish (card effects, animations, skeleton loading).
-   **Find Help** (`/find-help/`): Dedicated page for finding local mental health services:
    - ZIP code search with radius selector (5/10/25/50/100 miles)
    - Service type filters (Mental Health, Substance Use, Crisis Services)
    - Rich result cards showing facility name, services, address, phone, distance
    - Call and Directions action buttons on each result
    - Powered by SAMHSA Treatment Locator API
    - Always-visible crisis resources section (988 Lifeline, Crisis Text Line, Trevor Project)
    - National non-profits with local chapter finders (pulled from resources.json)
-   **Support Page**: Provides crisis support, helplines, self-help tools (breathing, grounding, journaling), an appointment scheduler, and a split-panel FAQ with modern design (questions list on left, answer display on right, category tabs, search, prev/next navigation, quick tips section, responsive mobile layout).
-   **User Settings**: Persistent panel for customizing accessibility options.
-   **Navigation**: Dynamic navbar with a crisis button, search bar with typeahead, dropdown menus, notification badges, and a mobile-specific hamburger menu.
-   **User Profile Page**: Instagram-style profile with cover and avatar uploads, editable display name and bio, social links, unified stats card (posts, comments, likes, followers, following, reputation, streak badges), and multiple tabs (Activity, Liked Posts, Saved Articles, Achievements, Wellness, Settings). Includes a mood tracker, wellness goals CRUD, reading streak calendar, profile theme picker, privacy controls, and account deletion functionality. Supports public profile viewing with privacy considerations and a social follow/unfollow system.
-   **Enhanced Wellness Tab** (`profile/wellness-enhanced.css`): Comprehensive visual overhaul including:
    - Full-width profile layout (1400px max-width) for better laptop/desktop experience
    - Glassmorphism card effects with subtle blur backgrounds and gradient top borders
    - Mood tracker with large animated emoji buttons (2rem), glow effects on selection, and wiggle animations
    - Mood entry cards redesigned to match Liked Posts style: emoji in circular container, mood label (color-coded), date/time, and note preview with chat icon
    - Wellness goals with category icons (leaf, fitness, moon, people, book), enhanced empty states, and delete button hover effects
    - Reading streak with animated flame icon, GitHub-style activity calendar with 4 intensity levels, and milestone badges (7/14/30/100 day)
    - Full dark mode support and mobile responsive design (768px/480px breakpoints)
-   **Analytics & Tracking System**: Comprehensive user activity tracking via centralized `analytics.js` and `auth.js` modules:
    - Tracks page views, article reads/completions, scroll depth, time spent on pages
    - **Daily visit logging** with streak calculation - automatically logs visits to `user_engagement` table
    - **Reading streak tracking** - calculates consecutive daily visits with current and longest streak stats
    - Achievement system with 15 unlockable badges and unlock animations
    - Calendar heatmap visualization (GitHub-style) showing daily activity levels
    - Activity timeline with icons, timestamps, and smooth animations
    - Reading stats cards with animated bar charts
    - Progress rings for wellness goals
    - Four Supabase tables: `user_activity_logs`, `reading_progress`, `user_achievements`, `user_engagement`
    - Full dark mode support and skeleton loading states
-   **Enhanced Footer** (`js/footer.js`): Comprehensive modern footer with:
    - Animated three-layer wave separator with CSS keyframe animations
    - Decorative dot pattern overlay for visual texture
    - Gradient backgrounds with radial overlay effects
    - Trust badges section (Privacy First, Accessible, Community)
    - Newsletter signup form with email input, subscribe button, and success toast
    - Recent blog posts preview section with 3 latest articles
    - Collapsible accordion navigation for mobile (expand/collapse with animation)
    - Footer controls: language selector dropdown + dark/light mode toggle with bidirectional sync to header
    - Social media icons: Instagram + YouTube (https://www.youtube.com/@MindBaIance)
    - Rounded pill-style buttons with shadows and hover effects
    - Glassmorphism topic tags with backdrop blur
    - Full dark mode support with consistent purple accent colors (--purple-accent, --purple-gradient variables)
    - Back-to-top button with smooth scroll and bounce animation
    - Control sync: Footer and header theme/language toggles stay synchronized via shared localStorage keys
-   **Community Hub Enhancements**: Features popular discussions sidebar, clickable usernames linking to profiles, an @mentions system with autocomplete, and an inbox/notifications modal.
-   **Article Pages**: Dedicated `/articles/` directory for full-length, TTS-enabled articles with a magazine-style layout, TTS audio player with advanced controls (speed, highlighting, progress), floating reading controls panel (font size, line spacing, dark mode, focus mode, print), text highlighting, bookmarking, and an enhanced sticky Table of Contents sidebar. Includes reading time per section, completion checkmarks, mini-map, scroll position indicator, keyboard navigation, and social share buttons. Also features a "Save Article" button and related articles section.
-   **News & Stories Section**: Dedicated blog section featuring real stories, research updates, and community spotlights. Includes 6 article pages: Mental Health Research News, Recovery Stories, Workplace Wellness, Teen Mental Health Support, Community Support, and Mental Health Wins. All articles feature "New" badges with pulse animation, TTS audio, and full reading controls.
-   **Legal Pages**: Dedicated pages for Terms of Service, Privacy Policy, and Disclaimer, all styled consistently.

## External Dependencies

-   **Supabase**: For user authentication, community forum backend (database, Realtime, Storage).
-   **Swiper.js**: For carousel and slider functionalities.
-   **Font Awesome**: For iconography.
-   **Google Fonts**: For "Poppins", "Montserrat", and "Noto Sans KR" font families.
-   **External Content Providers**: National Institute of Mental Health (NIMH) and Mayo Clinic for credible resource content.