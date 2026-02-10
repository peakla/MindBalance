from http.server import BaseHTTPRequestHandler
import os
import json

ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
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
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({
            'voices': voices,
            'available': bool(ELEVENLABS_API_KEY)
        }).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
