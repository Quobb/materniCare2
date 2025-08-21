import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator, Dimensions } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../components/config';
import { router } from 'expo-router';
const { width } = Dimensions.get('window');

const TrimesterCalculator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [lmpDate, setLmpDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLMPModal, setShowLMPModal] = useState(false);

  useEffect(() => {
    fetchPregnancyData();
  }, []);

  const fetchPregnancyData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/pregnancy/current`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const { pregnancy } = response.data;
      setCurrentWeek(pregnancy.current_week);
      const due = new Date(pregnancy.due_date);
      setDueDate(due.toLocaleDateString());
      const today = new Date();
      const diffTime = due.getTime() - today.getTime();
      setDaysLeft(Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))));
    } catch (error) {
      console.error('Pregnancy data fetch error:', error);
      if (error.response?.status === 404) {
        setShowLMPModal(true);
      } else if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again.');
      } else {
        Alert.alert('Error', error.response?.data?.error || 'Failed to fetch pregnancy data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveLMP = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found.');
        return;
      }

      await axios.post(`${API_BASE_URL}/pregnancy`, 
        { lmp: lmpDate.toISOString().split('T')[0] },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowLMPModal(false);
      fetchPregnancyData();
    } catch (error) {
      console.error('Save LMP error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save LMP');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrimester = (week) => {
    if (week < 13) return 'First Trimester';
    if (week < 27) return 'Second Trimester';
    return 'Third Trimester';
  };

  const getTrimesterColor = (week) => {
    if (week < 13) return ['#FFB6C1', '#FFA0C9']; // Light pink
    if (week < 27) return ['#87CEEB', '#98D8E8']; // Sky blue
    return ['#DDA0DD', '#E6B3E6']; // Plum
  };

  const getTrimesterIcon = (week) => {
    if (week < 13) return 'flower';
    if (week < 27) return 'heart';
    return 'star';
  };

  const getProgressPercentage = (week) => {
    return Math.min((week / 40) * 100, 100);
  };

  const WeekProgressBar = ({ currentWeek }) => {
    const progress = getProgressPercentage(currentWeek);
    
    return (
      <View className="mb-6">
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm font-medium text-gray-600">Week {currentWeek} of 40</Text>
          <Text className="text-sm font-medium text-gray-600">{Math.round(progress)}%</Text>
        </View>
        <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <View 
            className="h-full bg-gradient-to-r from-pink-400 to-pink-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>
    );
  };

  const StatCard = ({ icon, label, value, color = '#FF8AB7' }) => (
    <View className="flex-1 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 mx-1">
      <View className="items-center">
        <View 
          className="w-12 h-12 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: `${color}20` }}
        >
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text className="text-2xl font-bold mb-1" style={{ color }}>{value}</Text>
        <Text className="text-xs text-gray-600 text-center font-medium">{label}</Text>
      </View>
    </View>
  );

  const TrimesterCard = ({ currentWeek }) => {
    const trimester = getTrimester(currentWeek);
    const colors = getTrimesterColor(currentWeek);
    const icon = getTrimesterIcon(currentWeek);
    
    return (
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-6 rounded-3xl mb-6 shadow-lg"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-white text-lg font-semibold mb-1">Current Stage</Text>
            <Text className="text-white text-2xl font-bold">{trimester}</Text>
          </View>
          <View className="w-16 h-16 bg-white bg-opacity-20 rounded-full items-center justify-center">
            <Ionicons name={icon} size={32} color="white" />
          </View>
        </View>
      </LinearGradient>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-pink-50 to-purple-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 bg-white shadow-sm">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-pink-50 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#FF8AB7" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Pregnancy Journey</Text>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-pink-50 items-center justify-center">
            <Ionicons name="refresh" size={20} color="#FF8AB7" onPress={fetchPregnancyData} />
          </TouchableOpacity>
        </View>

        <View className="px-6 py-6">
          {isLoading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color="#FF8AB7" />
              <Text className="mt-4 text-gray-600 font-medium">Loading your pregnancy data...</Text>
            </View>
          ) : showLMPModal ? (
            <View className="items-center py-8">
              <View className="w-24 h-24 bg-pink-100 rounded-full items-center justify-center mb-6">
                <Ionicons name="calendar" size={40} color="#FF8AB7" />
              </View>
              
              <Text className="text-2xl font-bold text-gray-800 mb-2">Welcome!</Text>
              <Text className="text-gray-600 text-center mb-8 px-4">
                Let's start by setting your Last Menstrual Period date to calculate your pregnancy journey
              </Text>

              <View className="w-full max-w-sm">
                <Text className="mb-3 font-semibold text-gray-700">Last Menstrual Period</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className="p-4 bg-white rounded-2xl border-2 border-pink-100 shadow-sm"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-800 font-semibold text-lg">
                      {lmpDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#FF8AB7" />
                  </View>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={lmpDate}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) setLmpDate(selectedDate);
                    }}
                  />
                )}

                <TouchableOpacity
                  onPress={saveLMP}
                  disabled={isLoading}
                  className="mt-6 py-4 bg-pink-500 rounded-2xl shadow-lg"
                >
                  <Text className="text-white text-center font-bold text-lg">
                    {isLoading ? 'Calculating...' : 'Start My Journey'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Trimester Card */}
              <TrimesterCard currentWeek={currentWeek} />

              {/* Progress Bar */}
              <WeekProgressBar currentWeek={currentWeek} />

              {/* Stats Row */}
              <View className="flex-row mb-6">
                <StatCard 
                  icon="time-outline" 
                  label="Current Week" 
                  value={currentWeek}
                  color="#FF8AB7"
                />
                <StatCard 
                  icon="calendar-outline" 
                  label="Days Remaining" 
                  value={daysLeft}
                  color="#4ECDC4"
                />
              </View>

              {/* Due Date Card */}
              <View className="p-6 bg-white rounded-3xl shadow-sm border border-gray-100 mb-6">
                <View className="flex-row items-center mb-4">
                  <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mr-4">
                    <Ionicons name="gift" size={24} color="#9333EA" />
                  </View>
                  <View>
                    <Text className="text-gray-600 font-medium">Expected Due Date</Text>
                    <Text className="text-2xl font-bold text-gray-800">{dueDate}</Text>
                  </View>
                </View>
                <View className="bg-purple-50 p-4 rounded-2xl">
                  <Text className="text-purple-700 font-medium text-center">
                    Your little one will be here in approximately {daysLeft} days! 💕
                  </Text>
                </View>
              </View>

              {/* Quick Actions */}
              <View className="space-y-3">
                <TouchableOpacity className="flex-row items-center p-4 bg-white rounded-2xl shadow-sm">
                  <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-4">
                    <Ionicons name="book-outline" size={24} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-800">Weekly Development</Text>
                    <Text className="text-sm text-gray-600">Learn about your baby's growth</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity className="flex-row items-center p-4 bg-white rounded-2xl shadow-sm">
                  <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mr-4">
                    <Ionicons name="fitness-outline" size={24} color="#10B981" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-800">Health Tips</Text>
                    <Text className="text-sm text-gray-600">Trimester-specific advice</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TrimesterCalculator;