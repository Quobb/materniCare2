import { Drawer } from 'expo-router/drawer';
import { useAuth } from './../contexts/AuthContext';
import { useEffect } from 'react';
import { router } from 'expo-router';
import CustomHeader from './../components/CustomHeader';
import CustomDrawerContent from './../components/CustomDrawerContent';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Redirect to auth if not authenticated
    if (!isAuthenticated && !isLoading) {
      router.replace('./(auth)/landing');
    }
  }, [isAuthenticated, isLoading]);

  // Don't render app screens if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <PaperProvider >
        <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={({ navigation, route }) => ({
            headerShown: true,
            header: ({ options }) => (
            <CustomHeader 
                title={options.title || getScreenTitle(route.name)} 
                navigation={navigation} 
            />
            ),
            drawerType: 'front',
            drawerStyle: {
            width: 300,
            backgroundColor: 'transparent',
            },
            overlayColor: 'rgba(0, 0, 0, 0.5)',
        })}
        >
        <Drawer.Screen 
            name="(tabs)" 
            options={{ 
            title: 'Dashboard',
            drawerLabel: 'Home'
            }} 
        />
        <Drawer.Screen 
            name="emergency" 
            options={{ 
            title: 'Emergency Center',
            drawerLabel: 'Emergency'
            }}
        />
        <Drawer.Screen 
            name="wearables" 
            options={{ 
            title: 'Wearables',
            drawerLabel: 'Wearables'
            }}
        />
        <Drawer.Screen 
            name="kick-history" 
            options={{ 
            title: 'Kick History',
            drawerLabel: 'Kick History'
            }}
        />
        <Drawer.Screen 
            name="settings" 
            options={{ 
            title: 'Settings',
            drawerLabel: 'Settings'
            }}
        />
        <Drawer.Screen 
            name="help" 
            options={{ 
            title: 'Help & Support',
            drawerLabel: 'Help'
            }}
        />
        <Drawer.Screen 
            name="chat" 
            options={{ 
            title: 'Chat',
            drawerLabel: 'Chat'
            }}
        />
        <Drawer.Screen
            name="trimester-calculator"
            options={{ 
            title: 'Trimester Calculator',
            drawerLabel: 'Trimester Calculator'
            }}
        />
        </Drawer>
    </PaperProvider>
  );
}

// Helper function to get screen titles
const getScreenTitle = (routeName: string) => {
  const titles: Record<string, string> = {
    '../(app)/(tabs)/index': 'Dashboard',
    '../(app)/emergency': 'Emergency Center',
    '../(app)/wearables': 'Wearables',
    '../(app)/kick-history': 'Kick History',
    '../(app)/settings': 'Settings',
    '../(app)/help': 'Help & Support',
    '../(app)/chat': 'Chat',
    '../(app)/trimester-calculator': 'Trimester Calculator'
  };
  return titles[routeName] || 'MamaCare';
};