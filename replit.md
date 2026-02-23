# MindBalance & MindSpace — Compressed Technical Guide

## Overview
MindBalance (www.mindbalance.cloud) and MindSpace (www.mindspace.site) are twin static websites providing curated mental health resources. They share a single codebase and Supabase backend, differing primarily in color scheme and specific content: MindBalance uses a gold/brown palette and includes a Reference Page, while MindSpace uses a light blue palette and omits the Reference Page. Both platforms offer 13 wellness articles with text-to-speech functionality, a wellness check-in, AI personalization, a Community Hub, crisis support, multi-language support (8 languages: English, Spanish, French, Chinese, Hindi, Korean, German, Greek), dark mode, and extensive accessibility features. The project aims to provide accessible and credible mental health support, leveraging technology for personalization and community engagement.

## Competition: TSA Webmaster (High School)

### Rubric Review & Rule Compliance Status

**Go/No Go Requirements (must pass or entry is NOT evaluated):**
- [x] Website URL functional on desktop and mobile devices
- [x] Design brief solution with no copyright or plagiarism issues
- [x] Student Copyright Checklist is present (PDF linked on Reference Page via Google Drive)

**Rule Compliance Checklist:**
- [x] **Rule A** — Site accessible 24/7 via Vercel hosting at mindbalance.cloud / mindspace.site
- [x] **Rule B** — Web pages display the chapter's solution to the event theme
- [x] **Rule C** — URL points to main page, no access grants required
- [x] **Rule E** — Minimum 3 pages (we have 11 pages); sources page present (Reference Page)
- [x] **Rule E.1** — Sources of information listed on Reference Page (Content Sources section)
- [x] **Rule E.3** — Copyrighted material documented (Media & Text Citations PDF linked)
- [x] **Rule E.4** — Student Copyright Checklist (PDF) linked on Reference Page via Google Drive
- [x] **Rule E.5** — Plan of Work log (PDF) linked on Reference Page via Google Drive
- [x] **Rule F** — Compatible with Edge, Firefox, Chrome on desktop and mobile (viewport meta, responsive CSS)
- [x] **Rule G** — Uses HTML5 and modern web-based applications
- [x] **Rule H** — Originality statement added to Reference Page confirming no pre-built templates/themes used

**Potential Concern — Rule I:**
- Rule I states: "Template engine websites, tools, and sites that generate HTML from text, markdown, or script files, such as Webs, Wix, Weebly, GitHub, Jekyll, and Replit, are NOT permitted."
- **Our position**: Replit was used only as a code editor/development environment. The website is custom-built HTML/CSS/JS hosted on Vercel. No templates, generators, or site builders were used.
- **Interview prep**: Be ready to explain: "We used Replit only as our code editor during development. Our website is fully custom-built HTML, CSS, and JavaScript, hosted on Vercel — we did not use any pre-built templates or site generators."

### Rubric Scoring Breakdown (180 points total)

**Website Section (130 points):**
| Criteria | Weight | Notes |
|----------|--------|-------|
| Theme (X2) | 20 pts | Annual theme must be clearly addressed and reflected in supporting pages |
| Challenge (X3) | 30 pts | Design brief solution must be well-presented, well-researched, thorough |
| Content (X2) | 20 pts | Content must align with website purpose and add effectiveness |
| Layout & Navigation (X2) | 20 pts | User-friendly layout, intuitive navigation, efficient access to information |
| Graphics & Color Scheme (X2) | 20 pts | High-quality graphics, engaging interactive elements, attractive color scheme |
| Function & Compatibility (X1) | 10 pts | No broken links/images, renders on major browsers, usable on mobile |
| Spelling & Grammar (X1) | 10 pts | Few if any spelling and grammatical errors |

**Semifinal Interview (50 points):**
| Criteria | Weight | Notes |
|----------|--------|-------|
| Organization (X1) | 10 pts | Interview should be organized, logical, easy to follow |
| Knowledge (X1) | 10 pts | Team demonstrates thorough understanding of project and design procedure |
| Articulation (X1) | 10 pts | Clear, concise communication; leadership/21st century skills evident |
| Delivery (X1) | 10 pts | Well-spoken, good posture/gestures/eye contact |
| Engagement & Participation (X1) | 10 pts | All members contribute; conversation-style, not just Q&A |

**Rules violation penalty**: 20% deduction of total possible points for the affected section.

### Interview Preparation Notes
- Up to 5 team representatives can present
- Interview is 5-10 minutes
- TSA competition attire required
- Key talking points:
  1. Custom-built from scratch — no frameworks, templates, or site builders
  2. Hosted on Vercel (not Replit) — Replit was development environment only
  3. Accessibility-first design with 8+ accessibility features
  4. 8-language multilingual support
  5. Real API integrations (Supabase, ElevenLabs, OpenAI, Resend)
  6. Community features with real-time updates
  7. Evidence-based mental health content from authoritative sources (NIMH, Mayo Clinic, SAMHSA)

### Competition Documents on Reference Page
- Work Log (PDF) — Google Drive link
- Copyright Checklist (PDF) — Google Drive link
- Media & Text Citations (PDF) — Google Drive link
- Credits & Attribution (PDF) — Google Drive link
- Originality Statement — displayed directly on page

## User Preferences
- Preferred communication style: Simple, everyday language
- Design preference: NO glassmorphism (no backdrop-blur effects). Use solid, clean card designs with subtle shadows and borders instead

## System Architecture

### UI/UX Decisions
The design emphasizes clean, solid card designs with subtle shadows and borders, avoiding glassmorphism. Theming is managed via CSS custom properties on `:root`, enabling dynamic switching between light and dark modes, and various accessibility preferences. A critical Z-index hierarchy is maintained for UI elements like preloaders, modals, and navigation.

### Technical Implementations
The application uses a Flask backend (`server.py`) to serve static files and provide API endpoints. Client-side logic is handled by JavaScript modules, separated by functionality (e.g., authentication, settings, translations, resource filtering, TTS player, analytics, community features).

### Feature Specifications
- **Authentication**: Uses Supabase for user authentication, managing sessions and broadcasting auth state changes.
- **Settings & Accessibility**: Comprehensive accessibility features including dark mode, high contrast, colorblind modes, ADHD mode, dyslexia font, reduced motion, and adjustable font sizes. These settings are persisted in local storage and applied as `data-*` attributes on the `<html>` element.
- **Translation System**: Supports eight languages (English, Spanish, French, Chinese, Hindi, Korean, German, Greek) using `data-translate` attributes for dynamic content translation. Translation files are in `i18n/` directory (en.json, es.json, fr.json, zh.json, hi.json, ko.json, de.json, gr.json).
- **Resource Library**: Features a filterable library of resources with search, category, provider, and tag filtering, supporting URL-based pre-selection.
- **TTS Article Player**: Provides text-to-speech functionality for articles, with an option to use ElevenLabs API or a browser-based fallback. Includes features like highlighting, auto-scroll, sleep timer, notes, bookmarks, and a sticky table of contents. Critical production routing ensures TTS API calls are directed to an always-on Replit server.
- **Analytics & Achievements**: Tracks user activity (page views, article reads, mood entries, community interactions) and awards 28 unique achievements based on engagement. Also tracks reading progress and daily streaks.
- **Wellness Check-in**: Allows users to log their mood, updating streaks and providing affirmations and suggestions with visual feedback.
- **Community Hub**: A forum-like feature enabling post creation, liking, commenting, and @mentions. Includes profanity filtering and moderation tools. Supports real-time updates via Supabase Realtime.
- **Notifications**: An inbox system for user notifications (likes, comments, mentions, achievements) with real-time updates and badge counts.

### System Design Choices
The architecture uses a split deployment: static assets are served by Vercel, while dynamic API services (TTS, newsletter, AI) are hosted on an always-on Replit VM. CORS and rate limiting are enforced on API endpoints. The system prioritizes accessibility, ensuring settings are available to all users regardless of authentication status. A dual key system for language settings in `localStorage` is maintained for backward compatibility.

## External Dependencies
- **Supabase**: Backend-as-a-Service for authentication, database (PostgreSQL), and real-time features.
- **ElevenLabs API**: For high-quality text-to-speech generation.
- **OpenAI (via Replit AI Integrations)**: Powers AI wellness insights, mood analysis, and goal suggestions.
- **Resend**: Used for sending newsletter welcome emails.
- **Vercel**: Static site hosting for frontend deployment.
- **PostgreSQL**: Used for newsletter subscriber management (separate from Supabase for this specific function).

## Vercel Deployment Project IDs
- **MindBalance** (mindbalance.cloud): `prj_hbARldfI796V96wykjvsO1yYOiuo`
- **MindSpace** (mindspace.site): `prj_LqQQ9Euz6u3ThZxBjrN5N6cAw4TR`
