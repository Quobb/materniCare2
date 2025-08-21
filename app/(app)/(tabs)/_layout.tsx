import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TabsLayout() {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} // adjust so tab bar isn’t overlapped
    >
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <Tabs
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap;

              switch (route.name) {
                case 'index':
                  iconName = focused ? 'home' : 'home-outline';
                  break;
                case 'appointments':
                  iconName = focused ? 'calendar' : 'calendar-outline';
                  break;
                case 'forum':
                  iconName = focused ? 'people' : 'people-outline';
                  break;
                case 'health-tips':
                  iconName = focused ? 'fitness' : 'fitness-outline';
                  break;
                case 'kick-counter':
                  iconName = focused ? 'heart' : 'heart-outline';
                  break;
                case 'profile':
                  iconName = focused ? 'person' : 'person-outline';
                  break;
                default:
                  iconName = 'home-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#8B5CF6',
            tabBarInactiveTintColor: '#9CA3AF',
            tabBarStyle: {
              backgroundColor: 'white',
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              height: 60,
              paddingBottom: 10,
              paddingTop: 10,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '500',
              marginTop: 4,
            },
            headerShown: false,
          })}
        >
          <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home' }} />
          <Tabs.Screen name="appointments" options={{ title: 'Appointments', tabBarLabel: 'Appointments' }} />
          <Tabs.Screen name="forum" options={{ title: 'Forum', tabBarLabel: 'Forum' }} />
          <Tabs.Screen name="health-tips" options={{ title: 'Health Tips', tabBarLabel: 'Tips' }} />
          <Tabs.Screen name="kick-counter" options={{ title: 'Kick Counter', tabBarLabel: 'Kicks' }} />
          <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
        </Tabs>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
