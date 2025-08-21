import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
const HelpScreen = () => (
  <SafeAreaView className="flex-1 bg-gray-50">
    <View className="items-center justify-center flex-1 p-6">
      <View className="items-center w-full max-w-sm p-8 bg-white shadow-sm rounded-2xl">
        <View className="items-center justify-center w-16 h-16 mb-4 bg-blue-100 rounded-full">
          <Icon name="help-circle" size={32} color="#3B82F6" />
        </View>
        <Text className="mb-2 text-2xl font-bold text-gray-800">Help & Support</Text>
        <Text className="text-base text-center text-gray-500">
          Get assistance with the app
        </Text>
      </View>
    </View>
  </SafeAreaView>
);

export default HelpScreen;