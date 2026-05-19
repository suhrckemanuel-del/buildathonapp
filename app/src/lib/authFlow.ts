import { supabase } from './supabase';

export async function getPostLoginRoute(userId: string) {
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (userError) throw userError;
  if (!userRow) return '/onboarding/username';

  // Any interest profile = onboarding complete
  const { data: profileRow, error: profileError } = await supabase
    .from('interest_profiles')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (profileError) throw profileError;
  return profileRow ? '/(tabs)' : '/onboarding/select-category';
}
