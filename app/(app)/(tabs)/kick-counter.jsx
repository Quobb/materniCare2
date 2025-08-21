import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from "../../components/config";
import { router } from 'expo-router';
const KickCounter = () => {
  const [kickCount, setKickCount] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [todayKicks, setTodayKicks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [weeklyData, setWeeklyData] = useState({
    labels: [],
    datasets: [{ data: [] }],
  });

  useEffect(() => {
    fetchKickCounts();
    fetchChartData();
    let interval;
    if (isTracking) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  const fetchKickCounts = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/kick-count`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { days: 1 },
      });
      setTodayKicks(
        response.data.kickCounts.map((kick) => ({
          kicks: kick.count,
          duration: 0,
          timestamp: new Date(kick.timestamp),
          date: new Date(kick.timestamp).toDateString(),
        }))
      );
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to fetch kick counts';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/kick-count/chart`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { days: 7 },
      });
      setWeeklyData({
        labels: response.data.chart.data.labels,
        datasets: [
          {
            data: response.data.chart.data.datasets[0].data,
          },
        ],
      });
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to fetch chart data';
      Alert.alert('Error', errorMessage);
    }
  };

  const startSession = () => {
    setIsTracking(true);
    setStartTime(new Date());
    setKickCount(0);
    setElapsedTime(0);
  };

  const stopSession = async () => {
    setIsTracking(false);
    if (kickCount > 0) {
      setIsLoading(true);
      try {
        const token = await AsyncStorage.getItem('authToken');
        const response = await axios.post(
          `${API_BASE_URL}/kick-count`,
          {
            count: kickCount,
            notes: `Session duration: ${formatTime(elapsedTime)}`,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const session = {
          kicks: kickCount,
          duration: elapsedTime,
          timestamp: new Date(response.data.kickCount.timestamp),
          date: new Date(response.data.kickCount.timestamp).toDateString(),
        };
        setTodayKicks((prev) => [...prev, session]);
        fetchChartData();

        if (kickCount < 6 && elapsedTime > 7200) {
          Alert.alert(
            'Low Kick Count Alert',
            "You've recorded fewer kicks than usual. Consider contacting your healthcare provider.",
            [
              { text: 'OK', style: 'default' },
              { text: 'Call Doctor', onPress: () => console.log('Calling doctor') },
            ]
          );
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.error || 'Failed to record kick count';
        Alert.alert('Error', errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const recordKick = () => {
    if (isTracking) {
      setKickCount((prev) => prev + 1);
      console.log('Kick recorded!');
      if (kickCount + 1 >= 10) {
        Alert.alert(
          'Great Job!',
          "You've reached your kick count goal for this session!",
          [{ text: 'Continue', style: 'default' }]
        );
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTodayTotal = () => {
    return todayKicks.reduce((total, session) => total + session.kicks, 0) + kickCount;
  };

  const screenWidth = Dimensions.get('window').width;

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-pink-50 to-white">
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FF8AB7" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-pink-600">Kick Counter</Text>
          <TouchableOpacity onPress={() => router.replace('../../(app)/kick-history')}>
            <Ionicons name="bar-chart" size={24} color="#FF8AB7" />
          </TouchableOpacity>
        </View>

        {/* Current Session Card */}
        <View className="p-6 mb-6 bg-white border border-pink-100 shadow-lg rounded-3xl">
          <View className="items-center">
            <Text className="mb-2 text-lg font-semibold text-pink-600">
              Current Session
            </Text>

            {/* Kick Count Display */}
            <View className="items-center justify-center w-40 h-40 mb-4 rounded-full shadow-lg bg-gradient-to-r from-pink-600 to-pink-400">
              <Text className="text-4xl font-bold text-white">{kickCount}</Text>
              <Text className="text-sm text-white/80">kicks</Text>
            </View>

            {/* Timer */}
            <View className="px-4 py-2 mb-4 bg-pink-50 rounded-2xl">
              <Text className="font-mono text-xl text-pink-600">
                {formatTime(elapsedTime)}
              </Text>
            </View>

            {/* Control Buttons */}
            <View className="flex-row space-x-4">
              {!isTracking ? (
                <TouchableOpacity
                  onPress={startSession}
                  className="px-8 py-3 bg-pink-400 shadow-lg rounded-2xl"
                  disabled={isLoading}
                >
                  <Text className="text-lg font-semibold text-white">
                    {isLoading ? 'Starting...' : 'Start Session'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={recordKick}
                    className="px-8 py-3 bg-pink-500 shadow-lg rounded-2xl"
                    disabled={isLoading}
                  >
                    <Text className="text-lg font-semibold text-white">
                      Record Kick
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={stopSession}
                    className="px-6 py-3 bg-pink-600 shadow-lg rounded-2xl"
                    disabled={isLoading}
                  >
                    <Text className="text-lg font-semibold text-white">
                      {isLoading ? 'Saving...' : 'Stop'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Today's Summary */}
        <View className="p-4 mb-6 bg-white border border-pink-100 shadow-sm rounded-2xl">
          <Text className="mb-3 text-lg font-semibold text-pink-600">
            Today's Summary
          </Text>
          {isLoading ? (
            <Text className="text-center text-gray-500">Loading...</Text>
          ) : (
            <View className="flex-row items-center justify-between">
              <View className="items-center">
                <Text className="text-2xl font-bold text-pink-600">
                  {getTodayTotal()}
                </Text>
                <Text className="text-sm text-gray-600">Total Kicks</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-pink-600">
                  {todayKicks.length}
                </Text>
                <Text className="text-sm text-gray-600">Sessions</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-pink-400">
                  {getTodayTotal() >= 10 ? '✓' : '○'}
                </Text>
                <Text className="text-sm text-gray-600">Goal Met</Text>
              </View>
            </View>
          )}
        </View>

        {/* Weekly Trend Chart */}
        <View className="p-4 mb-6 bg-white border border-pink-100 shadow-sm rounded-2xl">
          <Text className="mb-3 text-lg font-semibold text-pink-600">
            Weekly Trend
          </Text>
          {weeklyData.labels.length > 0 ? (
            <Text className="text-center text-gray-500">
              Chart data available - integrate with your preferred React Native chart library
            </Text>
          ) : (
            <Text className="text-center text-gray-500">
              No chart data available
            </Text>
          )}
        </View>

        {/* Tips & Guidelines */}
        <View className="p-4 mb-6 border border-pink-200 bg-pink-50 rounded-2xl">
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle" size={20} color="#FF8AB7" />
            <Text className="ml-2 font-semibold text-pink-600">Guidelines</Text>
          </View>
          <Text className="mb-2 text-sm leading-5 text-pink-600">
            • Count kicks when baby is most active (usually after meals)
          </Text>
          <Text className="mb-2 text-sm leading-5 text-pink-600">
            • Aim for 10 movements within 2 hours
          </Text>
          <Text className="mb-2 text-sm leading-5 text-pink-600">
            • Contact your doctor if you notice significant changes
          </Text>
          <Text className="text-sm leading-5 text-pink-600">
            • Best times: after meals, when lying on your left side
          </Text>
        </View>

        {/* Recent Sessions */}
        {todayKicks.length > 0 && (
          <View className="p-4 mb-6 bg-white border border-pink-100 shadow-sm rounded-2xl">
            <Text className="mb-3 text-lg font-semibold text-pink-600">
              Recent Sessions
            </Text>
            {todayKicks.slice(-3).map((session, index) => (
              <View
                key={index}
                className="flex-row items-center justify-between py-2 border-b border-gray-100"
              >
                <Text className="text-gray-700">{session.kicks} kicks</Text>
                <Text className="text-sm text-gray-600">
                  {formatTime(session.duration)}
                </Text>
                <Text className="text-xs text-gray-500">
                  {session.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Emergency Alert */}
        <View className="p-4 mb-6 border border-pink-200 bg-pink-50 rounded-2xl">
          <View className="flex-row items-center mb-2">
            <Ionicons name="warning" size={20} color="#FF8AB7" />
            <Text className="ml-2 font-semibold text-pink-600">
              When to Contact Your Doctor
            </Text>
          </View>
          <Text className="mb-2 text-sm leading-5 text-pink-600">
            • Significant decrease in fetal movement
          </Text>
          <Text className="mb-2 text-sm leading-5 text-pink-600">
            • No movement for several hours
          </Text>
          <Text className="text-sm leading-5 text-pink-600">
            • Any concerns about your baby's well-being
          </Text>
          <TouchableOpacity
            onPress={() => console.log('Calling doctor')}
            className="self-start px-4 py-2 mt-3 bg-pink-500 rounded-xl"
          >
            <Text className="text-sm font-semibold text-white">Call Doctor Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default KickCounter;