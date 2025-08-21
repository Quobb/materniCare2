import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL } from "../components/config";
import { router } from 'expo-router';

const PregnancyProfileSetup = ({ route }) => {
  const { user } = useContext(AuthContext);
  const { isFirstTime = false } = route?.params || {};
  
  // Pregnancy Data
  const [lmpDate, setLmpDate] = useState(new Date());
  const [dueDate, setDueDate] = useState('');
  const [isPregnant, setIsPregnant] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Debug helper
  const logError = (context, error) => {
    console.error(`${context}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        method: error.config?.method,
        url: error.config?.url,
        headers: error.config?.headers,
        data: error.config?.data
      }
    });
  };

  // Enhanced token validation
  const getValidToken = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      console.log('Token exists:', token.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('Token retrieval error:', error);
      throw error;
    }
  };

  // Check and sync any pending pregnancy data
  const checkAndSyncPendingData = async (token) => {
    try {
      const pendingData = await AsyncStorage.getItem('pending_pregnancy_data');
      if (pendingData) {
        const pregnancyData = JSON.parse(pendingData);
        console.log('Found pending pregnancy data:', pregnancyData);
        
        // Try to sync the pending data
        try {
          const response = await axios.post(
            `${API_BASE_URL}/pregnancy`,
            {
              start_date: pregnancyData.start_date,
              due_date: pregnancyData.due_date
            },
            { 
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );
          
          if (response.status === 201) {
            // Successfully synced, remove from storage
            await AsyncStorage.removeItem('pending_pregnancy_data');
            showToast('success', 'Data Synced', 'Your pregnancy data has been synchronized');
          }
        } catch (syncError) {
          console.log('Sync failed, keeping data for later:', syncError.response?.data);
          // Keep the data for next attempt
        }
      }
    } catch (error) {
      console.error('Error checking pending data:', error);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        const token = await getValidToken();
        await checkAndSyncPendingData(token);
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    
    initializeData();
  }, []);

  useEffect(() => {
    // Calculate due date when LMP changes
    if (isPregnant && lmpDate) {
      calculateDueDate();
    }
  }, [lmpDate, isPregnant]);

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

  const calculateDueDate = async () => {
    if (!lmpDate || !isPregnant) return;
    
    setIsCalculating(true);
    try {
      const token = await getValidToken();
      const lmpDateString = lmpDate.toISOString().split('T')[0];
      
      console.log('Calculating due date for LMP:', lmpDateString);
      
      const response = await axios.post(
        `${API_BASE_URL}/pregnancy/calculate-due-date`,
        { lmp_date: lmpDateString },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log('Due date calculation response:', response.data);
      setDueDate(response.data.due_date);
      
      // Calculate current week
      const today = new Date();
      const lmp = new Date(lmpDate);
      const weeksDiff = Math.floor((today - lmp) / (7 * 24 * 60 * 60 * 1000));
      setCurrentWeek(Math.max(0, weeksDiff));
      
    } catch (error) {
      logError('Due date calculation error', error);
      
      // Fallback calculation
      const fallbackDueDate = new Date(lmpDate);
      fallbackDueDate.setDate(fallbackDueDate.getDate() + 280); // 40 weeks
      setDueDate(fallbackDueDate.toISOString().split('T')[0]);
      
      const today = new Date();
      const weeksDiff = Math.floor((today - lmpDate) / (7 * 24 * 60 * 60 * 1000));
      setCurrentWeek(Math.max(0, weeksDiff));
      
      showToast('info', 'Using Estimate', 'Using standard 40-week calculation');
    } finally {
      setIsCalculating(false);
    }
  };

  // ADDED MISSING validateForm FUNCTION (simplified for pregnancy only)
  const validateForm = () => {
    if (isPregnant && !lmpDate) return 'Last Menstrual Period date is required';
    return null;
  };

  // ADDED MISSING handleSaveProfile FUNCTION (pregnancy data only)
  const handleSaveProfile = async () => {
    const validationError = validateForm();
    if (validationError) {
      showToast('error', 'Validation Error', validationError);
      return;
    }

    setIsLoading(true);

    try {
      const token = await getValidToken();
      console.log('Starting pregnancy profile save process...');

      // Create pregnancy record if pregnant
      if (isPregnant && lmpDate) {
        console.log('Creating pregnancy record...');
        
        const pregnancyData = {
          start_date: lmpDate.toISOString().split('T')[0],
          due_date: dueDate || new Date(Date.now() + 280 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        console.log('Pregnancy data to send:', pregnancyData);

        try {
          const pregnancyResponse = await axios.post(
            `${API_BASE_URL}/pregnancy`,
            pregnancyData,
            { 
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 15000
            }
          );

          console.log('Pregnancy creation response:', pregnancyResponse.data);

          if (pregnancyResponse.status === 201) {
            showToast('success', 'Profile Complete!', 'Your pregnancy profile has been created successfully');
          }
        } catch (pregnancyError) {
          console.error('Pregnancy creation failed:', pregnancyError.response?.data);
          
          // Handle specific pregnancy creation errors
          if (pregnancyError.response?.status === 409) {
            // User already has pregnancy record - that's okay
            showToast('info', 'Profile Updated!', 'Your profile has been updated. Pregnancy record already exists.');
          } else if (pregnancyError.response?.status === 500 && pregnancyError.response?.data?.error === 'Database error') {
            // Database error - try with retry
            console.log('Database error detected, attempting retry...');
            await handleDatabaseError(token, pregnancyData);
          } else {
            // Other pregnancy creation errors
            showToast('error', 'Error', 'Pregnancy setup encountered an issue. Please try again.');
          }
        }
      } else {
        showToast('success', 'Profile Updated!', 'Your pregnancy status has been updated successfully');
      }

      // Navigate after success
      setTimeout(() => {
        if (isFirstTime) {
          router.push('./signup-profile');
        } else {
          router.push('./signup-profile');
        }
      }, 1500);

    } catch (error) {
      logError('Save profile error', error);
      
      let errorMessage = 'Failed to save pregnancy profile. Please try again.';
      let errorTitle = 'Save Failed';

      if (error.response) {
        const status = error.response.status;
        const responseData = error.response.data;

        switch (status) {
          case 400:
            errorMessage = responseData?.error || 'Invalid data provided. Please check your inputs.';
            errorTitle = 'Invalid Data';
            break;
          case 401:
            errorMessage = 'Session expired. Please log in again.';
            errorTitle = 'Authentication Error';
            break;
          case 403:
            errorMessage = 'Permission denied. Please contact support.';
            errorTitle = 'Permission Error';
            break;
          case 409:
            errorMessage = 'You already have an active pregnancy record';
            errorTitle = 'Already Exists';
            // Still navigate on 409 as it's not a critical error
            setTimeout(() => {
              if (isFirstTime) {
                router.push('../(app)/(tabs)');
              } else {
                router.back();
              }
            }, 1500);
            break;
          case 422:
            errorMessage = responseData?.error || 'Data validation failed. Please check your inputs.';
            errorTitle = 'Validation Error';
            break;
          case 500:
            if (responseData?.error === 'Database error') {
              errorMessage = 'Database connection issue. Please try again or contact support.';
              errorTitle = 'Database Error';
            } else {
              errorMessage = 'Server error. Please try again later or contact support.';
              errorTitle = 'Server Error';
            }
            break;
          default:
            errorMessage = responseData?.error || `Unexpected error (${status}). Please try again.`;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your internet connection.';
        errorTitle = 'Network Error';
      } else {
        errorMessage = error.message || 'An unexpected error occurred.';
        errorTitle = 'Error';
      }

      showToast('error', errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle database errors with retry logic and local storage fallback
  const handleDatabaseError = async (token, pregnancyData) => {
    try {
      // Wait a moment and try again
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Retrying pregnancy creation...');
      const retryResponse = await axios.post(
        `${API_BASE_URL}/pregnancy`,
        pregnancyData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (retryResponse.status === 201) {
        showToast('success', 'Success!', 'Pregnancy profile created successfully after retry');
      }
    } catch (retryError) {
      console.error('Retry also failed:', retryError);
      
      // Save pregnancy data locally for later sync
      try {
        await AsyncStorage.setItem('pending_pregnancy_data', JSON.stringify({
          ...pregnancyData,
          timestamp: new Date().toISOString()
        }));
        
        showToast('error', 'Saved Locally', 'Pregnancy data will sync when connection improves.');
      } catch (storageError) {
        console.error('Local storage failed:', storageError);
        showToast('error', 'Partial Success', 'Pregnancy setup needs to be completed later');
      }
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <SafeAreaView className="flex-1 mt-4 bg-gradient-to-b from-pink-50 to-white">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView contentContainerStyle={{ padding: 20 }} classNAme="top[10vh]">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              {!isFirstTime && (
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="flex-row items-center"
                >
                  <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
                  <Text className="ml-2 text-base font-medium text-purple-700">Back</Text>
                </TouchableOpacity>
              )}
              <Text className="text-xl font-bold text-purple-700">
                {isFirstTime ? 'Complete Your Profile' : 'Edit Profile'}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Welcome Message */}
            {isFirstTime && (
              <View className="p-4 mb-6 border border-purple-200 bg-purple-50 rounded-xl">
                <Text className="mb-2 text-lg font-semibold text-purple-700">Welcome to MomCare! 🤱</Text>
                <Text className="text-sm text-purple-600">
                  Let's set up your pregnancy profile to provide you with personalized care and tracking.
                </Text>
              </View>
            )}

            {/* Pregnancy Information */}
            <View className="mb-8">
              <Text className="mb-4 text-lg font-semibold text-purple-700">Pregnancy Information</Text>
              
              {/* Pregnancy Status Toggle */}
              <View className="flex-row items-center justify-between p-4 mb-4 border border-purple-200 bg-purple-50 rounded-xl">
                <Text className="text-base font-medium text-purple-700">Currently Pregnant</Text>
                <TouchableOpacity
                  onPress={() => setIsPregnant(!isPregnant)}
                  className={`w-12 h-6 rounded-full ${isPregnant ? 'bg-pink-500' : 'bg-gray-300'}`}
                >
                  <View
                    className={`w-5 h-5 mt-0.5 bg-white rounded-full transform transition-transform ${
                      isPregnant ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </TouchableOpacity>
              </View>

              {isPregnant && (
                <View className="space-y-4">
                  {/* Last Menstrual Period */}
                  <View>
                    <Text className="mb-2 text-sm font-medium text-purple-700">
                      Last Menstrual Period (LMP) *
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      className="flex-row items-center h-12 px-4 border border-purple-200 bg-purple-50 rounded-xl"
                    >
                      <Ionicons name="calendar-outline" size={20} color="#8B5CF6" />
                      <Text className="ml-3 text-base text-purple-700">
                        {formatDate(lmpDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Calculated Due Date */}
                  {dueDate && (
                    <View className="p-4 border border-pink-200 bg-pink-50 rounded-xl">
                      <View className="flex-row items-center mb-2">
                        <MaterialIcons name="child-friendly" size={20} color="#EC4899" />
                        <Text className="ml-2 text-sm font-semibold text-pink-700">
                          Estimated Due Date
                        </Text>
                        {isCalculating && (
                          <Text className="ml-2 text-xs text-pink-500">Calculating...</Text>
                        )}
                      </View>
                      <Text className="text-lg font-bold text-pink-700">
                        {new Date(dueDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                      {currentWeek > 0 && (
                        <Text className="mt-1 text-sm text-pink-600">
                          You are approximately {currentWeek} weeks pregnant
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Date Picker Modal */}
                  {showDatePicker && (
                    <DateTimePicker
                      value={lmpDate}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          setLmpDate(selectedDate);
                        }
                      }}
                    />
                  )}
                </View>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSaveProfile}
              className={`items-center justify-center h-12 ${
                isLoading ? 'bg-gray-300' : 'bg-pink-500'
              } shadow-lg rounded-xl mb-4`}
              disabled={isLoading}
            >
              <Text className="text-base font-semibold text-white">
                {isLoading ? 'Saving Profile...' : isFirstTime ? 'Complete Setup' : 'Save Changes'}
              </Text>
            </TouchableOpacity>

            {/* Skip Button for First Time */}
            {isFirstTime && (
              <TouchableOpacity
                onPress={() => router.push('../(app)/(tabs)')}
                className="items-center py-3"
              >
                <Text className="text-sm text-purple-600 underline">Skip for now</Text>
              </TouchableOpacity>
            )}

            {/* Help Text */}
            <View className="p-3 mt-4 border border-blue-200 bg-blue-50 rounded-xl">
              <Text className="text-xs font-medium text-center text-blue-600">
                Your pregnancy information helps us provide personalized care recommendations and track your journey.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Toast Message Component */}
      <Toast />
    </>
  );
};

export default PregnancyProfileSetup;