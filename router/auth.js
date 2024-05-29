const express = require('express');
const router = express.Router()
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();


const supabaseUrl = process.env.SupabaseURl;
const supabaseKey = process.env.SupabaseKEY;
const supabase = createClient(supabaseUrl, supabaseKey);


router.post('/signup', async (req, res) => {
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

 router.post('/login', async (req, res) => {
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

module.exports = router;