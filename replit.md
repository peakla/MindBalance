# MindBalance

## Overview
MindBalance is a static website platform offering curated, credible information and resources on mental health. It features a resource library, blog content, and user authentication for personalized features. The project aims to be an accessible digital hub for mental wellness, sourcing information from authoritative providers. It supports multiple languages and is designed with a strong focus on accessibility and user experience.

## User Preferences
Preferred communication style: Simple, everyday language.
Design preference: NO glassmorphism (no backdrop-blur effects). Use solid, clean card designs with subtle shadows and borders instead.

## System Architecture

### Core Design
MindBalance is a static website built with HTML, CSS, and JavaScript, employing a component-based styling approach focused on accessibility and user experience.

### Frontend
-   **Structure & Styling**: Static HTML pages with custom CSS, a robust custom properties system for theming, and Poppins font family.
-   **Interactivity**: Vanilla JavaScript for DOM manipulation and user preference management.
-   **Animation System**: Comprehensive shared animation library for scroll-triggered animations, staggered reveals, hover effects, and continuous animations, with full dark mode support and `prefers-reduced-motion` respect.
-   **Accessibility**: A settings panel with 7 options (Dark Mode, Font Size, High Contrast, Colorblind modes, Focus Mode, Dyslexia Font, Reduced Motion) with preferences persisted via localStorage. Features an enhanced settings modal with onboarding, tabbed navigation, theme presets, before/after comparisons, and an accessibility score.
-   **User Accent Color System**: Theme-aware accent color picker offering 8 color options, applied via CSS custom properties, persisting independently of the theme, and affecting all interactive elements.
-   **Responsiveness**: Full responsive design with orientation lock messages and safe area support, including a comprehensive responsive framework for fluid typography, consistent spacing, and utility classes.
-   **Multilingual Support**: Supports 6 languages using `data-translate` attributes and JSON-based translation files, with preference persistence via localStorage.

### Backend/Data
-   **Authentication**: Supabase for email/password authentication and user sessions.
-   **Community Hub**: Live forum with posts, comments, and likes stored in Supabase, featuring real-time updates and moderation.
-   **Data Storage**: Resource library data stored in static JSON files.
-   **Resource Suggestions**: User-submitted suggestions stored in a Supabase table for review.

### Key Features
-   **Homepage Enhancements**: Includes an inspirational quote banner, crisis support section, and an enhanced wellness check-in with mood selection, daily tips, and streak tracking.
-   **Resource Library**: Interactive directory with featured resources, non-profit organizations, community resources, search/filtering, and share functionalities.
-   **Find Help**: Dedicated page for local mental health services, crisis resources, and national non-profits.
-   **Support Page**: Provides crisis support, helplines, self-help tools, an appointment scheduler, and a modern FAQ section.
-   **Navigation**: Dynamic navbar with crisis button, search bar, dropdowns, and mobile hamburger menu.
-   **User Profile Page**: Instagram-style profile with cover/avatar uploads, editable display name/bio, social links, unified stats, and multiple tabs (Activity, Liked Posts, Saved Articles, Achievements, Wellness, Settings). Features a mood tracker, wellness goals, reading streak, and privacy controls. Includes a first-time onboarding modal.
-   **Immersive Profile Experience**: Cinematic, full-page profile with day/night cycles, personalized greetings, parallax backgrounds, and scroll-triggered animations. Incorporates "People You May Know" and AI-powered wellness insights.
-   **Enhanced Wellness Tab**: Comprehensive visual overhaul for mood tracking, wellness goals, and reading streaks within the profile.
-   **Analytics & Tracking System**: Comprehensive user activity tracking via `analytics.js` and `auth.js`, including page views, article reads, daily visit logging, reading streak tracking, and an expanded achievement system with 28 badges. Data is stored across four Supabase tables.
-   **Enhanced Footer**: Comprehensive modern footer with animated wave separators, trust badges, newsletter signup, recent blog posts preview, collapsible navigation for mobile, and synchronized theme/language controls.
-   **Community Hub Enhancements**: Features popular discussions sidebar, clickable usernames, @mentions system, and an inbox/notifications modal.
-   **Article Pages**: Dedicated directory for full-length, TTS-enabled articles with a magazine-style layout, advanced TTS player controls, floating reading controls, text highlighting, bookmarking, and an enhanced sticky Table of Contents.
-   **News & Stories Section**: Dedicated blog section with real stories, research updates, and community spotlights, all featuring TTS audio and reading controls.
-   **Legal Pages**: Styled pages for Terms of Service, Privacy Policy, and Disclaimer.

## External Dependencies
-   **Supabase**: User authentication, community forum backend (database, Realtime, Storage).
-   **Swiper.js**: Carousel and slider functionalities.
-   **Font Awesome**: Iconography.
-   **Google Fonts**: "Poppins", "Montserrat", "Noto Sans KR" font families.
-   **External Content Providers**: National Institute of Mental Health (NIMH) and Mayo Clinic for credible resource content.
-   **OpenAI (via Replit AI Integrations)**: AI-powered wellness insights, mood analysis, and goal suggestions.
-   **ElevenLabs**: High-quality text-to-speech.