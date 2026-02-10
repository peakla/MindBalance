from http.server import BaseHTTPRequestHandler
import os
import json

ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')

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

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if not ELEVENLABS_API_KEY:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'ElevenLabs API key not configured'}).encode())
            return

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body)
        except Exception:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Invalid JSON'}).encode())
            return

        text = data.get('text', '').strip()
        if not text:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'No text provided'}).encode())
            return

        if len(text) > 5000:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Text too long (max 5000 characters)'}).encode())
            return

        voice_key = data.get('voice', 'rachel')
        language = data.get('language', 'en')

        if voice_key not in VOICE_MAP:
            voice_key = LANGUAGE_VOICE_MAP.get(language, 'rachel')

        voice_id = VOICE_MAP.get(voice_key, VOICE_MAP['rachel'])

        try:
            from elevenlabs.client import ElevenLabs
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

            self.send_response(200)
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'public, max-age=3600')
            self.end_headers()
            self.wfile.write(audio_bytes)

        except Exception as e:
            error_msg = str(e)
            status = 429 if ('quota' in error_msg.lower() or 'limit' in error_msg.lower()) else 500
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            err_text = 'API quota exceeded. Please try again later or use browser voice.' if status == 429 else f'TTS generation failed: {error_msg}'
            self.wfile.write(json.dumps({'error': err_text}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
