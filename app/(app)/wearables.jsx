import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from "../components/config";
import { router } from 'expo-router';

const WearablesScreen = () => {
  const [wearableData, setWearableData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncData, setSyncData] = useState({
    heart_rate: '',
    blood_pressure: '',
    temperature: '',
    steps: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timestamp, setTimestamp] = useState(new Date());
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{ data: [] }],
  });

  useEffect(() => {
    fetchWearableData();
    fetchRiskAssessment();
  }, []);

  const fetchWearableData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/wearable/data`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { days: 7 },
      });
      setWearableData(response.data.data);
      setSummary(response.data.summary);
      updateChartData(response.data.data);
    } catch (error) {
      showToast('error', 'Error', error.response?.data?.error || 'Failed to fetch wearable data');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (type, title, message) => {
    Toast.show({
      type: type,
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
    });
  };

  const fetchRiskAssessment = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE_URL}/wearable/assess-risk`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRiskAssessment(response.data.riskAssessment);
      if (response.data.riskAssessment.risk_level === 'high') {
        Alert.alert(
          'High Risk Alert',
          'Your health metrics indicate a high-risk condition. Please contact your healthcare provider.',
          [
            { text: 'OK', style: 'default' },
            { text: 'Call Doctor', onPress: () => console.log('Calling doctor') },
          ]
        );
      }
    } catch (error) {
      showToast('error', 'Error', error.response?.data?.error || 'Failed to fetch risk assessment');
    }
  };

  const updateChartData = (data) => {
    const labels = data
      .slice(0, 7)
      .map((d) => new Date(d.timestamp).toLocaleDateString())
      .reverse();
    const heartRates = data
      .slice(0, 7)
      .map((d) => d.heart_rate || 0)
      .reverse();
    setChartData({
      labels,
      datasets: [
        {
          data: heartRates,
          label: 'Heart Rate (BPM)',
        },
      ],
    });
  };

  const validateSyncData = () => {
    if (syncData.heart_rate && (parseInt(syncData.heart_rate) < 30 || parseInt(syncData.heart_rate) > 200)) {
      Alert.alert('Error', 'Heart rate must be between 30 and 200 BPM');
      return false;
    }
    
    if (syncData.blood_pressure && !/^\d{2,3}\/\d{2,3}$/.test(syncData.blood_pressure)) {
      Alert.alert('Error', 'Blood pressure must be in format systolic/diastolic (e.g., 120/80)');
      return false;
    }
    
    if (syncData.temperature && (parseFloat(syncData.temperature) < 35 || parseFloat(syncData.temperature) > 42)) {
      Alert.alert('Error', 'Temperature must be between 35°C and 42°C');
      return false;
    }
    
    if (syncData.steps && parseInt(syncData.steps) < 0) {
      Alert.alert('Error', 'Steps cannot be negative');
      return false;
    }
    
    return true;
  };

  const handleSyncData = async () => {
    if (!validateSyncData()) return;
    
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const payload = {
        heart_rate: syncData.heart_rate ? parseInt(syncData.heart_rate) : undefined,
        blood_pressure: syncData.blood_pressure || undefined,
        temperature: syncData.temperature ? parseFloat(syncData.temperature) : undefined,
        steps: syncData.steps ? parseInt(syncData.steps) : undefined,
        timestamp: timestamp.toISOString(),
      };
      await axios.post(`${API_BASE_URL}/wearable/sync`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert('Success', 'Wearable data synced successfully');
      setSyncData({ heart_rate: '', blood_pressure: '', temperature: '', steps: '' });
      fetchWearableData();
      fetchRiskAssessment();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to sync wearable data');
    } finally {
      setIsLoading(false);
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

  const onDateTimeChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTimestamp(selectedDate);
    }
  };

  return (
    <>
    <SafeAreaView className="flex-1 bg-gradient-to-b from-pink-50 to-white">
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FF8AB7" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-pink-700">Wearables</Text>
          <TouchableOpacity
            onPress={handleEmergencyAlert}
            className="p-3 bg-pink-500 rounded-full shadow-lg"
          >
            <Ionicons name="medical" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Risk Assessment Card */}
        <LinearGradient
          colors={['#FF8AB7', '#FFB1CC']}
          className="p-6 mb-6 shadow-lg rounded-3xl"
        >
          <Text className="mb-2 text-lg font-semibold text-white">Risk Assessment</Text>
          {isLoading ? (
            <Text className="text-center text-white">Loading...</Text>
          ) : riskAssessment ? (
            <View>
              <Text className="text-2xl font-bold text-white capitalize">
                {riskAssessment.risk_level} Risk
              </Text>
              <Text className="text-sm text-white/80 mt-2">
                Last assessed: {new Date(riskAssessment.created_at).toLocaleString()}
              </Text>
              {riskAssessment.risk_level === 'high' && (
                <Text className="text-sm text-pink-200 mt-2">
                  Please contact your healthcare provider immediately.
                </Text>
              )}
            </View>
          ) : (
            <Text className="text-center text-white">No risk assessment available</Text>
          )}
        </LinearGradient>

        {/* Wearable Data Summary */}
        <View className="p-4 mb-6 bg-white border border-pink-100 shadow-sm rounded-2xl">
          <Text className="mb-3 text-lg font-semibold text-pink-600">
            Recent Health Metrics
          </Text>
          {isLoading ? (
            <Text className="text-center text-gray-500">Loading...</Text>
          ) : summary ? (
            <View className="flex-row flex-wrap justify-between">
              {summary.heart_rate && (
                <View className="w-1/2 mb-2">
                  <Text className="font-semibold text-gray-700">Heart Rate</Text>
                  <Text className="text-sm text-gray-600">
                    Avg: {summary.heart_rate.average} BPM
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Range: {summary.heart_rate.min} - {summary.heart_rate.max} BPM
                  </Text>
                </View>
              )}
              {summary.steps && (
                <View className="w-1/2 mb-2">
                  <Text className="font-semibold text-gray-700">Steps</Text>
                  <Text className="text-sm text-gray-600">
                    Total: {summary.steps.total}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Avg: {summary.steps.average}/day
                  </Text>
                </View>
              )}
              {summary.temperature && (
                <View className="w-1/2 mb-2">
                  <Text className="font-semibold text-gray-700">Temperature</Text>
                  <Text className="text-sm text-gray-600">
                    Avg: {summary.temperature.average}°C
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Range: {summary.temperature.min} - {summary.temperature.max}°C
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text className="text-center text-gray-500">No data available</Text>
          )}
        </View>

        {/* Heart Rate Trend Chart */}
        <View className="p-4 mb-6 bg-white border border-pink-100 shadow-sm rounded-2xl">
          <Text className="mb-3 text-lg font-semibold text-pink-600">
            Heart Rate Trend (Last 7 Days)
          </Text>
          {chartData.labels.length > 0 ? (
            <View className="h-48 items-center justify-center">
              <Text className="text-gray-500 text-center">
                Chart visualization would go here
              </Text>
              <Text className="text-gray-500 text-center text-xs mt-1">
                {chartData.datasets[0].data.length} data points available
              </Text>
            </View>
          ) : (
            <Text className="text-center text-gray-500">No chart data available</Text>
          )}
        </View>

        {/* Sync Wearable Data Form */}
        <View className="p-4 mb-6 bg-white border border-pink-100 shadow-sm rounded-2xl">
          <Text className="mb-3 text-lg font-semibold text-pink-600">
            Sync Wearable Data
          </Text>
          
          <TextInput
            className="p-3 mb-3 border border-gray-300 rounded-lg"
            placeholder="Heart Rate (BPM)"
            keyboardType="numeric"
            value={syncData.heart_rate}
            onChangeText={(text) => setSyncData({ ...syncData, heart_rate: text })}
          />
          
          <TextInput
            className="p-3 mb-3 border border-gray-300 rounded-lg"
            placeholder="Blood Pressure (e.g., 120/80)"
            value={syncData.blood_pressure}
            onChangeText={(text) => setSyncData({ ...syncData, blood_pressure: text })}
          />
          
          <TextInput
            className="p-3 mb-3 border border-gray-300 rounded-lg"
            placeholder="Temperature (°C)"
            keyboardType="numeric"
            value={syncData.temperature}
            onChangeText={(text) => setSyncData({ ...syncData, temperature: text })}
          />
          
          <TextInput
            className="p-3 mb-3 border border-gray-300 rounded-lg"
            placeholder="Steps"
            keyboardType="numeric"
            value={syncData.steps}
            onChangeText={(text) => setSyncData({ ...syncData, steps: text })}
          />
          
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="p-3 mb-3 border border-gray-300 rounded-lg"
          >
            <Text className="text-gray-700">
              Timestamp: {timestamp.toLocaleString()}
            </Text>
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={timestamp}
              mode="datetime"
              display="default"
              onChange={onDateTimeChange}
            />
          )}
          
          <TouchableOpacity
            onPress={handleSyncData}
            className={`px-6 py-3 bg-pink-600 rounded-lg ${isLoading ? 'opacity-60' : ''}`}
            disabled={isLoading}
          >
            <Text className="text-white font-semibold text-center">
              {isLoading ? 'Syncing...' : 'Sync Data'}
            </Text>
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
    </SafeAreaView>

    <Toast />
    </>
  );
};

export default WearablesScreen;