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
            return jsonify({'error': 'API quota exceeded. Please try again later or use browser voice.'}), 429
        return jsonify({'error': f'TTS generation failed: {error_msg}'}), 500

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
        
        api_key, from_email = get_resend_credentials()
        from_email = "MindBalance <noreply@mindbalance.cloud>"
        if api_key:
            try:
                import resend as resend_module
                resend_module.api_key = api_key
                Emails.send({
                    "from": from_email,
                    "to": [email],
                    "subject": "Welcome to MindBalance Newsletter!",
                    "html": f"""
                    <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #3d3a50; font-size: 28px; margin: 0;">MindBalance</h1>
                            <p style="color: #af916d; font-size: 14px; margin-top: 5px;">Your Mental Wellness Companion</p>
                        </div>
                        
                        <div style="background: linear-gradient(135deg, #f8f5f0 0%, #fff 100%); border-radius: 16px; padding: 30px; border: 1px solid #e8e4dc;">
                            <h2 style="color: #3d3a50; font-size: 22px; margin-top: 0;">Welcome to Our Community!</h2>
                            
                            <p style="color: #5a5770; font-size: 16px; line-height: 1.6;">
                                Thank you for subscribing to the MindBalance newsletter! You'll now receive:
                            </p>
                            
                            <ul style="color: #5a5770; font-size: 15px; line-height: 1.8; padding-left: 20px;">
                                <li>Weekly mental wellness tips and strategies</li>
                                <li>New articles and resources</li>
                                <li>Community updates and stories</li>
                                <li>Exclusive content and early access</li>
                            </ul>
                            
                            <p style="color: #5a5770; font-size: 16px; line-height: 1.6;">
                                We're committed to supporting your mental health journey with credible, 
                                compassionate resources.
                            </p>
                            
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://mindbalance.replit.app" 
                                   style="display: inline-block; background: #af916d; color: #fff; padding: 14px 32px; 
                                          border-radius: 30px; text-decoration: none; font-weight: 600; font-size: 15px;">
                                    Visit MindBalance
                                </a>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e8e4dc;">
                            <p style="color: #8a8899; font-size: 13px; margin: 0;">
                                You received this email because you subscribed to MindBalance newsletter.
                            </p>
                            <p style="color: #8a8899; font-size: 13px; margin-top: 10px;">
                                <a href="https://mindbalance.replit.app" style="color: #af916d; text-decoration: none;">
                                    mindbalance.replit.app
                                </a>
                            </p>
                        </div>
                    </div>
                    """
                })
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
