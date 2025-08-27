import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image, 
  SafeAreaView,
  Alert 
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../utils/userDataManager';
import { clearUserData } from '../utils/userDataManager';

const CustomDrawerContent = ({ navigation }) => {
  const { logout } = useAuth();
  const { userProfile, loading, error, refreshProfile } = useUserProfile();

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              // Clear all stored data using the enhanced function
              await clearUserData();
              
              // Call logout function from context
              await logout();
              
              console.log('✅ User logged out successfully');
              
              // Navigate to auth
              router.replace('/(auth)/landing');
            } catch (error) {
              console.error('❌ Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const handleRefreshProfile = async () => {
    try {
      await refreshProfile(true);
      console.log('✅ Profile refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing profile:', error);
    }
  };

  const handleNavigation = (screenName) => {
    if (navigation) {
      // Close the drawer first
      navigation.closeDrawer();
      
      // Navigate using the drawer navigation
      navigation.navigate(screenName);
    } else {
      // Fallback to router.push with absolute paths
      router.push(`/(app)/${screenName}`);
    }
  };

  const drawerItems = [
    {
      label: 'Dashboard',
      icon: 'home-outline',
      onPress: () => handleNavigation('(tabs)'),
      screenName: '(tabs)'
    },
    {
      label: 'Emergency',
      icon: 'alert-circle-outline',
      onPress: () => handleNavigation('emergency'),
      screenName: 'emergency'
    },
    {
      label: 'Wearables',
      icon: 'watch-outline',
      onPress: () => handleNavigation('wearables'),
      screenName: 'wearables'
    },
    {
      label: 'Kick History',
      icon: 'analytics-outline',
      onPress: () => handleNavigation('kick-history'),
      screenName: 'kick-history'
    },
    {
      label: 'Trimester Calculator',
      icon: 'calculator-outline',
      onPress: () => handleNavigation('trimester-calculator'),
      screenName: 'trimester-calculator'
    },
    {
      label: 'Chat',
      icon: 'chatbubble-outline',
      onPress: () => handleNavigation('chat'),
      screenName: 'chat'
    }
  ];

  const settingsItems = [
    {
      label: 'Settings',
      icon: 'settings-outline',
      onPress: () => handleNavigation('settings'),
      screenName: 'settings'
    },
    {
      label: 'Help & Support',
      icon: 'help-circle-outline',
      onPress: () => handleNavigation('help'),
      screenName: 'help'
    }
  ];

  // Special handling for Forum (if it's part of tabs)
  const handleForumNavigation = () => {
    if (navigation) {
      navigation.closeDrawer();
      navigation.navigate('(tabs)', { screen: 'forum' });
    } else {
      router.push('/(app)/(tabs)/forum');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* User Profile Header Section */}
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED']}
        className="justify-end p-4"
        style={{ height: 180 }}
      >
        <View className="flex-row items-center">
          {/* Profile Avatar */}
          {loading ? (
            <View className="items-center justify-center w-16 h-16 bg-white rounded-full bg-opacity-20">
              <ActivityIndicator size="small" color="white" />
            </View>
          ) : userProfile.profileImage ? (
            <Image
              source={{ uri: userProfile.profileImage }}
              className="w-16 h-16 border-2 border-white rounded-full"
              onError={() => console.log('Failed to load drawer profile image')}
            />
          ) : (
            <View className="items-center justify-center w-16 h-16 bg-white rounded-full">
              <Icon name="person" size={32} color="#8B5CF6" />
            </View>
          )}
          
          {/* User Info */}
          <View className="flex-1 ml-4">
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 text-xl font-bold text-white" numberOfLines={1}>
                {loading ? 'Loading...' : (userProfile.name || 'Welcome User')}
              </Text>
              {error && (
                <TouchableOpacity 
                  onPress={handleRefreshProfile} 
                  className="p-1 ml-2 bg-white rounded-full bg-opacity-20"
                >
                  <Icon name="refresh-outline" size={16} color="white" />
                </TouchableOpacity>
              )}
            </View>
            
            {!loading && userProfile.email && (
              <Text className="mt-1 text-sm text-white text-opacity-90" numberOfLines={1}>
                {userProfile.email}
              </Text>
            )}
            
            {!loading && userProfile.phone && (
              <Text className="mt-1 text-xs text-white text-opacity-80" numberOfLines={1}>
                {userProfile.phone}
              </Text>
            )}
            
            {!loading && userProfile.role && userProfile.role !== 'user' && (
              <View className="self-start px-2 py-1 mt-2 bg-white rounded-full bg-opacity-20">
                <Text className="text-xs font-bold text-white">
                  {userProfile.role.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
      
      {/* Navigation Items */}
      <View className="flex-1 p-4">
        {/* Main Navigation Section */}
        <View className="flex-1">
          {drawerItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              className="flex-row items-center px-3 py-4 mb-1 rounded-xl active:bg-gray-100"
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View className="items-center justify-center w-10 h-10 mr-3 bg-gray-100 rounded-full">
                <Icon name={item.icon} size={20} color="#374151" />
              </View>
              <Text className="flex-1 text-base font-medium text-gray-800">
                {item.label}
              </Text>
              <Icon name="chevron-forward-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
          
          {/* Special Forum Item (if it's part of tabs) */}
          <TouchableOpacity
            className="flex-row items-center px-3 py-4 mb-1 rounded-xl active:bg-gray-100"
            onPress={handleForumNavigation}
            activeOpacity={0.7}
          >
            <View className="items-center justify-center w-10 h-10 mr-3 bg-gray-100 rounded-full">
              <Icon name="people-outline" size={20} color="#374151" />
            </View>
            <Text className="flex-1 text-base font-medium text-gray-800">
              Forum
            </Text>
            <Icon name="chevron-forward-outline" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        
        {/* Settings Section */}
        <View className="pt-4 border-t border-gray-200">
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              className="flex-row items-center px-3 py-4 mb-1 rounded-xl active:bg-gray-100"
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View className="items-center justify-center w-10 h-10 mr-3 bg-gray-100 rounded-full">
                <Icon name={item.icon} size={20} color="#374151" />
              </View>
              <Text className="flex-1 text-base font-medium text-gray-800">
                {item.label}
              </Text>
              <Icon name="chevron-forward-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
          
          {/* Logout Button */}
          <TouchableOpacity
            className="flex-row items-center px-3 py-4 mt-2 rounded-xl active:bg-red-50"
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View className="items-center justify-center w-10 h-10 mr-3 bg-red-100 rounded-full">
              <Icon name="log-out-outline" size={20} color="#ef4444" />
            </View>
            <Text className="flex-1 text-base font-medium text-red-500">
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CustomDrawerContent;