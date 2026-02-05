import os
import json
import random
from openai import OpenAI

AI_INTEGRATIONS_OPENAI_API_KEY = os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY")
AI_INTEGRATIONS_OPENAI_BASE_URL = os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL")

openai = OpenAI(
    api_key=AI_INTEGRATIONS_OPENAI_API_KEY,
    base_url=AI_INTEGRATIONS_OPENAI_BASE_URL
)

FALLBACK_INSIGHTS = [
    {"insight": "Keep tracking your wellness journey - every step counts!", "affirmation": "You are capable of amazing things."},
    {"insight": "Your dedication to self-care makes a real difference.", "affirmation": "Every day is a chance to grow stronger."},
    {"insight": "Small steps lead to big changes in your wellbeing.", "affirmation": "You have the strength to overcome any challenge."},
    {"insight": "Taking time for yourself is never wasted time.", "affirmation": "Your mental health matters deeply."},
    {"insight": "Progress, not perfection, is what truly matters.", "affirmation": "Be proud of how far you have come."},
    {"insight": "Your commitment to wellness inspires positive change.", "affirmation": "You deserve all the happiness in the world."},
    {"insight": "Checking in with yourself is a powerful habit.", "affirmation": "Today is full of new possibilities."},
    {"insight": "Awareness is the first step toward positive growth.", "affirmation": "You are worthy of love and care."}
]

def get_random_fallback():
    return random.choice(FALLBACK_INSIGHTS)

def generate_wellness_insight(mood_data, goals_data, streak_data):
    """
    Generate personalized AI wellness insights based on user's mood history,
    goals progress, and engagement streak.
    """
    
    mood_summary = ""
    if mood_data and len(mood_data) > 0:
        avg_mood = sum(m.get('mood_level', 3) for m in mood_data) / len(mood_data)
        recent_moods = [m.get('mood_level', 3) for m in mood_data[:7]]
        mood_trend = "improving" if len(recent_moods) > 1 and recent_moods[0] > recent_moods[-1] else "stable"
        mood_summary = f"Average mood: {avg_mood:.1f}/5, Recent trend: {mood_trend}, Entries: {len(mood_data)}"
    else:
        mood_summary = "No mood entries yet"
    
    goals_summary = ""
    if goals_data and len(goals_data) > 0:
        total = len(goals_data)
        completed = sum(1 for g in goals_data if g.get('completed'))
        active = total - completed
        goals_summary = f"Total goals: {total}, Completed: {completed}, Active: {active}"
    else:
        goals_summary = "No wellness goals set"
    
    streak_summary = f"Current visit streak: {streak_data.get('current_streak', 0)} days"
    
    prompt = f"""You are a supportive, empathetic wellness companion for a mental health platform called MindBalance.
    
Based on this user's wellness data, provide a brief, encouraging insight (2-3 sentences max).
Focus on positive reinforcement and gentle suggestions. Keep the tone warm, supportive, and non-clinical.

User Data:
- {mood_summary}
- {goals_summary}
- {streak_summary}

Provide:
1. A personalized observation about their wellness journey
2. A short, uplifting affirmation tailored to their data

Format your response as JSON:
{{"insight": "your observation here", "affirmation": "your affirmation here"}}
"""

    try:

        response = openai.chat.completions.create(
            model="gpt-5-nano",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_completion_tokens=300
        )
        
        content = response.choices[0].message.content or "{}"
        result = json.loads(content)
        return {
            "success": True,
            "insight": result.get("insight", "Keep up your wellness journey!"),
            "affirmation": result.get("affirmation", "You are doing great!")
        }
    except Exception as e:
        print(f"AI insight error: {e}")
        fallback = get_random_fallback()
        return {
            "success": False,
            "insight": fallback["insight"],
            "affirmation": fallback["affirmation"]
        }


def generate_mood_analysis(mood_entries):
    """
    Analyze mood patterns and provide helpful insights.
    """
    if not mood_entries or len(mood_entries) < 3:
        return {
            "success": True,
            "analysis": "Log a few more moods to get personalized insights about your emotional patterns.",
            "suggestion": "Try logging your mood at the same time each day for better tracking."
        }
    
    mood_levels = [m.get('mood_level', 3) for m in mood_entries]
    avg = sum(mood_levels) / len(mood_levels)
    
    mood_descriptions = {
        1: "very low",
        2: "low", 
        3: "neutral",
        4: "good",
        5: "great"
    }
    
    mood_counts = {}
    for level in mood_levels:
        mood_counts[level] = mood_counts.get(level, 0) + 1
    
    most_common = max(mood_counts.keys(), key=lambda k: mood_counts[k])
    
    prompt = f"""Analyze this mood pattern data and provide a brief, supportive insight.

Mood data (last {len(mood_levels)} entries):
- Average mood: {avg:.1f}/5
- Most common mood: {mood_descriptions.get(most_common, 'neutral')}
- Mood distribution: {mood_counts}

Provide a brief, empathetic analysis (2 sentences max) and one actionable wellness suggestion.
Format as JSON: {{"analysis": "...", "suggestion": "..."}}
"""

    try:
        response = openai.chat.completions.create(
            model="gpt-5-nano",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_completion_tokens=200
        )
        
        content = response.choices[0].message.content or "{}"
        result = json.loads(content)
        return {
            "success": True,
            "analysis": result.get("analysis", "Your mood patterns show resilience."),
            "suggestion": result.get("suggestion", "Consider a short walk or breathing exercise today.")
        }
    except Exception as e:
        print(f"Mood analysis error: {e}")
        return {
            "success": True,
            "analysis": f"Your average mood is {avg:.1f}/5 with {most_common} being most common.",
            "suggestion": "Consider journaling about what affects your mood."
        }


def generate_goal_suggestion(current_goals, completed_goals):
    """
    Suggest new wellness goals based on user's goal history.
    """
    
    goal_categories = ["mindfulness", "exercise", "sleep", "social", "learning"]
    
    existing_categories = set()
    for g in (current_goals or []):
        cat = g.get('category', '').lower()
        if cat in goal_categories:
            existing_categories.add(cat)
    
    missing_categories = [c for c in goal_categories if c not in existing_categories]
    
    if not missing_categories:
        missing_categories = goal_categories
    
    prompt = f"""Suggest one simple, achievable wellness goal for a mental health platform user.

Current goal categories: {list(existing_categories) if existing_categories else 'None'}
Completed goals: {len(completed_goals or [])}
Suggested category: {missing_categories[0]}

Provide a specific, actionable goal (1 sentence) that's encouraging and achievable.
Format as JSON: {{"goal": "...", "category": "...", "why": "..."}}
"""

    try:
        response = openai.chat.completions.create(
            model="gpt-5-nano",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_completion_tokens=150
        )
        
        content = response.choices[0].message.content or "{}"
        result = json.loads(content)
        return {
            "success": True,
            "goal": result.get("goal", "Take a 10-minute mindfulness break today"),
            "category": result.get("category", missing_categories[0]),
            "why": result.get("why", "Small steps lead to big changes.")
        }
    except Exception as e:
        print(f"Goal suggestion error: {e}")
        suggestions = {
            "mindfulness": "Practice 5 minutes of deep breathing today",
            "exercise": "Take a 15-minute walk outside",
            "sleep": "Set a consistent bedtime for this week",
            "social": "Reach out to a friend or family member",
            "learning": "Read one article about mental wellness"
        }
        category = missing_categories[0] if missing_categories else "mindfulness"
        return {
            "success": True,
            "goal": suggestions.get(category, suggestions["mindfulness"]),
            "category": category,
            "why": "Taking small steps each day builds lasting habits."
        }
