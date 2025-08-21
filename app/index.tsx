import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from './contexts/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import "../global.css";
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('./(app)/(tabs)');
      } else {
        router.replace('./(auth)/landing');
      }
    }
  }, [isAuthenticated, isLoading]);

  return <LoadingScreen />;
}