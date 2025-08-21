import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from "../components/config";

const BioDataScreen = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    age: '',
    bmi: '',
    medical_conditions: '',
    previous_pregnancies: '',
    gestational_week: '',
    weight: '',
  });

  const showToast = (type, title, message) => {
    Toast.show({
      type,
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
    });
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Validation helpers
  const isValidAge = (age) => {
    const ageNum = parseInt(age);
    return !isNaN(ageNum) && ageNum >= 15 && ageNum <= 50;
  };

  const isValidBMI = (bmi) => {
    const bmiNum = parseFloat(bmi);
    return !isNaN(bmiNum) && bmiNum >= 10 && bmiNum <= 50;
  };

  const isValidWeight = (weight) => {
    const weightNum = parseFloat(weight);
    return !isNaN(weightNum) && weightNum >= 30 && weightNum <= 200;
  };

  const isValidGestationalWeek = (week) => {
    const weekNum = parseInt(week);
    return !isNaN(weekNum) && weekNum >= 1 && weekNum <= 42;
  };

  const isValidPreviousPregnancies = (pregnancies) => {
    const pregNum = parseInt(pregnancies);
    return !isNaN(pregNum) && pregNum >= 0 && pregNum <= 20;
  };

  const validateForm = () => {
    console.log('=== FORM VALIDATION START ===');
    console.log('Form data:', JSON.stringify(formData, null, 2));
    
    if (!formData.age.trim()) {
      console.log('Validation failed: Age is empty');
      return 'Age is required';
    }
    if (!isValidAge(formData.age)) {
      console.log('Validation failed: Invalid age -', formData.age);
      return 'Please enter a valid age (15-50 years)';
    }
    
    if (!formData.weight.trim()) {
      console.log('Validation failed: Weight is empty');
      return 'Weight is required';
    }
    if (!isValidWeight(formData.weight)) {
      console.log('Validation failed: Invalid weight -', formData.weight);
      return 'Please enter a valid weight (30-200 kg)';
    }
    
    if (!formData.bmi.trim()) {
      console.log('Validation failed: BMI is empty');
      return 'BMI is required';
    }
    if (!isValidBMI(formData.bmi)) {
      console.log('Validation failed: Invalid BMI -', formData.bmi);
      return 'Please enter a valid BMI (10-50)';
    }
    
    if (!formData.previous_pregnancies.trim()) {
      console.log('Validation failed: Previous pregnancies is empty');
      return 'Previous pregnancies count is required';
    }
    if (!isValidPreviousPregnancies(formData.previous_pregnancies)) {
      console.log('Validation failed: Invalid previous pregnancies -', formData.previous_pregnancies);
      return 'Please enter a valid number of previous pregnancies (0-20)';
    }
    
    if (!formData.gestational_week.trim()) {
      console.log('Validation failed: Gestational week is empty');
      return 'Gestational week is required';
    }
    if (!isValidGestationalWeek(formData.gestational_week)) {
      console.log('Validation failed: Invalid gestational week -', formData.gestational_week);
      return 'Please enter a valid gestational week (1-42)';
    }
    
    console.log('Validation passed successfully');
    console.log('=== FORM VALIDATION END ===');
    return null;
  };

  const handleSubmit = async () => {
    console.log('\n=== BIO DATA SUBMISSION START ===');
    console.log('Timestamp:', new Date().toISOString());
    
    const validationError = validateForm();
    if (validationError) {
      console.log('Form validation failed:', validationError);
      showToast('error', 'Validation Error', validationError);
      return;
    }

    setIsLoading(true);

    try {
      console.log('\n--- AUTHENTICATION CHECK ---');
      // Get auth token with error handling
      let token;
      try {
        token = await AsyncStorage.getItem('authToken');
        console.log('Token retrieval status:', token ? 'Success' : 'Not found');
        console.log('Token length:', token ? token.length : 0);
        console.log('Token preview:', token ? `${token.substring(0, 20)}...` : 'null');
      } catch (storageError) {
        console.error('AsyncStorage error when getting token:', storageError);
        throw new Error('Failed to retrieve authentication token from storage');
      }

      if (!token) {
        console.log('No auth token found, redirecting to sign in');
        showToast('error', 'Authentication Error', 'Please log in again');
        router.push('/signin');
        return;
      }

      console.log('\n--- PAYLOAD PREPARATION ---');
      // Server expects strings for most fields based on validation rules
      const payload = {
        age: parseInt(formData.age), // Server expects integer
        bmi: formData.bmi.toString().trim(), // Server expects string
        medical_conditions: formData.medical_conditions.trim() || undefined,
        previous_pregnancies: formData.previous_pregnancies.toString().trim(), // Server expects string
        gestational_week: formData.gestational_week.toString().trim(), // Server expects string
        weight: parseFloat(formData.weight), // Server expects float number
      };
      
      // Remove undefined values to avoid sending null/undefined
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined || payload[key] === null || payload[key] === '') {
          delete payload[key];
        }
      });
      
      console.log('Prepared payload:', JSON.stringify(payload, null, 2));
      console.log('API endpoint:', `${API_BASE_URL}/user-profile`);
      console.log('Request headers will include:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token ? token.substring(0, 20) + '...' : 'null'}`
      });

      console.log('\n--- API REQUEST ---');
      console.log('Making API request...');
      
      const response = await axios.post(`${API_BASE_URL}/auth/user-profile`, payload, {
        timeout: 15000, // Increased timeout
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('\n--- API RESPONSE SUCCESS ---');
      console.log('Response status:', response.status);
      console.log('Response headers:', JSON.stringify(response.headers, null, 2));
      console.log('Response data:', JSON.stringify(response.data, null, 2));

      showToast('success', 'Profile Created', 'Bio data saved successfully');

      Alert.alert(
        'Profile Complete',
        'Your bio data has been saved successfully!',
        [
          {
            text: 'Continue',
            onPress: () => {
              console.log('User chose to continue, navigating to PregnancyProfile');
              try {
                router.replace('/pregnancy-profile');
              } catch (navError) {
                console.error('Navigation error:', navError);
                router.push('./(app)/(tabs)');
              }
            },
          },
        ]
      );

    } catch (error) {
      console.log('\n=== ERROR HANDLING START ===');
      console.error('Bio data submission error:', error);
      
      // Log error details
      if (error.response) {
        console.log('\n--- SERVER ERROR RESPONSE ---');
        console.log('Error status:', error.response.status);
        console.log('Error status text:', error.response.statusText);
        console.log('Error headers:', JSON.stringify(error.response.headers, null, 2));
        console.log('Error data:', JSON.stringify(error.response.data, null, 2));
        console.log('Full error response object keys:', Object.keys(error.response));
        
        const statusCode = error.response.status;
        const errorData = error.response.data;
        
        if (statusCode === 409) {
          console.log('Profile already exists, navigating to PregnancyProfile');
          showToast('info', 'Profile Exists', 'Profile already exists. Continuing to next step.');
          router.push('./(app)/(tabs)');
        } else if (statusCode === 401) {
          console.log('Authentication failed, clearing token and redirecting to sign in');
          try {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('userData');
          } catch (clearError) {
            console.error('Error clearing auth data:', clearError);
          }
          showToast('error', 'Authentication Error', 'Session expired. Please log in again');
          router.push('./signin');
        } else if (statusCode === 422) {
          console.log('Validation error from server');
          const validationMessage = errorData?.message || errorData?.error || 'Please check your data and try again';
          showToast('error', 'Data Validation Error', validationMessage);
        } else if (statusCode >= 500) {
          console.log('Server error detected');
          const serverMessage = errorData?.message || errorData?.error || 'Server temporarily unavailable';
          showToast('error', 'Server Error', `${serverMessage} (${statusCode})`);
        } else {
          console.log('Other HTTP error');
          const errorMessage = errorData?.message || errorData?.error || 'Request failed';
          showToast('error', 'Request Failed', `${errorMessage} (${statusCode})`);
        }
      } else if (error.request) {
        console.log('\n--- NETWORK ERROR ---');
        console.log('Request was made but no response received');
        console.log('Request details:', error.request);
        console.log('Error code:', error.code);
        console.log('Error message:', error.message);
        
        if (error.code === 'ECONNABORTED') {
          showToast('error', 'Request Timeout', 'Request timed out. Please check your connection and try again.');
        } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
          showToast('error', 'Network Error', 'Unable to connect to server. Please check your internet connection.');
        } else {
          showToast('error', 'Connection Error', 'Unable to reach server. Please try again later.');
        }
      } else {
        console.log('\n--- UNEXPECTED ERROR ---');
        console.log('Error during request setup or processing');
        console.log('Error name:', error.name);
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
        
        showToast('error', 'Unexpected Error', error.message || 'Something went wrong. Please try again.');
      }
      
      console.log('=== ERROR HANDLING END ===');
    } finally {
      setIsLoading(false);
      console.log('Bio data submission completed, loading state reset');
      console.log('=== BIO DATA SUBMISSION END ===\n');
    }
  };

  const calculateBMI = () => {
    console.log('BMI calculation requested');
    const weight = parseFloat(formData.weight);
    const age = parseInt(formData.age);
    
    console.log('Weight for BMI calculation:', weight);
    console.log('Age for BMI calculation:', age);
    
    if (weight && age) {
      // Simple BMI estimation based on weight and age (this is a rough estimate)
      // In a real app, you'd want height input for accurate BMI calculation
      const estimatedHeight = age >= 18 ? 1.65 : 1.55; // Rough height estimate
      const bmi = weight / (estimatedHeight * estimatedHeight);
      
      console.log('Estimated height:', estimatedHeight);
      console.log('Calculated BMI:', bmi);
      
      handleInputChange('bmi', bmi.toFixed(1));
      showToast('info', 'BMI Calculated', `Estimated BMI: ${bmi.toFixed(1)}`);
    } else {
      console.log('BMI calculation failed: missing weight or age');
      showToast('error', 'BMI Calculation', 'Please enter weight and age first');
    }
  };

  return (
    <>
      <SafeAreaView className="flex-1 bg-gradient-to-br from-pink-50 to-purple-50">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6" showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View className="relative items-center mt-4 mb-8">
              <TouchableOpacity
                onPress={() => router.back()}
                className="absolute top-0 left-0 p-2 bg-white rounded-full shadow-sm"
              >
                <Ionicons name="arrow-back" size={24} color="#EC4899" />
              </TouchableOpacity>

              <Image
                source={require('../../assets/animation/Motherhood-cuate.png')}
                className="w-32 h-32 p-6 mt-6"
                resizeMode="contain"
              />

              <Text className="mb-2 text-3xl font-bold text-pink-600">Bio Data</Text>
              <Text className="text-base text-center text-gray-600">
                Help us personalize your pregnancy care
              </Text>
            </View>

            <View className="mb-6">
              {/* Age */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-700">Age</Text>
                <View className="flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl">
                  <Ionicons name="calendar-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                  <TextInput
                    className="flex-1 px-4 text-base text-gray-800"
                    placeholder="Enter your age"
                    placeholderTextColor="#A0A0A0"
                    value={formData.age}
                    onChangeText={(text) => handleInputChange('age', text)}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  <Text className="pr-4 text-sm text-gray-500">years</Text>
                </View>
                {formData.age && !isValidAge(formData.age) && (
                  <Text className="mt-1 ml-2 text-xs text-red-500">Please enter a valid age (15-50 years)</Text>
                )}
              </View>

              {/* Weight */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-700">Current Weight</Text>
                <View className="flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl">
                  <Ionicons name="fitness-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                  <TextInput
                    className="flex-1 px-4 text-base text-gray-800"
                    placeholder="Enter your weight"
                    placeholderTextColor="#A0A0A0"
                    value={formData.weight}
                    onChangeText={(text) => handleInputChange('weight', text)}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                  <Text className="pr-4 text-sm text-gray-500">kg</Text>
                </View>
                {formData.weight && !isValidWeight(formData.weight) && (
                  <Text className="mt-1 ml-2 text-xs text-red-500">Please enter a valid weight (30-200 kg)</Text>
                )}
              </View>

              {/* BMI */}
              <View className="mb-5">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-semibold text-gray-700">BMI (Body Mass Index)</Text>
                  <TouchableOpacity
                    onPress={calculateBMI}
                    className="px-3 py-1 bg-pink-100 rounded-full"
                  >
                    <Text className="text-xs font-medium text-pink-600">Estimate</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl">
                  <Ionicons name="analytics-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                  <TextInput
                    className="flex-1 px-4 text-base text-gray-800"
                    placeholder="Enter your BMI"
                    placeholderTextColor="#A0A0A0"
                    value={formData.bmi}
                    onChangeText={(text) => handleInputChange('bmi', text)}
                    keyboardType="decimal-pad"
                    maxLength={4}
                  />
                </View>
                {formData.bmi && !isValidBMI(formData.bmi) && (
                  <Text className="mt-1 ml-2 text-xs text-red-500">Please enter a valid BMI (10-50)</Text>
                )}
              </View>

              {/* Previous Pregnancies */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-700">Previous Pregnancies</Text>
                <View className="flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl">
                  <Ionicons name="people-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                  <TextInput
                    className="flex-1 px-4 text-base text-gray-800"
                    placeholder="Number of previous pregnancies"
                    placeholderTextColor="#A0A0A0"
                    value={formData.previous_pregnancies}
                    onChangeText={(text) => handleInputChange('previous_pregnancies', text)}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                {formData.previous_pregnancies && !isValidPreviousPregnancies(formData.previous_pregnancies) && (
                  <Text className="mt-1 ml-2 text-xs text-red-500">Please enter a valid number (0-20)</Text>
                )}
              </View>

              {/* Gestational Week */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-700">Current Gestational Week</Text>
                <View className="flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl">
                  <Ionicons name="time-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                  <TextInput
                    className="flex-1 px-4 text-base text-gray-800"
                    placeholder="Current week of pregnancy"
                    placeholderTextColor="#A0A0A0"
                    value={formData.gestational_week}
                    onChangeText={(text) => handleInputChange('gestational_week', text)}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  <Text className="pr-4 text-sm text-gray-500">weeks</Text>
                </View>
                {formData.gestational_week && !isValidGestationalWeek(formData.gestational_week) && (
                  <Text className="mt-1 ml-2 text-xs text-red-500">Please enter a valid week (1-42)</Text>
                )}
              </View>

              {/* Medical Conditions */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-semibold text-gray-700">
                  Medical Conditions <Text className="text-gray-400">(Optional)</Text>
                </Text>
                <View className="bg-white border border-pink-100 shadow-sm rounded-2xl">
                  <View className="flex-row items-start p-4">
                    <Ionicons name="medical-outline" size={20} color="#EC4899" style={{ marginTop: 2 }} />
                    <TextInput
                      className="flex-1 ml-3 text-base text-gray-800"
                      placeholder="List any medical conditions, allergies, or medications"
                      placeholderTextColor="#A0A0A0"
                      value={formData.medical_conditions}
                      onChangeText={(text) => handleInputChange('medical_conditions', text)}
                      multiline={true}
                      numberOfLines={4}
                      textAlignVertical="top"
                      style={{ minHeight: 80 }}
                    />
                  </View>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                className={`items-center justify-center h-14 rounded-2xl shadow-lg mb-6 ${
                  !isLoading ? 'bg-pink-600' : 'bg-gray-300'
                }`}
                style={{
                  shadowColor: !isLoading ? '#EC4899' : '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: !isLoading ? 0.3 : 0.1,
                  shadowRadius: 8,
                  elevation: 8,
                }}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text className={`text-lg font-bold ${!isLoading ? 'text-white' : 'text-gray-500'}`}>
                  {isLoading ? 'Saving Profile...' : 'Save Bio Data'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Trust Badge */}
            <View className="items-center pb-4">
              <View className="flex-row items-center px-4 py-2 rounded-full bg-green-50">
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text className="ml-2 text-xs font-medium text-green-700">Your data is secure & confidential</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Toast />
    </>
  );
};

export default BioDataScreen;