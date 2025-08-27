import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [syncData, setSyncData] = useState({
    heart_rate: '',
    blood_pressure: '',
    temperature: '',
    steps: '',
    blood_sugar: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timestamp, setTimestamp] = useState(new Date());
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{ data: [] }],
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchWearableData(), fetchRiskAssessment()]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchWearableData(), fetchRiskAssessment()]);
      setLastUpdated(new Date());
      showToast('success', 'Refreshed', 'Data updated successfully');
    } catch (error) {
      showToast('error', 'Refresh Failed', 'Failed to update data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchWearableData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${API_BASE_URL}/wearable/data`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { days: 7 },
        timeout: 10000,
      });

      setWearableData(response.data.data || []);
      setSummary(response.data.summary || null);
      updateChartData(response.data.data || []);
    } catch (error) {
      console.error('Fetch wearable data error:', error);
      if (error.response?.status === 401) {
        showToast('error', 'Authentication Error', 'Please log in again');
      } else if (error.code === 'ECONNABORTED') {
        showToast('error', 'Timeout', 'Request timed out. Please try again.');
      } else {
        showToast('error', 'Error', error.response?.data?.error || 'Failed to fetch wearable data');
      }
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
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        `${API_BASE_URL}/wearable/assess-risk`,
        {},
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000, // Risk assessment might take longer
        }
      );

      setRiskAssessment(response.data.riskAssessment);
      
      // Handle high risk alerts
      if (response.data.riskAssessment?.risk_level === 'high') {
        Alert.alert(
          'High Risk Alert',
          'Your health metrics indicate a high-risk condition. Please contact your healthcare provider immediately.',
          [
            { text: 'Dismiss', style: 'cancel' },
            { text: 'Call Doctor', onPress: handleEmergencyCall },
          ]
        );
      }
    } catch (error) {
      console.error('Fetch risk assessment error:', error);
      if (error.response?.status === 404) {
        showToast('info', 'No Active Pregnancy', 'Risk assessment requires an active pregnancy');
      } else if (error.code === 'ECONNABORTED') {
        showToast('error', 'Timeout', 'Risk assessment timed out. Using cached data if available.');
      } else {
        showToast('error', 'Error', error.response?.data?.error || 'Failed to fetch risk assessment');
      }
    }
  };

  const updateChartData = (data) => {
    if (!data || data.length === 0) {
      setChartData({ labels: [], datasets: [{ data: [] }] });
      return;
    }

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
    const errors = [];

    if (syncData.heart_rate) {
      const hr = parseInt(syncData.heart_rate);
      if (isNaN(hr) || hr < 30 || hr > 200) {
        errors.push('Heart rate must be between 30 and 200 BPM');
      }
    }
    
    if (syncData.blood_pressure) {
      if (!/^\d{2,3}\/\d{2,3}$/.test(syncData.blood_pressure)) {
        errors.push('Blood pressure must be in format systolic/diastolic (e.g., 120/80)');
      } else {
        const [systolic, diastolic] = syncData.blood_pressure.split('/').map(Number);
        if (systolic < 70 || systolic > 200 || diastolic < 40 || diastolic > 120) {
          errors.push('Blood pressure values are out of normal range');
        }
      }
    }
    
    if (syncData.temperature) {
      const temp = parseFloat(syncData.temperature);
      if (isNaN(temp) || temp < 35 || temp > 42) {
        errors.push('Temperature must be between 35°C and 42°C');
      }
    }
    
    if (syncData.steps) {
      const steps = parseInt(syncData.steps);
      if (isNaN(steps) || steps < 0) {
        errors.push('Steps must be a positive number');
      }
    }

    if (syncData.blood_sugar) {
      const bs = parseFloat(syncData.blood_sugar);
      if (isNaN(bs) || bs < 2 || bs > 30) {
        errors.push('Blood sugar must be between 2 and 30 mmol/L');
      }
    }

    // Check if at least one field is filled
    const hasData = Object.values(syncData).some(value => value.trim() !== '');
    if (!hasData) {
      errors.push('Please enter at least one health metric');
    }

    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return false;
    }
    
    return true;
  };

  const handleSyncData = async () => {
    if (!validateSyncData()) return;
    
    setIsSyncing(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const payload = {
        heart_rate: syncData.heart_rate ? parseInt(syncData.heart_rate) : undefined,
        blood_pressure: syncData.blood_pressure || undefined,
        temperature: syncData.temperature ? parseFloat(syncData.temperature) : undefined,
        steps: syncData.steps ? parseInt(syncData.steps) : undefined,
        blood_sugar: syncData.blood_sugar ? parseFloat(syncData.blood_sugar) : undefined,
        timestamp: timestamp.toISOString(),
      };

      await axios.post(`${API_BASE_URL}/wearable/sync`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      showToast('success', 'Success', 'Health data synced successfully');
      setSyncData({ 
        heart_rate: '', 
        blood_pressure: '', 
        temperature: '', 
        steps: '',
        blood_sugar: '' 
      });
      setTimestamp(new Date());

      // Refresh data after successful sync
      await Promise.all([fetchWearableData(), fetchRiskAssessment()]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Sync data error:', error);
      if (error.response?.status === 401) {
        showToast('error', 'Authentication Error', 'Please log in again');
      } else if (error.code === 'ECONNABORTED') {
        showToast('error', 'Timeout', 'Sync request timed out. Please try again.');
      } else {
        showToast('error', 'Sync Failed', error.response?.data?.error || 'Failed to sync wearable data');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Contact',
      'Choose an emergency contact:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 911', onPress: () => showToast('info', 'Emergency', 'Calling emergency services...') },
        { text: 'Call Doctor', onPress: () => showToast('info', 'Doctor', 'Calling your doctor...') },
        { text: 'Call Hospital', onPress: () => showToast('info', 'Hospital', 'Calling hospital...') },
      ]
    );
  };

  const handleEmergencyAlert = () => {
    Alert.alert(
      'Emergency Alert',
      'This will notify your emergency contacts and healthcare provider.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Alert', onPress: handleEmergencyCall, style: 'destructive' },
      ]
    );
  };

  const onDateTimeChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTimestamp(selectedDate);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high': return ['#EF4444', '#DC2626'];
      case 'medium': return ['#F59E0B', '#D97706'];
      case 'low': return ['#10B981', '#059669'];
      default: return ['#6B7280', '#4B5563'];
    }
  };

  const goBack = () => {
    // Mock router.back() functionality
    console.log('Going back...');
  };

  return (
    <>
      <SafeAreaView className="flex-1 bg-gray-50">
        <ScrollView 
          className="flex-1 px-4 pt-4"
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity onPress={goBack}>
              <Ionicons name="arrow-back" size={24} color="#FF8AB7" />
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-pink-700">Health Monitor</Text>
              {lastUpdated && (
                <Text className="text-xs text-gray-500 mt-1">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={handleEmergencyAlert}
              className="p-3 bg-red-500 rounded-full shadow-lg"
            >
              <Ionicons name="medical" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Risk Assessment Card */}
          <LinearGradient
            colors={riskAssessment ? getRiskColor(riskAssessment.risk_level) : ['#6B7280', '#4B5563']}
            className="p-6 mb-6 shadow-lg rounded-3xl"
          >
            <Text className="mb-2 text-lg font-semibold text-white">Risk Assessment</Text>
            {isLoading ? (
              <View className="flex-row items-center justify-center py-4">
                <ActivityIndicator color="white" size="small" />
                <Text className="text-white ml-2">Analyzing...</Text>
              </View>
            ) : riskAssessment ? (
              <View>
                <Text className="text-2xl font-bold text-white capitalize">
                  {riskAssessment.risk_level} Risk
                </Text>
                <Text className="text-sm text-white/80 mt-2">
                  Last assessed: {new Date(riskAssessment.created_at).toLocaleString()}
                </Text>
                {riskAssessment.details?.source && (
                  <Text className="text-xs text-white/70 mt-1">
                    Source: {riskAssessment.details.source}
                  </Text>
                )}
                {riskAssessment.risk_level === 'high' && (
                  <TouchableOpacity 
                    onPress={handleEmergencyCall}
                    className="mt-3 bg-white/20 px-4 py-2 rounded-lg"
                  >
                    <Text className="text-white font-semibold text-center">
                      Contact Healthcare Provider
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View>
                <Text className="text-center text-white">No risk assessment available</Text>
                <TouchableOpacity 
                  onPress={fetchRiskAssessment}
                  className="mt-2 bg-white/20 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white text-center">Retry Assessment</Text>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>

          {/* Wearable Data Summary */}
          <View className="p-4 mb-6 bg-white border border-pink-100 shadow-sm rounded-2xl">
            <Text className="mb-3 text-lg font-semibold text-pink-600">
              Recent Health Metrics
            </Text>
            {isLoading ? (
              <View className="flex-row items-center justify-center py-4">
                <ActivityIndicator color="#FF8AB7" size="small" />
                <Text className="text-gray-500 ml-2">Loading metrics...</Text>
              </View>
            ) : summary ? (
              <View className="flex-row flex-wrap justify-between">
                {summary.heart_rate && (
                  <View className="w-1/2 mb-3 pr-2">
                    <Text className="font-semibold text-gray-700">Heart Rate</Text>
                    <Text className="text-sm text-gray-600">
                      Avg: {summary.heart_rate.average} BPM
                    </Text>
                    <Text className="text-sm text-gray-600">
                      Range: {summary.heart_rate.min} - {summary.heart_rate.max}
                    </Text>
                  </View>
                )}
                {summary.steps && (
                  <View className="w-1/2 mb-3 pl-2">
                    <Text className="font-semibold text-gray-700">Steps</Text>
                    <Text className="text-sm text-gray-600">
                      Total: {summary.steps.total.toLocaleString()}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      Avg: {summary.steps.average.toLocaleString()}/day
                    </Text>
                  </View>
                )}
                {summary.temperature && (
                  <View className="w-1/2 mb-3 pr-2">
                    <Text className="font-semibold text-gray-700">Temperature</Text>
                    <Text className="text-sm text-gray-600">
                      Avg: {summary.temperature.average}°C
                    </Text>
                    <Text className="text-sm text-gray-600">
                      Range: {summary.temperature.min} - {summary.temperature.max}°C
                    </Text>
                  </View>
                )}
                {summary.blood_sugar && (
                  <View className="w-1/2 mb-3 pl-2">
                    <Text className="font-semibold text-gray-700">Blood Sugar</Text>
                    <Text className="text-sm text-gray-600">
                      Avg: {summary.blood_sugar.average} mmol/L
                    </Text>
                    <Text className="text-sm text-gray-600">
                      Range: {summary.blood_sugar.min} - {summary.blood_sugar.max}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text className="text-center text-gray-500 py-4">
                No data available. Sync your wearable device to see metrics.
              </Text>
            )}
          </View>

          {/* Heart Rate Trend Chart */}
          <View className="p-4 mb-6 bg-white border border-pink-100 shadow-sm rounded-2xl">
            <Text className="mb-3 text-lg font-semibold text-pink-600">
              Heart Rate Trend (Last 7 Days)
            </Text>
            {chartData.labels.length > 0 ? (
              <View className="h-48 items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                <Ionicons name="analytics" size={48} color="#FF8AB7" />
                <Text className="text-gray-500 text-center mt-2">
                  Chart visualization
                </Text>
                <Text className="text-gray-500 text-center text-xs mt-1">
                  {chartData.datasets[0].data.length} data points available
                </Text>
              </View>
            ) : (
              <View className="h-48 items-center justify-center">
                <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
                <Text className="text-center text-gray-500 mt-2">
                  No chart data available
                </Text>
                <Text className="text-center text-gray-400 text-xs">
                  Add health data to see trends
                </Text>
              </View>
            )}
          </View>

          {/* Sync Wearable Data Form */}
          <View className="p-4 mb-6 bg-white border border-pink-100 shadow-sm rounded-2xl">
            <Text className="mb-3 text-lg font-semibold text-pink-600">
              Add Health Data
            </Text>
            
            <TextInput
              className="p-3 mb-3 border border-gray-300 rounded-lg bg-gray-50"
              placeholder="Heart Rate (60-100 BPM normal)"
              keyboardType="numeric"
              value={syncData.heart_rate}
              onChangeText={(text) => setSyncData({ ...syncData, heart_rate: text })}
              editable={!isSyncing}
            />
            
            <TextInput
              className="p-3 mb-3 border border-gray-300 rounded-lg bg-gray-50"
              placeholder="Blood Pressure (e.g., 120/80)"
              value={syncData.blood_pressure}
              onChangeText={(text) => setSyncData({ ...syncData, blood_pressure: text })}
              editable={!isSyncing}
            />
            
            <TextInput
              className="p-3 mb-3 border border-gray-300 rounded-lg bg-gray-50"
              placeholder="Temperature (36.5-37.2°C normal)"
              keyboardType="numeric"
              value={syncData.temperature}
              onChangeText={(text) => setSyncData({ ...syncData, temperature: text })}
              editable={!isSyncing}
            />

            <TextInput
              className="p-3 mb-3 border border-gray-300 rounded-lg bg-gray-50"
              placeholder="Blood Sugar (4.0-6.0 mmol/L normal)"
              keyboardType="numeric"
              value={syncData.blood_sugar}
              onChangeText={(text) => setSyncData({ ...syncData, blood_sugar: text })}
              editable={!isSyncing}
            />
            
            <TextInput
              className="p-3 mb-3 border border-gray-300 rounded-lg bg-gray-50"
              placeholder="Steps"
              keyboardType="numeric"
              value={syncData.steps}
              onChangeText={(text) => setSyncData({ ...syncData, steps: text })}
              editable={!isSyncing}
            />
            
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="p-3 mb-3 border border-gray-300 rounded-lg bg-gray-50"
              disabled={isSyncing}
            >
              <Text className="text-gray-700">
                <Ionicons name="time" size={16} color="#6B7280" /> {timestamp.toLocaleString()}
              </Text>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={timestamp}
                mode="datetime"
                display="default"
                onChange={onDateTimeChange}
                maximumDate={new Date()}
              />
            )}
            
            <TouchableOpacity
              onPress={handleSyncData}
              className={`px-6 py-3 rounded-lg ${
                isSyncing ? 'bg-gray-400' : 'bg-pink-600'
              }`}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator color="white" size="small" />
                  <Text className="text-white font-semibold ml-2">Syncing...</Text>
                </View>
              ) : (
                <Text className="text-white font-semibold text-center">
                  Add Health Data
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Emergency Contacts */}
          <View className="p-4 mb-6 border border-red-200 bg-red-50 rounded-2xl">
            <Text className="mb-3 font-semibold text-red-700">Emergency Contacts</Text>
            <View className="flex-row justify-around">
              <TouchableOpacity 
                className="flex-row items-center bg-red-100 px-3 py-2 rounded-lg"
                onPress={() => showToast('info', 'Emergency', 'Calling 911...')}
              >
                <Ionicons name="call" size={16} color="#DC2626" />
                <Text className="ml-1 text-sm text-red-700 font-semibold">911</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="flex-row items-center bg-red-100 px-3 py-2 rounded-lg"
                onPress={() => showToast('info', 'Doctor', 'Calling Dr. Johnson...')}
              >
                <Ionicons name="medical" size={16} color="#DC2626" />
                <Text className="ml-1 text-sm text-red-700">Dr. Johnson</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="flex-row items-center bg-red-100 px-3 py-2 rounded-lg"
                onPress={() => showToast('info', 'Hospital', 'Calling hospital...')}
              >
                <Ionicons name="home" size={16} color="#DC2626" />
                <Text className="ml-1 text-sm text-red-700">Hospital</Text>
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