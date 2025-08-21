import { Stack } from 'expo-router';
import { useAuth } from './../contexts/AuthContext';
import { useEffect } from 'react';
import { router } from 'expo-router';
import "../../global.css";

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Redirect to main app if already authenticated
    if (isAuthenticated && !isLoading) {
      router.replace('./(app)/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  // Don't render auth screens if authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="landing" />
      <Stack.Screen name="intro" />
      <Stack.Screen name="discover" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="signin" />
      <Stack.Screen name="phone-signin" />
      <Stack.Screen name="otp-verification" />
      <Stack.Screen name="pregnancy-profile" />
      <Stack.Screen name="bio-data" />
      <Stack.Screen name="signup-profile" />
    </Stack>
  );
}