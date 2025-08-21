import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useUserProfile } from '../utils/userDataManager';



const CustomHeader = ({ title, navigation }) => {
  const { userProfile, loading, error, refreshProfile } = useUserProfile();

  const handleProfilePress = () => {
    router.push('../(app)/(tabs)/profile');
  };

  return (
    <SafeAreaView className="bg-violet-500">
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED']}
        className="flex-row items-center justify-between px-4 py-3"
        style={{ height: 60 }}
      >
        {/* Menu Button */}
        <TouchableOpacity 
          onPress={() => navigation.openDrawer()}
          className="p-2 rounded-lg active:bg-white active:bg-opacity-20"
          activeOpacity={0.7}
        >
          <Icon name="menu" size={24} color="white" />
        </TouchableOpacity>
        
        {/* Title */}
        <View className="flex-1">
          <Text className="mx-4 text-lg font-bold text-center text-white" numberOfLines={1}>
            {title}
          </Text>
        </View>
        
        {/* Profile Section */}
        <TouchableOpacity 
          onPress={handleProfilePress}
          className="flex-row items-center p-1 rounded-lg active:bg-white active:bg-opacity-20"
          activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            {/* Profile Avatar */}
            {loading ? (
              <View className="items-center justify-center w-8 h-8 mr-2 bg-white rounded-full bg-opacity-20">
                <ActivityIndicator size="small" color="white" />
              </View>
            ) : userProfile.profileImage ? (
              <Image
                source={{ uri: userProfile.profileImage }}
                className="w-8 h-8 mr-2 border border-white rounded-full border-opacity-30"
                onError={() => console.log('Failed to load profile image')}
              />
            ) : (
              <View className="items-center justify-center w-8 h-8 mr-2 bg-white rounded-full">
                <Icon name="person" size={16} color="#8B5CF6" />
              </View>
            )}
            
            {/* User Name */}
            <View className="max-w-20">
              <Text className="text-sm font-medium text-white" numberOfLines={1}>
                {loading ? 'Loading...' : (userProfile.name || 'User')}
              </Text>
            </View>
            
            {/* Error Indicator */}
            {error && (
              <TouchableOpacity 
                onPress={() => refreshProfile(true)}
                className="p-1 ml-1"
              >
                <Icon name="warning-outline" size={14} color="#fbbf24" />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default CustomHeader;