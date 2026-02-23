# ==================== IMPORTS ====================
import os
import time
import uuid
import psycopg2
import requests
from collections import defaultdict
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
from elevenlabs.client import ElevenLabs
from functools import wraps
from resend import Emails
from api.wellness_insights import generate_wellness_insight, generate_mood_analysis, generate_goal_suggestion

# ==================== APP CONFIGURATION ====================
app = Flask(__name__, static_folder='.', static_url_path='')

REPLIT_DEV_DOMAIN = os.environ.get('REPLIT_DEV_DOMAIN', '')
REPLIT_DOMAINS = os.environ.get('REPLIT_DOMAINS', '')

ALLOWED_ORIGINS = [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
]
if REPLIT_DEV_DOMAIN:
    ALLOWED_ORIGINS.append(f'https://{REPLIT_DEV_DOMAIN}')
if REPLIT_DOMAINS:
    for domain in REPLIT_DOMAINS.split(','):
        domain = domain.strip()
        if domain:
            ALLOWED_ORIGINS.append(f'https://{domain}')

# ==================== CORS CONFIGURATION ====================
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://mindbalance.cloud", "https://www.mindbalance.cloud", "https://mindspace.site", "https://www.mindspace.site", "*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')
DATABASE_URL = os.environ.get('DATABASE_URL')

def get_resend_credentials():
    """Get Resend API credentials from Replit connector"""
    hostname = os.environ.get('REPLIT_CONNECTORS_HOSTNAME')
    repl_identity = os.environ.get('REPL_IDENTITY')
    web_repl_renewal = os.environ.get('WEB_REPL_RENEWAL')
    
    if repl_identity:
        x_replit_token = 'repl ' + repl_identity
    elif web_repl_renewal:
        x_replit_token = 'depl ' + web_repl_renewal
    else:
        return None, None
    
    try:
        response = requests.get(
            f'https://{hostname}/api/v2/connection?include_secrets=true&connector_names=resend',
            headers={
                'Accept': 'application/json',
                'X_REPLIT_TOKEN': x_replit_token
            }
        )
        data = response.json()
        connection = data.get('items', [{}])[0]
        settings = connection.get('settings', {})
        return settings.get('api_key'), settings.get('from_email')
    except Exception as e:
        print(f"Error getting Resend credentials: {e}")
        return None, None

def get_db_connection():
    """Get database connection"""
    if not DATABASE_URL:
        return None
    return psycopg2.connect(DATABASE_URL)

# ==================== RATE LIMITING ====================
request_counts = defaultdict(list)
RATE_LIMIT_REQUESTS = 10
RATE_LIMIT_WINDOW = 60

def rate_limit(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_ip = request.remote_addr or 'unknown'
        now = time.time()
        
        request_counts[client_ip] = [
            t for t in request_counts[client_ip] 
            if now - t < RATE_LIMIT_WINDOW
        ]
        
        if len(request_counts[client_ip]) >= RATE_LIMIT_REQUESTS:
            return jsonify({
                'error': 'Rate limit exceeded. Please wait before trying again.'
            }), 429
        
        request_counts[client_ip].append(now)
        return f(*args, **kwargs)
    return decorated_function

def check_referer(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        referer = request.headers.get('Referer', '')
        origin = request.headers.get('Origin', '')
        
        valid = any([
            'localhost' in referer or 'localhost' in origin,
            '127.0.0.1' in referer or '127.0.0.1' in origin,
        ])
        
        if REPLIT_DEV_DOMAIN:
            valid = valid or REPLIT_DEV_DOMAIN in referer or REPLIT_DEV_DOMAIN in origin
        
        if REPLIT_DOMAINS:
            for domain in REPLIT_DOMAINS.split(','):
                domain = domain.strip()
                if domain and (domain in referer or domain in origin):
                    valid = True
                    break
        
        if not referer and not origin:
            valid = True
        
        if 'replit.app' in referer or 'replit.app' in origin:
            valid = True
        if 'replit.dev' in referer or 'replit.dev' in origin:
            valid = True
        if 'mindbalance.cloud' in referer or 'mindbalance.cloud' in origin:
            valid = True
        if 'mindspace.site' in referer or 'mindspace.site' in origin:
            valid = True
        
        if not valid:
            return jsonify({'error': 'Unauthorized request'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

# ==================== VOICE CONFIGURATION ====================
VOICE_MAP = {
    'rachel': 'EXAVITQu4vr4xnSDxMaL',
    'adam': '21m00Tcm4TlvDq8ikWAM',
    'antoni': 'ErXwobaYiN019PkySvjV',
    'arnold': 'VR6AewLTigWG4xSOukaG',
    'bella': 'EXAVITQu4vr4xnSDxMaL',
    'domi': 'AZnzlk1XvdvUeBnXmlld',
    'elli': 'MF3mGyEYCl7XYWbV9V6O',
    'josh': 'TxGEqnHWrfWFTfGW9XjX',
    'sam': 'yoZ06aMxZJJ28mfd3POQ',
}

LANGUAGE_VOICE_MAP = {
    'en': 'rachel',
    'es': 'adam',
    'fr': 'antoni',
    'zh': 'adam',
    'hi': 'adam',
}

# ==================== ROUTES ====================
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/community/')
def serve_community():
    return send_from_directory('community', 'index.html')

@app.route('/resourcelib/')
def serve_resourcelib():
    return send_from_directory('resourcelib', 'index.html')

@app.route('/support/')
def serve_support():
    return send_from_directory('support', 'index.html')

@app.route('/blog/')
def serve_blog():
    if os.path.exists('blog/index.html'):
        return send_from_directory('blog', 'index.html')
    return send_from_directory('.', 'index.html')

@app.route('/auth/')
def serve_auth():
    if os.path.exists('auth/index.html'):
        return send_from_directory('auth', 'index.html')
    return send_from_directory('.', 'index.html')

@app.route('/profile/')
def serve_profile():
    return send_from_directory('profile', 'index.html')

@app.route('/terms/')
def serve_terms():
    return send_from_directory('terms', 'index.html')

@app.route('/privacy/')
def serve_privacy():
    return send_from_directory('privacy', 'index.html')

@app.route('/disclaimer/')
def serve_disclaimer():
    return send_from_directory('disclaimer', 'index.html')

@app.route('/docs/')
def serve_docs():
    return send_from_directory('docs', 'index.html')

@app.route('/docs/pdfs/<path:filename>')
def serve_docs_pdfs(filename):
    return send_from_directory('docs/pdfs', filename)

@app.route('/contact/')
def serve_contact():
    if os.path.exists('contact/index.html'):
        return send_from_directory('contact', 'index.html')
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    clean_path = path.rstrip('/')
    
    if os.path.isdir(clean_path):
        index_path = os.path.join(clean_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory('.', index_path)
    
    if os.path.exists(path):
        return send_from_directory('.', path)
    
    return send_from_directory('.', 'index.html')

@app.route('/api/tts/voices', methods=['GET'])
@check_referer
def get_voices():
    voices = [
        {'id': 'rachel', 'name': 'Rachel (Female, Calm)', 'language': 'en'},
        {'id': 'adam', 'name': 'Adam (Male, Deep)', 'language': 'en'},
        {'id': 'antoni', 'name': 'Antoni (Male, Warm)', 'language': 'en'},
        {'id': 'arnold', 'name': 'Arnold (Male, Crisp)', 'language': 'en'},
        {'id': 'domi', 'name': 'Domi (Female, Strong)', 'language': 'en'},
        {'id': 'elli', 'name': 'Elli (Female, Young)', 'language': 'en'},
        {'id': 'josh', 'name': 'Josh (Male, Warm)', 'language': 'en'},
        {'id': 'sam', 'name': 'Sam (Male, Friendly)', 'language': 'en'},
    ]
    return jsonify({'voices': voices, 'available': bool(ELEVENLABS_API_KEY)})

@app.route('/api/tts/generate', methods=['POST'])
@check_referer
@rate_limit
def generate_tts():
    if not ELEVENLABS_API_KEY:
        return jsonify({'error': 'ElevenLabs API key not configured'}), 500
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    if len(text) > 5000:
        return jsonify({'error': 'Text too long (max 5000 characters)'}), 400
    
    voice_key = data.get('voice', 'rachel')
    language = data.get('language', 'en')
    
    if voice_key not in VOICE_MAP:
        voice_key = LANGUAGE_VOICE_MAP.get(language, 'rachel')
    
    voice_id = VOICE_MAP.get(voice_key, VOICE_MAP['rachel'])
    
    try:
        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        
        audio = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128"
        )
        
        audio_bytes = b''
        for chunk in audio:
            if isinstance(chunk, bytes):
                audio_bytes += chunk
        
        return Response(
            audio_bytes,
            mimetype='audio/mpeg',
            headers={
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=3600'
            }
        )
        
    except Exception as e:
        error_msg = str(e)
        if 'quota' in error_msg.lower() or 'limit' in error_msg.lower():
            return jsonify({'error': 'API quota exceeded. Please try again later or use browser voice.', 'fallback': True}), 429
        if 'payment' in error_msg.lower() or '401' in error_msg or 'unauthorized' in error_msg.lower():
            return jsonify({'error': 'Premium voice service is temporarily unavailable. Please use browser voice instead.', 'fallback': True}), 503
        return jsonify({'error': f'TTS generation failed. Please try browser voice instead.', 'fallback': True}), 500

@app.route('/api/tts/health', methods=['GET'])
@check_referer
def tts_health():
    return jsonify({
        'available': bool(ELEVENLABS_API_KEY),
        'service': 'elevenlabs'
    })

@app.route('/api/newsletter', methods=['POST'])
@app.route('/api/newsletter/subscribe', methods=['POST'])
@check_referer
@rate_limit
def newsletter_subscribe():
    """Handle newsletter subscription"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email', '').strip().lower()
    if not email:
        return jsonify({'error': 'Email address is required'}), 400
    
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return jsonify({'error': 'Please enter a valid email address'}), 400
    
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, confirmed FROM newsletter_subscribers WHERE email = %s", (email,))
        existing = cursor.fetchone()
        
        if existing:
            if existing[1]:
                return jsonify({'message': 'You are already subscribed to our newsletter!', 'already_subscribed': True}), 200
            else:
                pass
        else:
            confirmation_token = str(uuid.uuid4())
            
            cursor.execute(
                """INSERT INTO newsletter_subscribers (email, confirmation_token, confirmed) 
                   VALUES (%s, %s, TRUE) 
                   ON CONFLICT (email) DO UPDATE SET confirmed = TRUE, subscribed_at = NOW()""",
                (email, confirmation_token)
            )
            conn.commit()
        
        api_key = os.environ.get('RESEND_API_KEY')
        if not api_key:
            api_key, _ = get_resend_credentials()
        from_email = "MindBalance <hello@mindbalance.cloud>"
        print(f"[Newsletter] API key found: {bool(api_key)}, from_email: {from_email}")
        if api_key:
            try:
                import resend as resend_module
                resend_module.api_key = api_key
                print(f"[Newsletter] Sending welcome email to {email} from {from_email}")
                result = Emails.send({
                    "from": from_email,
                    "to": [email],
                    "subject": "Welcome to MindBalance Newsletter!",
                    "html": f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Welcome to MindBalance</title>
<style>
  :root {{
    color-scheme: light dark;
    supported-color-schemes: light dark;
  }}
  @media (prefers-color-scheme: dark) {{
    .email-body {{ background-color: #1a1a2e !important; }}
    .email-container {{ background-color: #16213e !important; }}
    .header-section {{ background: linear-gradient(135deg, #2a1f3d 0%, #1a1a2e 50%, #1e2a4a 100%) !important; }}
    .content-card {{ background-color: #1e2a4a !important; border-color: #2a3a5c !important; }}
    .title-text {{ color: #e8e4f0 !important; }}
    .subtitle-text {{ color: #d4a574 !important; }}
    .heading-text {{ color: #e8e4f0 !important; }}
    .body-text {{ color: #b8b4c8 !important; }}
    .list-item {{ color: #b8b4c8 !important; }}
    .check-icon {{ color: #d4a574 !important; }}
    .divider {{ border-color: #2a3a5c !important; }}
    .footer-text {{ color: #6a6a8a !important; }}
    .footer-link {{ color: #d4a574 !important; }}
    .quote-section {{ background-color: #22304a !important; border-color: #d4a574 !important; }}
    .quote-text {{ color: #b8b4c8 !important; }}
    .cta-button {{ background: linear-gradient(135deg, #d4a574 0%, #c49464 100%) !important; }}
  }}
</style>
</head>
<body style="margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
<div class="email-body" style="background-color: #f5f0eb; padding: 0; margin: 0; width: 100%;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f0eb;">
<tr><td style="padding: 30px 15px;">

<table class="email-container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header with gradient -->
  <tr>
    <td class="header-section" style="background: linear-gradient(135deg, #f0e6d8 0%, #f8f5f0 50%, #e8e0f0 100%); padding: 40px 40px 30px; text-align: center;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="text-align: center;">
            <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #af916d 0%, #c4a882 100%); border-radius: 14px; line-height: 56px; margin-bottom: 16px;">
              <span style="font-size: 26px; color: #ffffff; font-weight: 700; font-family: Georgia, serif;">M</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="text-align: center;">
            <h1 class="title-text" style="font-family: Georgia, 'Times New Roman', serif; color: #3d3a50; font-size: 30px; font-weight: 700; margin: 0 0 6px; letter-spacing: -0.5px;">MindBalance</h1>
            <p class="subtitle-text" style="font-family: 'Poppins', Arial, sans-serif; color: #af916d; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 500;">Your Mental Wellness Companion</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Welcome heading -->
  <tr>
    <td style="padding: 36px 40px 0;">
      <h2 class="heading-text" style="font-family: Georgia, 'Times New Roman', serif; color: #3d3a50; font-size: 24px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.3px;">Welcome to Our Community!</h2>
      <div style="width: 50px; height: 3px; background: linear-gradient(90deg, #af916d, #c4a882); border-radius: 2px; margin-bottom: 20px;"></div>
      <p class="body-text" style="font-family: 'Poppins', Arial, sans-serif; color: #5a5770; font-size: 15px; line-height: 1.7; margin: 0;">
        Thank you for joining the MindBalance community! We're glad you're here. As a subscriber, you'll receive:
      </p>
    </td>
  </tr>

  <!-- Benefits list -->
  <tr>
    <td style="padding: 24px 40px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td class="content-card" style="background-color: #faf8f5; border-radius: 14px; padding: 24px 28px; border: 1px solid #ece8e1;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding-bottom: 14px;">
                  <span class="check-icon" style="color: #af916d; font-size: 16px; font-weight: 700;">&#10003;</span>
                  <span class="list-item" style="font-family: 'Poppins', Arial, sans-serif; color: #5a5770; font-size: 14px; margin-left: 10px;">Weekly mental wellness tips and strategies</span>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 14px;">
                  <span class="check-icon" style="color: #af916d; font-size: 16px; font-weight: 700;">&#10003;</span>
                  <span class="list-item" style="font-family: 'Poppins', Arial, sans-serif; color: #5a5770; font-size: 14px; margin-left: 10px;">New articles and curated resources</span>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 14px;">
                  <span class="check-icon" style="color: #af916d; font-size: 16px; font-weight: 700;">&#10003;</span>
                  <span class="list-item" style="font-family: 'Poppins', Arial, sans-serif; color: #5a5770; font-size: 14px; margin-left: 10px;">Community updates and stories</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span class="check-icon" style="color: #af916d; font-size: 16px; font-weight: 700;">&#10003;</span>
                  <span class="list-item" style="font-family: 'Poppins', Arial, sans-serif; color: #5a5770; font-size: 14px; margin-left: 10px;">Exclusive content and early access</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Inspirational quote -->
  <tr>
    <td style="padding: 28px 40px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td class="quote-section" style="background-color: #f8f5f0; border-left: 3px solid #af916d; border-radius: 0 10px 10px 0; padding: 18px 24px;">
            <p class="quote-text" style="font-family: Georgia, 'Times New Roman', serif; color: #6a6680; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">
              "Mental health is not a destination, but a process. It's about how you drive, not where you're going."
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- CTA Button -->
  <tr>
    <td style="padding: 32px 40px 0; text-align: center;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
        <tr>
          <td>
            <a class="cta-button" href="https://mindbalance.cloud"
               style="display: inline-block; background: linear-gradient(135deg, #af916d 0%, #9a7d5a 100%); color: #ffffff; padding: 15px 40px;
                      border-radius: 50px; text-decoration: none; font-family: 'Poppins', Arial, sans-serif; font-weight: 600; font-size: 15px;
                      letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(175, 145, 109, 0.35);">
              Explore MindBalance &#8594;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Divider -->
  <tr>
    <td style="padding: 36px 40px 0;">
      <div class="divider" style="border-top: 1px solid #ece8e1; width: 100%;"></div>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding: 24px 40px 36px; text-align: center;">
      <p class="footer-text" style="font-family: 'Poppins', Arial, sans-serif; color: #9a96a8; font-size: 12px; line-height: 1.6; margin: 0 0 8px;">
        You received this email because you subscribed to the MindBalance newsletter.
      </p>
      <a class="footer-link" href="https://mindbalance.cloud" style="font-family: 'Poppins', Arial, sans-serif; color: #af916d; font-size: 12px; text-decoration: none; font-weight: 500;">
        mindbalance.cloud
      </a>
    </td>
  </tr>

</table>

</td></tr>
</table>
</div>
</body>
</html>"""
                })
                print(f"Welcome email sent successfully: {result}")
            except Exception as e:
                print(f"Error sending welcome email: {e}")
        
        cursor.close()
        return jsonify({
            'success': True,
            'message': 'Thank you for subscribing! Check your inbox for a welcome email.'
        }), 200
        
    except psycopg2.IntegrityError:
        if conn:
            conn.rollback()
        return jsonify({'message': 'You are already subscribed!', 'already_subscribed': True}), 200
    except Exception as e:
        print(f"Newsletter subscription error: {e}")
        if conn:
            conn.rollback()
        return jsonify({'error': 'Something went wrong. Please try again.'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/wellness/insights', methods=['POST', 'OPTIONS'])
def wellness_insights_endpoint():
    """Generate AI-powered wellness insights"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json() or {}
        mood_data = data.get('mood_data', [])
        goals_data = data.get('goals_data', [])
        streak_data = data.get('streak_data', {})
        
        result = generate_wellness_insight(mood_data, goals_data, streak_data)
        return jsonify(result)
    except Exception as e:
        print(f"Wellness insights error: {e}")
        return jsonify({
            'success': False,
            'insight': 'Keep up your wellness journey!',
            'affirmation': 'You are doing great!'
        })


@app.route('/api/wellness/mood-analysis', methods=['POST', 'OPTIONS'])
def mood_analysis_endpoint():
    """Analyze mood patterns"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json() or {}
        mood_entries = data.get('mood_entries', [])
        
        result = generate_mood_analysis(mood_entries)
        return jsonify(result)
    except Exception as e:
        print(f"Mood analysis error: {e}")
        return jsonify({
            'success': False,
            'analysis': 'Keep tracking your moods for insights.',
            'suggestion': 'Try logging your mood daily.'
        })


@app.route('/api/wellness/goal-suggestion', methods=['POST', 'OPTIONS'])
def goal_suggestion_endpoint():
    """Suggest new wellness goals"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json() or {}
        current_goals = data.get('current_goals', [])
        completed_goals = data.get('completed_goals', [])
        
        result = generate_goal_suggestion(current_goals, completed_goals)
        return jsonify(result)
    except Exception as e:
        print(f"Goal suggestion error: {e}")
        return jsonify({
            'success': False,
            'goal': 'Take a 10-minute mindfulness break today',
            'category': 'mindfulness',
            'why': 'Small steps lead to big changes.'
        })


# ==================== SERVER STARTUP ====================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
