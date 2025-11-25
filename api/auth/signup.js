import { createClient } from '@supabase/supabase-js';

// Use SERVICE_ROLE key for admin operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, profile } = req.body;

    console.log('📝 Signup request:', { email, hasPassword: !!password, profile });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!profile?.firstname || !profile?.lastname) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    // Create user with admin API (service role) - stores in user_metadata
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true, // Auto-confirm email (no verification needed)
      user_metadata: {
        firstname: profile.firstname.trim(),
        lastname: profile.lastname.trim(),
      }
    });

    if (authError) {
      console.error('❌ Signup error:', authError);
      
      // Handle specific errors
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