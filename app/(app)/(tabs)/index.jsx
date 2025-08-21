import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL } from "../../components/config";
import { useUserProfile, clearUserData, getAuthToken } from '../../utils/userDataManager';
import { useRouter, useLocalSearchParams } from 'expo-router';

const PregnancyDashboard = () => {
    const router = useRouter();
      const params = useLocalSearchParams();
  const [currentWeek, setCurrentWeek] = useState(0);
  const [daysLeft, setDaysLeft] = useState(0);
  const [dueDate, setDueDate] = useState(null);
  const [kickCount, setKickCount] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLMPModal, setShowLMPModal] = useState(false);
  const [lmpDate, setLmpDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userName, setUserName] = useState('');
  const [isLoadingUser, setIsLoadingUser] = useState(true);
const { userProfile, loading, error, refreshProfile } = useUserProfile();
  // Function to get greeting based on current time
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good Morning';
    } else if (hour < 17) {
      return 'Good Afternoon';
    } else {
      return 'Good Evening';
    }
  };

  useEffect(() => {
    // Fetch user profile first, then other data
    const initializeData = async () => {
      await fetchUserProfile();
      await Promise.all([
        fetchPregnancyData(),
        fetchKickCounts(),
        fetchAppointments()
      ]);
    };
    
    initializeData();
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
        timeout: 10000 // 10 second timeout
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
        // Navigate to login screen or clear auth token
      } else {
        Alert.alert('Error', error.response?.data?.error || 'Failed to fetch pregnancy data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKickCounts = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/kick-count`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: { days: 1 },
        timeout: 10000
      });
      
      setKickCount(response.data.summary?.totalKicks || 0);
    } catch (error) {
      console.error('Kick count fetch error:', error);
      // Don't show alert for kick count errors, just log them
    }
  };

  const fetchAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/appointments`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: { status: 'active' },
        timeout: 10000
      });
      
      const appointments = response.data.appointments || [];
      setUpcomingAppointments(
        appointments.slice(0, 2).map((appt) => ({
          id: appt.id,
          type: appt.type || 'Appointment',
          date: new Date(appt.date).toISOString().split('T')[0],
          time: appt.time || '00:00',
          doctor: appt.doctor || 'Doctor',
        }))
      );
    } catch (error) {
      console.error('Appointments fetch error:', error);
      // Don't show alert for appointments errors, just log them
    }
  };

  const fetchUserProfile = async () => {
    setIsLoadingUser(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        console.error('No auth token found');
        setUserName('Guest');
        return;
      }

      console.log('Fetching user profile...');
      
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      console.log('User profile response:', response.data);
      
      // Handle different possible response structures
      const user = response.data.user || response.data;
      const fullName = user.full_name || user.name || user.firstName;
      
      if (fullName) {
        setUserName(fullName);
      } else {
        // Fallback to email or username
        const fallbackName = user.email?.split('@')[0] || user.username || 'User';
        setUserName(fallbackName);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      
      if (error.response?.status === 401) {
        console.log('Unauthorized - token may be expired');
        setUserName('Guest');
        // Could redirect to login here
      } else if (error.code === 'ECONNABORTED') {
        console.log('Request timed out');
        setUserName('User');
      } else {
        console.log('Other error:', error.message);
        setUserName('User');
      }
    } finally {
      setIsLoadingUser(false);
    }
  };

  const calculateDueDate = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        Alert.alert('Error', 'Authentication token not found.');
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/pregnancy/calculate-due-date`,
        { lmp_date: lmpDate.toISOString().split('T')[0] },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      const due = new Date(response.data.due_date);
      setDueDate(due.toLocaleDateString());
      createPregnancyRecord(response.data.due_date);
    } catch (error) {
      console.error('Calculate due date error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to calculate due date');
    }
  };

  const createPregnancyRecord = async (due_date) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const start_date = new Date(lmpDate);
      start_date.setDate(start_date.getDate() + 14);
      
      await axios.post(
        `${API_BASE_URL}/pregnancy`,
        {
          start_date: start_date.toISOString().split('T')[0],
          due_date,
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      setShowLMPModal(false);
      fetchPregnancyData();
    } catch (error) {
      console.error('Create pregnancy record error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create pregnancy record');
    }
  };

  const handleEmergencyAlert = () => {
    Alert.alert(
      'Emergency Alert',
      'Calling emergency contact...',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 911', onPress: () => console.log('Emergency call initiated') },
        { text: 'Call Doctor', onPress: () => console.log('Doctor call initiated') },
      ]
    );
  };

  // Refresh function that can be called when user pulls to refresh
  const handleRefresh = async () => {
    await Promise.all([
      fetchUserProfile(),
      fetchPregnancyData(),
      fetchKickCounts(),
      fetchAppointments()
    ]);
  };

  const quickActions = [
    { id: 1, title: 'Kick Counter', icon: 'heart', color: '#FF8AB7', screen: '../(tabs)/kick-counter' },
    { id: 2, title: 'Appointments', icon: 'calendar', color: '#FFB1CC', screen: './appointments' },
    { id: 3, title: 'Health Tips', icon: 'bulb', color: '#FFD1E3', screen: './health-tips' },
    { id: 4, title: 'Wearables', icon: 'watch', color: '#FFE4EF', screen: '../wearables' },
    { id: 5, title: 'Profile', icon: 'person', color: '#FFF0F5', screen: '../(tabs)/profile' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-pink-50 to-white">
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            {isLoadingUser ? (
              <View>
                <Text className="text-2xl font-bold text-pink-700">Loading...</Text>
                <Text className="text-sm text-gray-600">Please wait</Text>
              </View>
            ) : (
              <View>
                <Text className="text-2xl font-bold text-pink-700">
                  {getTimeBasedGreeting()}, {loading ? 'Loading...' : (userProfile.name || 'User')}!
                </Text>
                <Text className="text-sm text-gray-600">How are you feeling today?</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={handleEmergencyAlert}
            className="p-3 bg-pink-500 rounded-full shadow-lg"
          >
            <Ionicons name="medical" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Pregnancy Progress Card */}
        <LinearGradient
          colors={['#FF8AB7', '#FFB1CC']}
          className="p-6 mb-6 shadow-lg rounded-3xl"
        >
          {isLoading ? (
            <Text className="text-center text-white">Loading...</Text>
          ) : dueDate ? (
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="mb-2 text-lg font-semibold text-white">Week {currentWeek}</Text>
                <Text className="mb-1 text-sm text-white/80">Your baby is the size of a corn cob!</Text>
                <Text className="text-sm text-white/80">{daysLeft} days to go</Text>
                <Text className="mt-2 text-xs text-white/80">Due Date: {dueDate}</Text>
              </View>
              <View className="items-center">
                <Image
                  source={require('../../../assets/animation/Baby-cuate.png')}
                  className="w-20 h-20 mb-2"
                  resizeMode="contain"
                />
                <View className="px-3 py-1 rounded-full bg-white/20">
                  <Text className="text-xs font-medium text-white">
                    {Math.round((currentWeek / 40) * 100)}%
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <Text className="text-center text-white">No active pregnancy. Please enter LMP date.</Text>
          )}
          {/* Progress Bar */}
          {dueDate && (
            <View className="mt-4">
              <View className="h-2 rounded-full bg-white/20">
                <View
                  className="h-2 bg-white rounded-full"
                  style={{ width: `${(currentWeek / 40) * 100}%` }}
                />
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Today's Highlights */}
        <View className="mb-6">
          <Text className="mb-4 text-xl font-bold text-pink-700">Today's Highlights</Text>

          {/* Kick Counter Summary */}
          <View className="p-4 mb-3 bg-white border border-pink-100 shadow-sm rounded-2xl">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-semibold text-pink-600">Kick Count Today</Text>
                <Text className="text-sm text-gray-600">Target: 10 kicks in 2 hours</Text>
              </View>
              <View className="p-3 bg-pink-50 rounded-full">
                <Ionicons name="heart" size={20} color="#FF8AB7" />
              </View>
            </View>
            <Text className="mt-2 text-2xl font-bold text-pink-700">{kickCount} kicks</Text>
          </View>

          {/* Next Appointment */}
          {upcomingAppointments.length > 0 && (
            <View className="p-4 mb-3 bg-white border border-pink-100 shadow-sm rounded-2xl">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="font-semibold text-pink-600">Next Appointment</Text>
                  <Text className="text-sm text-gray-600">{upcomingAppointments[0].type}</Text>
                  <Text className="text-sm text-gray-600">
                    {upcomingAppointments[0].date} at {upcomingAppointments[0].time}
                  </Text>
                </View>
                <View className="p-3 bg-pink-50 rounded-full">
                  <Ionicons name="calendar" size={20} color="#FFB1CC" />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions Grid */}
        <View className="mb-6">
          <Text className="mb-4 text-xl font-bold text-pink-700">Quick Actions</Text>
          <View className="flex-row flex-wrap justify-between">
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                onPress={() => router.push(action.screen)}
                className="p-4 mb-3 bg-white border border-pink-100 shadow-sm rounded-2xl"
                style={{ width: '48%' }}
              >
                <View className="items-center">
                  <View
                    className="p-3 mb-2 rounded-full"
                    style={{ backgroundColor: action.color }}
                  >
                    <Ionicons name={action.icon} size={24} color="#FFFFFF" />
                  </View>
                  <Text className="text-sm font-medium text-pink-600">{action.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Health Tip of the Day */}
        <View className="p-4 mb-6 bg-gradient-to-r from-pink-100 to-white rounded-2xl">
          <View className="flex-row items-center mb-2">
            <Ionicons name="bulb" size={20} color="#FF8AB7" />
            <Text className="ml-2 font-semibold text-pink-600">Health Tip of the Day</Text>
          </View>
          <Text className="text-sm leading-5 text-gray-700">
            Stay hydrated! Drink at least 8-10 glasses of water daily. Proper hydration helps prevent
            constipation and supports healthy blood flow to your baby.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('./health-tips')}
            className="mt-2"
          >
            <Text className="text-sm font-medium text-pink-600">View More Tips →</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Contacts */}
        <View className="p-4 mb-6 border border-pink-200 bg-pink-50 rounded-2xl">
          <Text className="mb-2 font-semibold text-pink-600">Emergency Contacts</Text>
          <View className="flex-row justify-between">
            <TouchableOpacity className="flex-row items-center">
              <Ionicons name="call" size={16} color="#FF8AB7" />
              <Text className="ml-1 text-sm text-pink-600">911</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center">
              <Ionicons name="medical" size={16} color="#FF8AB7" />
              <Text className="ml-1 text-sm text-pink-600">Dr. Johnson</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center">
              <Ionicons name="home" size={16} color="#FF8AB7" />
              <Text className="ml-1 text-sm text-pink-600">Hospital</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* LMP Input Modal */}
      <Modal
        visible={showLMPModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLMPModal(false)}
      >
        <View className="items-center justify-center flex-1 bg-black/50">
          <View className="w-11/12 p-6 bg-white rounded-2xl">
            <Text className="mb-4 text-xl font-bold text-pink-700">
              Enter Last Menstrual Period
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="p-3 mb-4 border border-gray-300 rounded-lg"
            >
              <Text className="text-gray-700">
                LMP Date: {lmpDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={lmpDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setLmpDate(selectedDate);
                }}
              />
            )}
            <View className="flex-row justify-between">
              <TouchableOpacity
                onPress={() => setShowLMPModal(false)}
                className="px-6 py-3 bg-gray-500 rounded-lg"
              >
                <Text className="font-semibold text-white">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={calculateDueDate}
                className="px-6 py-3 bg-pink-600 rounded-lg"
              >
                <Text className="font-semibold text-white">Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default PregnancyDashboard;