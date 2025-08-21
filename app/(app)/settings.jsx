import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
} from 'react-native';
import { useUserProfile } from '../utils/userDataManager';
import Icon from 'react-native-vector-icons/Ionicons';
const SettingsScreen = () => {
  const { userProfile } = useUserProfile();
  
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="items-center justify-center flex-1 p-6">
        <View className="items-center w-full max-w-sm p-8 bg-white shadow-sm rounded-2xl">
          <View className="items-center justify-center w-16 h-16 mb-4 rounded-full bg-violet-100">
            <Icon name="settings" size={32} color="#8B5CF6" />
          </View>
          <Text className="mb-2 text-2xl font-bold text-gray-800">Settings</Text>
          <Text className="mb-4 text-base text-center text-gray-500">
            Manage your app preferences
          </Text>
          <Text className="text-sm text-center text-gray-400">
            Welcome, {userProfile.name}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;