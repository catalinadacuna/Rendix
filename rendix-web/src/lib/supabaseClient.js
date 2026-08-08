import { createClient } from '@supabase/supabase-js';

// Reemplaza los valores con los datos de tu proyecto de Supabase
const supabaseUrl = 'https://lkfxjgragipzegvjlrnr.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZnhqZ3JhZ2lwemVndmpscm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MDY4NTUsImV4cCI6MjA5OTk4Mjg1NX0.NTtRNdgtIFGr08zfnggUgNnkcAKRT4orl_o_UQ_0twI';

export const supabase = createClient(supabaseUrl, supabaseKey);