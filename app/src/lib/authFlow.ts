import { supabase } from './supabase';

export async function getPostLoginRoute(userId: string) {
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (userError) throw userError;
  if (!userRow) return '/onboarding/username';

  const { data: filmRow, error: filmError } = await supabase
    .from('interest_profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('category', 'films')
    .maybeSingle();

  if (filmError) throw filmError;
  return filmRow ? '/(tabs)' : '/onboarding/film-profile';
}
