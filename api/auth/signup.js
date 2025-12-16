import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const origin = req.headers.origin;

  // CORS headers - Allow Capacitor, Vercel, and localhost
  const allowedOrigins = [
    'capacitor://localhost',
    'http://localhost',
    'http://localhost:5173',
    'http://localhost:3000',
    'https://hemasense.vercel.app'
  ];

  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    origin.includes('vercel.app') ||
    origin.startsWith('capacitor://')
  );

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, profile } = req.body;

    console.log('📝 Signup request:', { email, hasPassword: !!password, profile, origin });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!profile?.firstname || !profile?.lastname) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        firstname: profile.firstname.trim(),
        lastname: profile.lastname.trim(),
      }
    });

    if (authError) {
      console.error('❌ Signup error:', authError);

      if (authError.message.includes('already registered')) {
        return res.status(400).json({ error: 'This email is already registered' });
      }

      return res.status(400).json({ error: authError.message });
    }

    console.log('✅ User created successfully:', authData.user.id);

    return res.status(200).json({
      message: 'User created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    });

  } catch (err) {
    console.error('❌ Signup handler error:', err);
    return res.status(500).json({
      error: err?.message || 'Signup failed. Please try again.'
    });
  }
}