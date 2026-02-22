# MindBalance & MindSpace — Compressed Technical Guide

## Overview
MindBalance (www.mindbalance.cloud) and MindSpace (www.mindspace.site) are twin static websites providing curated mental health resources. They share a single codebase and Supabase backend, differing primarily in color scheme and specific content: MindBalance uses a gold/brown palette and includes a Reference Page, while MindSpace uses a light blue palette and omits the Reference Page. Both platforms offer 13 wellness articles with text-to-speech functionality, a wellness check-in, AI personalization, a Community Hub, crisis support, multi-language support (7 languages: English, Spanish, French, Chinese, Hindi, Korean, German), dark mode, and extensive accessibility features. The project aims to provide accessible and credible mental health support, leveraging technology for personalization and community engagement.

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
- **Translation System**: Supports seven languages (English, Spanish, French, Chinese, Hindi, Korean, German) using `data-translate` attributes for dynamic content translation. Translation files are in `i18n/` directory (en.json, es.json, fr.json, zh.json, hi.json, ko.json, de.json).
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