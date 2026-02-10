const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cxjqessxarjayqxvhnhs.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_SERVICE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
    return res.status(500).json({ error: 'Newsletter service is not configured. Please try again later.' });
  }

  const { email, source } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, confirmed')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (existing && existing.confirmed) {
      return res.status(200).json({
        success: true,
        message: 'You are already subscribed to our newsletter!',
        already_subscribed: true
      });
    }

    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert({
        email: email.trim().toLowerCase(),
        confirmed: true,
        source: source || 'unknown',
        subscribed_at: new Date().toISOString()
      }, { onConflict: 'email' });

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Thanks for subscribing! Welcome to our community.'
    });
  } catch (err) {
    console.error('Newsletter error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
