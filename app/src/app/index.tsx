import { Redirect } from 'expo-router';

// Auth bypassed for testing — goes straight to the app
export default function Index() {
  return <Redirect href="/(tabs)/" />;
}
