// Supabase-Client für FortbildungMed.de
// Der anon/public Key ist sicher für den Einsatz im Frontend (kein Secret-Key,
// Zugriff auf Daten wird serverseitig über Row Level Security geregelt).

const SUPABASE_URL = 'https://ldszctchldwbrlwrmmxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxkc3pjdGNobGR3YnJsd3JtbXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NTU3NTUsImV4cCI6MjEwMTAzMTc1NX0.fTMDJASwBwQL4_TW-zzrfuQ6ueLbhgfg-34CgCUGRC8';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
