const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Initialize Supabase client
const supabaseUrl = process.env.SupabaseURl;
const supabaseKey = process.env.SupabaseKEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Apply rate limiting to the sign-up and login endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Utility function for exponential backoff
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithExponentialBackoff = async (fn, retries = 5, delay = 500) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || !error.message.includes('Email rate limit exceeded')) {
      throw error;
    }
    console.log(`Retrying in ${delay} ms...`);
    await sleep(delay);
    return retryWithExponentialBackoff(fn, retries - 1, delay * 2);
  }
};

// Sign up endpoint
app.post('/signup', authLimiter, async (req, res) => {
   const { email, password, firstName, lastName } = req.body;
 
   try {
     const { data, error } = await supabase.auth.signUp({
       email,
       password,
       options: {
         data: {
           first_name: firstName,
           last_name: lastName,
         },
       },
     });
 
     if (error) {
       return res.status(400).json({ error: error.message });
     }
 
 
     res.status(200).json({ user: data.user });
   } catch (error) {
     res.status(500).json({ error: error.message });
   }
 });

// Login endpoint
app.post('/login', authLimiter, async (req, res) => {
   const { email, password } = req.body;
 
   try {
     const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
       email,
       password,
     });
 
     if (authError) {
       return res.status(400).json({ error: authError.message });
     }
 
     // Fetch user profile
     const { data: profileData, error: profileError } = await supabase
       .from('profiles')
       .select('first_name, last_name, email')
       .eq('id', authData.user.id)
       .single();
 
     if (profileError) {
       return res.status(400).json({ error: profileError.message });
     }
 
     res.status(200).json({ user: authData.user, profile: profileData });
   } catch (error) {
     res.status(500).json({ error: error.message });
   }
 });

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
