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
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CountryCodePicker from '../components/CountryCodePicker';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL } from "../components/config";
import { useRouter, useLocalSearchParams } from 'expo-router';

const SignupScreen = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    dueDate: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
   const router = useRouter();
    const params = useLocalSearchParams();

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

  // Helpers
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = (password) => password.length >= 8;
  const isValidPhone = (phone) => /^[0-9]{10,15}$/.test(phone.replace(/\D/g, ''));

  const formatDate = (date) => {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  };

  const formatDisplayDate = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return 'Full name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!isValidEmail(formData.email)) return 'Please enter a valid email address';
    if (!formData.phone.trim()) return 'Phone number is required';
    if (!isValidPhone(formData.phone)) return 'Please enter a valid phone number';
    if (!formData.password) return 'Password is required';
    if (!isValidPassword(formData.password)) return 'Password must be at least 8 characters long';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    if (!acceptedTerms) return 'You must accept the Terms of Service and Privacy Policy';
    return null;
  };

  // Enhanced AsyncStorage operations with better error handling
  const saveToAsyncStorage = async (key, value) => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, stringValue);
      console.log(`Successfully saved ${key} to AsyncStorage`);
      return true;
    } catch (error) {
      console.error(`Failed to save ${key} to AsyncStorage:`, error);
      // Try to provide more specific error information
      if (error.message.includes('quota')) {
        showToast('error', 'Storage Error', 'Device storage is full. Please free up space and try again.');
      } else if (error.message.includes('security')) {
        showToast('error', 'Security Error', 'Unable to save data securely. Please check app permissions.');
      } else {
        showToast('error', 'Storage Error', 'Failed to save login data. You may need to sign in again later.');
      }
      return false;
    }
  };

  const clearAsyncStorage = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      console.log('Cleared previous auth data');
    } catch (error) {
      console.error('Failed to clear AsyncStorage:', error);
      // Don't show error to user as this is cleanup
    }
  };

  const handleSignup = async () => {
    const validationError = validateForm();
    if (validationError) {
      showToast('error', 'Validation Error', validationError);
      return;
    }

    setIsLoading(true);

    try {
      // Clear any existing auth data first
      await clearAsyncStorage();

      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        full_name: formData.fullName.trim(),
        phone_number: `+233${formData.phone.replace(/\D/g, '')}`,
        role: 'mother',
        date_of_birth: formatDate(formData.dueDate),
      };

      console.log('Attempting signup with payload:', { ...payload, password: '[HIDDEN]' });

      const response = await axios.post(`${API_BASE_URL}/auth/register`, payload, {
        timeout: 15000, // Increased timeout
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      console.log('Signup response received:', response.status);
      console.log('Response data structure:', Object.keys(response.data || {}));
      console.log('Full response data:', response.data);

      // More flexible response structure validation
      if (!response.data) {
        throw new Error('No data received from server');
      }

      // Handle different possible response structures
      let token, user;
      
      // Check for direct token/user properties
      if (response.data.token && response.data.user) {
        token = response.data.token;
        user = response.data.user;
      }
      // Check for nested data object
      else if (response.data.data && response.data.data.token && response.data.data.user) {
        token = response.data.data.token;
        user = response.data.data.user;
      }
      // Check for access_token instead of token
      else if (response.data.access_token && response.data.user) {
        token = response.data.access_token;
        user = response.data.user;
      }
      // Check for just user data (some APIs don't return token immediately)
      else if (response.data.user || response.data.data) {
        user = response.data.user || response.data.data;
        token = response.data.token || response.data.access_token || 'temp_token_' + Date.now();
        console.log('No token in response, using temporary token');
      }
      else {
        console.error('Unexpected response structure:', response.data);
        throw new Error('Server response missing required authentication data');
      }

      // Validate token if we have one
      if (token && (typeof token !== 'string' || token.length < 5)) {
        console.warn('Token seems invalid:', typeof token, token?.length);
        throw new Error('Invalid authentication token format');
      }

      // Validate user data more flexibly
      if (!user || (typeof user !== 'object')) {
        console.error('Invalid user data:', user);
        throw new Error('Invalid user data received from server');
      }

      console.log('Extracted token length:', token?.length);
      console.log('User data keys:', Object.keys(user || {}));

      console.log('Attempting to save auth data...');

      // Save to AsyncStorage with error handling
      const tokenSaved = await saveToAsyncStorage('authToken', token);
      const userSaved = await saveToAsyncStorage('userData', user);

      if (!tokenSaved || !userSaved) {
        // Even if storage fails, we can still proceed but warn the user
        showToast('warning', 'Warning', 'Account created but login data not saved. You may need to sign in again.');
      } else {
        showToast('success', 'Success', 'Registration successful!');
      }

      Alert.alert(
        'Welcome to Maternicare!',
        'Your account has been created successfully. Let\'s complete your profile.',
        [
          {
            text: 'Continue',
            onPress: () => {
                try {
                router.replace("./bio-data"); // Expo Router way
                } catch (navError) {
                console.error("Router  error:", navError);
                router.push("./bio-data");
                }
            },
          },
        ],
        { cancelable: false }
      );

    } catch (error) {
      console.error('Signup error:', error);
      
      if (error.response) {
        // Server responded with error status
        const statusCode = error.response.status;
        const errorData = error.response.data;
        
        console.error('Server error response:', statusCode, errorData);
        
        if (statusCode === 409 || (errorData && errorData.error && errorData.error.includes('already exists'))) {
          showToast('error', 'Account Exists', 'An account with this email already exists. Please sign in instead.');
        } else if (statusCode === 400) {
          showToast('error', 'Invalid Data', errorData?.error || 'Please check your information and try again.');
        } else if (statusCode >= 500) {
          showToast('error', 'Server Error', 'Our servers are temporarily unavailable. Please try again later.');
        } else {
          showToast('error', 'Signup Failed', errorData?.error || 'Unable to create account. Please try again.');
        }
      } else if (error.request) {
        // Network error
        console.error('Network error:', error.request);
        showToast('error', 'Connection Error', 'Unable to connect to our servers. Please check your internet connection and try again.');
      } else if (error.code === 'ECONNABORTED') {
        // Timeout error
        showToast('error', 'Timeout', 'Request timed out. Please check your connection and try again.');
      } else {
        // Other error
        console.error('Unexpected error:', error.message);
        showToast('error', 'Unexpected Error', error.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
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

              <TouchableOpacity
                className="absolute top-0 right-0 p-2"
                onPress={() => router.push('./signin')}
              >
                <Text className="text-sm font-semibold text-pink-600">Sign In</Text>
              </TouchableOpacity>

              <Image
                source={require('../../assets/animation/Motherhood-cuate.png')}
                className="w-32 h-32 p-6 mt-6"
                resizeMode="contain"
              />

              <Text className="mb-2 text-3xl font-bold text-pink-600">Join Maternicare</Text>
              <Text className="text-base text-center text-gray-600">
                Start your pregnancy journey with expert care
              </Text>
            </View>

            <View className="mb-6">
              {/* Full Name */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-700">Full Name</Text>
                <View className="flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl">
                  <Ionicons name="person-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                  <TextInput
                    className="flex-1 px-4 text-base text-gray-800"
                    placeholder="Enter your full name"
                    placeholderTextColor="#A0A0A0"
                    value={formData.fullName}
                    onChangeText={(text) => handleInputChange('fullName', text)}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-700">Email Address</Text>
                <View className="flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl">
                  <Ionicons name="mail-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                  <TextInput
                    className="flex-1 px-4 text-base text-gray-800"
                    placeholder="Enter your email"
                    placeholderTextColor="#A0A0A0"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={formData.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                  />
                </View>
                {formData.email && !isValidEmail(formData.email) && (
                  <Text className="mt-1 ml-2 text-xs text-red-500">Please enter a valid email address</Text>
                )}
              </View>

              {/* Phone Number */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-700">Phone Number</Text>
                <View className="flex-row items-center">
                  <View className="mr-3 bg-white border border-pink-100 shadow-sm rounded-2xl">
                    <CountryCodePicker selectedValue={countryCode} onValueChange={setCountryCode} style={{ width: 100, height: 56 }} />
                  </View>
                  <View className="flex-row items-center flex-1 bg-white border border-pink-100 shadow-sm h-14 rounded-2xl">
                    <Ionicons name="call-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                    <TextInput
                      className="flex-1 px-4 text-base text-gray-800"
                      placeholder="Enter phone number"
                      placeholderTextColor="#A0A0A0"
                      keyboardType="phone-pad"
                      value={formData.phone}
                      onChangeText={(text) => handleInputChange('phone', text)}
                    />
                  </View>
                </View>
                {formData.phone && !isValidPhone(formData.phone) && (
                  <Text className="mt-1 ml-2 text-xs text-red-500">Please enter a valid phone number</Text>
                )}
              </View>

              {/* Due Date */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-700">
                  Expected Due Date <Text className="text-gray-400">(Optional)</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className="flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl px-4"
                >
                  <Ionicons name="calendar-outline" size={20} color="#EC4899" />
                  <Text className="ml-3 text-base text-gray-800">
                    {formData.dueDate ? formatDisplayDate(formData.dueDate) : 'Select your due date'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={formData.dueDate ? new Date(formData.dueDate) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) handleInputChange('dueDate', selectedDate);
                    }}
                  />
                )}
              </View>

              {/* Password */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-700">Password</Text>
                <View className="flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl">
                  <Ionicons name="lock-closed-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                  <TextInput
                    className="flex-1 px-4 text-base text-gray-800"
                    placeholder="Create a strong password"
                    placeholderTextColor="#A0A0A0"
                    secureTextEntry={!showPassword}
                    value={formData.password}
                    onChangeText={(text) => handleInputChange('password', text)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity className="pr-4" onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color="#A0A0A0" />
                  </TouchableOpacity>
                </View>
                {formData.password && !isValidPassword(formData.password) && (
                  <Text className="mt-1 ml-2 text-xs text-red-500">Password must be at least 8 characters long</Text>
                )}
              </View>

              {/* Confirm Password */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-semibold text-gray-700">Confirm Password</Text>
                <View className="flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl">
                  <Ionicons name="lock-closed-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                  <TextInput
                    className="flex-1 px-4 text-base text-gray-800"
                    placeholder="Confirm your password"
                    placeholderTextColor="#A0A0A0"
                    secureTextEntry={!showConfirmPassword}
                    value={formData.confirmPassword}
                    onChangeText={(text) => handleInputChange('confirmPassword', text)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity className="pr-4" onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color="#A0A0A0" />
                  </TouchableOpacity>
                </View>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <Text className="mt-1 ml-2 text-xs text-red-500">Passwords do not match</Text>
                )}
              </View>

              {/* Terms */}
              <TouchableOpacity className="flex-row items-start mb-6" onPress={() => setAcceptedTerms(!acceptedTerms)}>
                <View
                  className={`w-5 h-5 rounded border-2 mr-3 mt-0.5 ${
                    acceptedTerms ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                  }`}
                >
                  {acceptedTerms && <Ionicons name="checkmark" size={12} color="white" style={{ alignSelf: 'center', marginTop: 1 }} />}
                </View>
                <Text className="flex-1 text-sm leading-5 text-gray-600">
                  I agree to the{' '}
                  <Text className="font-semibold text-pink-600">Terms of Service</Text> and{' '}
                  <Text className="font-semibold text-pink-600">Privacy Policy</Text> and consent to health data processing.
                </Text>
              </TouchableOpacity>

              {/* Sign Up Button */}
              <TouchableOpacity
                className={`items-center justify-center h-14 rounded-2xl shadow-lg mb-6 ${
                  acceptedTerms && !isLoading ? 'bg-pink-600' : 'bg-gray-300'
                }`}
                style={{
                  shadowColor: acceptedTerms && !isLoading ? '#EC4899' : '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: acceptedTerms && !isLoading ? 0.3 : 0.1,
                  shadowRadius: 8,
                  elevation: 8,
                }}
                onPress={handleSignup}
                disabled={!acceptedTerms || isLoading}
              >
                <Text className={`text-lg font-bold ${acceptedTerms && !isLoading ? 'text-white' : 'text-gray-500'}`}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              {/* OR separator */}
              <View className="flex-row items-center mb-6">
                <View className="flex-1 h-px bg-gray-200" />
                <Text className="px-4 text-sm text-gray-500">OR</Text>
                <View className="flex-1 h-px bg-gray-200" />
              </View>
            </View>

            {/* Bottom Sign In */}
            <View className="flex-row justify-center pb-6 mt-6">
              <Text className="text-sm text-gray-600">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('./signin')}>
                <Text className="text-sm font-bold text-pink-600">Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Trust Badge */}
            <View className="items-center pb-4">
              <View className="flex-row items-center px-4 py-2 rounded-full bg-green-50">
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text className="ml-2 text-xs font-medium text-green-700">HIPAA Compliant & Secure</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Toast />
    </>
  );
};

export default SignupScreen;