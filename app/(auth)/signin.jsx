import React, { useState, useContext } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Animated, { FadeInRight, FadeInLeft } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import CountryCodePicker from '../components/CountryCodePicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../contexts/AuthContext';
import { API_BASE_URL } from "../components/config";
import { useRouter, useLocalSearchParams } from 'expo-router';

const SignInScreen = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('email');
  const [isLoading, setIsLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
  });
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get login function from AuthContext
  const { login } = useContext(AuthContext);

  // AsyncStorage helper functions with null/undefined checks
  const storeUserData = async (userData) => {
    try {
      if (userData && typeof userData === 'object') {
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
        console.log('User data stored successfully');
      } else {
        console.warn('No valid user data to store');
      }
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  };

  const storeAuthToken = async (token) => {
    try {
      if (token && typeof token === 'string') {
        await AsyncStorage.setItem('auth_token', token);
        console.log('Auth token stored successfully');
      } else {
        console.warn('No valid auth token to store');
      }
    } catch (error) {
      console.error('Error storing auth token:', error);
    }
  };

  const storeUserSession = async (sessionData) => {
    try {
      if (sessionData && typeof sessionData === 'object') {
        await AsyncStorage.setItem('user_session', JSON.stringify({
          ...sessionData,
          loginTime: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }));
        console.log('User session stored successfully');
      } else {
        console.warn('No valid session data to store');
      }
    } catch (error) {
      console.error('Error storing user session:', error);
    }
  };

  const storePregnancyProfile = async (pregnancyData) => {
    try {
      if (pregnancyData && typeof pregnancyData === 'object') {
        await AsyncStorage.setItem('pregnancy_profile', JSON.stringify(pregnancyData));
        console.log('Pregnancy profile stored successfully');
      } else {
        console.warn('No valid pregnancy profile to store');
      }
    } catch (error) {
      console.error('Error storing pregnancy profile:', error);
    }
  };

  const storeUserPreferences = async (preferences) => {
    try {
      if (preferences && typeof preferences === 'object') {
        await AsyncStorage.setItem('user_preferences', JSON.stringify(preferences));
        console.log('User preferences stored successfully');
      } else {
        console.warn('No valid preferences to store');
      }
    } catch (error) {
      console.error('Error storing user preferences:', error);
    }
  };

  const storeUserProfile = async (profileData) => {
    try {
      if (profileData && typeof profileData === 'object') {
        await AsyncStorage.setItem('user_profile', JSON.stringify(profileData));
        console.log('User profile stored successfully');
      } else {
        console.warn('No valid user profile to store');
      }
    } catch (error) {
      console.error('Error storing user profile:', error);
    }
  };

  // Clear all stored data on logout (for future use)
  const clearStoredData = async () => {
    try {
      await AsyncStorage.multiRemove([
        'user_data',
        'auth_token',
        'user_session',
        'pregnancy_profile',
        'user_preferences',
        'user_profile'
      ]);
      console.log('All stored data cleared');
    } catch (error) {
      console.error('Error clearing stored data:', error);
    }
  };

  const handleSwitchTab = (tab) => setActiveTab(tab);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateEmailForm = () => {
    if (!formData.email) return 'Email is required';
    if (!formData.password) return 'Password is required';
    return null;
  };

  const validatePhoneForm = () => {
    if (!formData.phone || formData.phone.trim().length < 8) return 'Valid phone number is required';
    return null;
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

  // New function to check user profile
  const checkUserProfile = async (token, retryCount = 0) => {
    const maxRetries = 2;
    
    try {
      console.log('Checking user profile...');
      
      const response = await axios.get(`${API_BASE_URL}/user-profile/me`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000,
      });
      
      console.log('User profile response:', response.data);
      
      // Store user profile data if available
      if (response.data && response.data.profile) {
        await storeUserProfile(response.data.profile);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('User profile check error:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });

      // Handle 404 - No user profile found (user needs to create one)
      if (error.response?.status === 404) {
        console.log('No user profile found (404) - user needs to create bio-data');
        return false;
      }
      
      // Handle server errors (500) with retry logic
      if (error.response?.status >= 500 && retryCount < maxRetries) {
        console.log(`Server error, retrying... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return checkUserProfile(token, retryCount + 1);
      }
      
      // After retries exhausted, assume no profile exists (better UX)
      if (error.response?.status >= 500) {
        console.log('Server error persists - assuming no profile exists, requiring bio-data setup');
        showToast('info', 'Setup Required', 'Please complete your profile to continue');
        return false;
      }
      
      // Handle network errors - assume no profile
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        console.log('Network error - assuming no profile exists');
        showToast('warning', 'Connection Issue', 'Unable to verify profile. You can set it up now.');
        return false;
      }
      
      // Handle timeout errors - assume no profile
      if (error.code === 'ECONNABORTED') {
        console.log('Request timeout - assuming no profile exists');
        showToast('warning', 'Slow Connection', 'Taking longer than expected. You can set up your profile now.');
        return false;
      }
      
      // For any other errors, assume no profile to be safe
      console.log('Unknown error - assuming no profile exists');
      return false;
    }
  };

  const checkPregnancyProfile = async (token, retryCount = 0) => {
    const maxRetries = 2;
    
    try {
      console.log('Checking pregnancy profile...');
      
      const response = await axios.get(`${API_BASE_URL}/pregnancy/current`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000,
      });
      
      console.log('Pregnancy profile response:', response.data);
      
      // Store pregnancy profile data if available
      if (response.data && response.data.pregnancy) {
        await storePregnancyProfile(response.data.pregnancy);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Pregnancy profile check error:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });

      // Handle 404 - No pregnancy profile found (this is expected for new users)
      if (error.response?.status === 404) {
        console.log('No pregnancy profile found (404) - user needs to create one');
        return false;
      }
      
      // Handle server errors (500) with retry logic
      if (error.response?.status >= 500 && retryCount < maxRetries) {
        console.log(`Server error, retrying... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return checkPregnancyProfile(token, retryCount + 1);
      }
      
      // After retries exhausted, assume no profile exists (better UX)
      if (error.response?.status >= 500) {
        console.log('Server error persists - assuming no profile exists, allowing setup');
        showToast('info', 'Setup Required', 'Please set up your pregnancy profile to continue');
        return false;
      }
      
      // Handle network errors - assume no profile
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        console.log('Network error - assuming no profile exists');
        showToast('warning', 'Connection Issue', 'Unable to verify profile. You can set it up now.');
        return false;
      }
      
      // Handle timeout errors - assume no profile
      if (error.code === 'ECONNABORTED') {
        console.log('Request timeout - assuming no profile exists');
        showToast('warning', 'Slow Connection', 'Taking longer than expected. You can set up your profile now.');
        return false;
      }
      
      // For any other errors, assume no profile to be safe
      console.log('Unknown error - assuming no profile exists');
      return false;
    }
  };

  const handleEmailLogin = async () => {
    const validationError = validateEmailForm();
    if (validationError) {
      showToast('error', 'Validation Error', validationError);
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting email login...');
      
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        {
          email: formData.email,
          password: formData.password,
        },
        {
          timeout: 15000, // 15 second timeout for login
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Add comprehensive response logging
      console.log('Full login response:', JSON.stringify(response.data, null, 2));
      
      // Handle different possible response structures
      let user, token;
      
      if (response.data) {
        // Check for your API's specific response pattern first
        if (response.data.data && response.data.data.token && response.data.data.user) {
          token = response.data.data.token;
          user = response.data.data.user;
        }
        // Check for common response patterns
        else if (response.data.token && response.data.user) {
          token = response.data.token;
          user = response.data.user;
        } else if (response.data.access_token && response.data.user) {
          token = response.data.access_token;
          user = response.data.user;
        } else if (response.data.token && response.data.data) {
          token = response.data.token;
          user = response.data.data;
        } else if (response.data.accessToken && response.data.user) {
          token = response.data.accessToken;
          user = response.data.user;
        } else if (response.data.jwt && response.data.user) {
          token = response.data.jwt;
          user = response.data.user;
        } else if (response.data.authToken && response.data.userInfo) {
          token = response.data.authToken;
          user = response.data.userInfo;
        } else {
          // If structure is unexpected, log it and show an error
          console.error('Unexpected response structure:', response.data);
          throw new Error('Invalid response format from server');
        }
      } else {
        throw new Error('Empty response from server');
      }

      // Validate that we have both token and user
      if (!token || !user) {
        console.error('Missing required data - token:', !!token, 'user:', !!user);
        throw new Error('Incomplete login response from server');
      }

      console.log('Login successful for user:', user?.email || user?.id || 'unknown');
      
      // Store user data and auth token in AsyncStorage
      await storeUserData(user);
      await storeAuthToken(token);
      
      // Store user session data
      await storeUserSession({
        userId: user.id || user._id || user.user_id,
        email: user.email,
        role: user.role || 'mother',
        loginMethod: 'email'
      });

      // Store user preferences (if available in response)
      if (response.data.preferences) {
        await storeUserPreferences(response.data.preferences);
      } else {
        // Store default preferences
        await storeUserPreferences({
          theme: 'light',
          notifications: true,
          language: 'en',
          reminders: true
        });
      }
      
      // Update auth context
      await login(user, token);

      // NEW: Check if user has basic profile data first
      console.log('Checking user profile data...');
      
      try {
        const hasUserProfile = await checkUserProfile(token);
        
        if (!hasUserProfile) {
          console.log('No user profile found, redirecting to bio-data setup');
          showToast('success', 'Welcome!', 'Please complete your profile information');
          router.push('(auth)/bio-data');
          return;
        }
        
        console.log('User profile exists, checking additional requirements...');
      } catch (profileError) {
        console.error('Error during user profile check:', profileError);
        // If profile check fails, route to bio-data to be safe
        showToast('warning', 'Profile Setup Required', 'Please complete your profile setup');
        router.push('(auth)/bio-data');
        return;
      }

      // Check if user has pregnancy profile (only for mothers and only after basic profile exists)
      if (user.role === 'mother' || !user.role) { // Default to mother if role is undefined
        console.log('User is a mother, checking pregnancy profile...');
        
        try {
          const hasPregnancyProfile = await checkPregnancyProfile(token);
          
          if (!hasPregnancyProfile) {
            console.log('No pregnancy profile found, redirecting to setup');
            showToast('success', 'Welcome!', 'Please complete your pregnancy profile');
            router.push('PregnancyProfileSetup', { isFirstTime: true });
            return;
          }
          
          console.log('Pregnancy profile exists, proceeding to dashboard');
        } catch (pregnancyProfileError) {
          console.error('Error during pregnancy profile check:', pregnancyProfileError);
          // Continue to dashboard even if pregnancy profile check fails
          showToast('warning', 'Profile Check Failed', 'Proceeding to dashboard. You can set up your profile later.');
        }
      }

      // Show success toast
      showToast('success', 'Welcome Back!', 'Login successful');
      
      // Navigate to Main (which contains the Dashboard)
      router.push('../(app)/(tabs)');

    } catch (error) {
      console.error('Login error:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
        fullError: error
      });
      
      let errorMessage = 'Failed to sign in. Please try again.';
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Account not found. Please check your email or sign up.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server is temporarily unavailable. Please try again in a moment.';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = 'Network connection error. Please check your internet connection.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message === 'Invalid response format from server') {
        errorMessage = 'Server response format error. Please try again or contact support.';
      } else if (error.message === 'Incomplete login response from server') {
        errorMessage = 'Login data incomplete. Please try again or contact support.';
      }
      
      showToast('error', 'Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneLogin = async () => {
    const validationError = validatePhoneForm();
    if (validationError) {
      showToast('error', 'Validation Error', validationError);
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting phone login...');
      
      const response = await axios.post(
        `${API_BASE_URL}/auth/phone-login`,
        {
          phone_number: `${countryCode}${formData.phone}`,
          role: 'provider',
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Phone login response:', JSON.stringify(response.data, null, 2));

      const { sessionToken, expiresIn, phone_number, user } = response.data;
      console.log('OTP sent successfully to:', phone_number);
      
      // Store temporary session data for phone login
      await AsyncStorage.setItem('temp_phone_session', JSON.stringify({
        sessionToken,
        phoneNumber: phone_number,
        expiresIn,
        role: 'provider',
        timestamp: new Date().toISOString()
      }));

      // If user data is available, store it
      if (user) {
        await storeUserData(user);
        await storeUserSession({
          userId: user.id || user._id || user.user_id,
          phone: user.phone,
          role: user.role || 'provider',
          loginMethod: 'phone'
        });
      }
      
      showToast('success', 'OTP Sent', 'Please check your phone for the verification code');
      
      // Navigate to OTP verification screen with the session token
      router.push('../(auth)/otp-verification', {
        sessionToken,
        phoneNumber: phone_number,
        expiresIn,
        role: 'provider'
      });

    } catch (error) {
      console.error('Phone login error:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
        fullError: error
      });
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (error.response?.status === 404) {
        errorMessage = 'No account found with this phone number. Please sign up first.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid credentials for the specified role.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many attempts. Please wait before trying again.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server is temporarily unavailable. Please try again in a moment.';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = 'Network connection error. Please check your internet connection.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      showToast('error', 'Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    showToast('info', 'Coming Soon', 'Google login will be available soon');
  };

  return (
    <>
      <SafeAreaView className="flex-1 mt-4 bg-gradient-to-b from-pink-50 to-white">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-5">
            {/* Header */}
            <View className="relative items-center mb-6">
              <TouchableOpacity onPress={() => router.back()} className="absolute top-0 left-0 p-2">
                <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
              </TouchableOpacity>

              <Image
                source={require('../../assets/animation/Motherhood-cuate.png')}
                className="w-32 h-32 p-6 mt-6"
                resizeMode="contain"
              />
              <Text className="text-2xl font-bold text-purple-700">Welcome to MomCare</Text>
              <Text className="text-sm text-center text-gray-600">Your trusted maternity companion</Text>
              <Text className="mt-1 text-xs text-gray-500">Sign in to continue your journey</Text>
            </View>

            {/* User Type Selector */}
            <View className="items-center mb-4">
              <View className="flex-row justify-between w-64 p-1 bg-purple-100 rounded-full">
                <TouchableOpacity
                  onPress={() => handleSwitchTab('email')}
                  className={`px-4 py-2 rounded-full ${activeTab === 'email' ? 'bg-purple-600' : ''}`}
                >
                  <Text
                    className={`font-semibold text-xs ${
                      activeTab === 'email' ? 'text-white' : 'text-purple-700'
                    }`}
                  >
                    Sign in with Email
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSwitchTab('phone')}
                  className={`px-4 py-2 rounded-full ${activeTab === 'phone' ? 'bg-purple-600' : ''}`}
                >
                  <Text
                    className={`font-semibold text-xs ${
                      activeTab === 'phone' ? 'text-white' : 'text-purple-700'
                    }`}
                  >
                    Sign in with Phone
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Form Section */}
            {activeTab === 'email' ? (
              <Animated.View entering={FadeInLeft.duration(300)} className="mb-5 space-y-5">
                <View className="p-5 bg-white border border-purple-100 shadow-sm rounded-2xl">
                  <Text className="mb-4 text-lg font-semibold text-purple-700">Mother's Account</Text>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-medium text-purple-700">Email Address</Text>
                    <View className="flex-row items-center h-12 border border-purple-200 bg-purple-50 rounded-xl">
                      <Ionicons name="mail-outline" size={20} color="#8B5CF6" className="ml-3" />
                      <TextInput
                        className="flex-1 px-4 text-base text-purple-700"
                        placeholder="Enter your email"
                        placeholderTextColor="#A78BFA"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={formData.email}
                        onChangeText={(text) => handleInputChange('email', text)}
                      />
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-medium text-purple-700">Password</Text>
                    <View className="flex-row items-center h-12 border border-purple-200 bg-purple-50 rounded-xl">
                      <Ionicons name="lock-closed-outline" size={20} color="#8B5CF6" className="ml-3" />
                      <TextInput
                        className="flex-1 px-4 text-base text-purple-700"
                        placeholder="Enter your password"
                        placeholderTextColor="#A78BFA"
                        secureTextEntry={!showPassword}
                        value={formData.password}
                        onChangeText={(text) => handleInputChange('password', text)}
                      />
                      <TouchableOpacity className="p-2" onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons
                          name={showPassword ? 'eye' : 'eye-off'}
                          size={20}
                          color="#8B5CF6"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleEmailLogin}
                    className={`items-center justify-center h-12 mt-4 ${
                      isLoading ? 'bg-gray-300' : 'bg-pink-500'
                    } shadow-lg rounded-xl`}
                    disabled={isLoading}
                  >
                    <Text className="text-base font-semibold text-white">
                      {isLoading ? 'Signing In...' : 'Sign In as Mother'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push('PasswordReset')}
                    className="mt-3"
                  >
                    <Text className="text-sm text-center text-purple-600">Forgot Password?</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInRight.duration(300)} className="space-y-6">
                <View className="p-5 bg-white border border-purple-100 shadow-sm rounded-2xl">
                  <Text className="mb-4 text-lg font-semibold text-purple-700">Healthcare Provider</Text>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-semibold text-purple-700">Professional Phone Number</Text>
                    <View className="flex-row items-center">
                      <CountryCodePicker
                        selectedValue={countryCode}
                        onValueChange={setCountryCode}
                        style={{ width: 110 }}
                      />
                      <View className="flex-row items-center flex-1 h-12 ml-2 border border-purple-200 bg-purple-50 rounded-xl">
                        <Ionicons name="call-outline" size={20} color="#8B5CF6" className="ml-3" />
                        <TextInput
                          className="flex-1 px-4 text-base text-purple-700"
                          placeholder="Enter phone number"
                          placeholderTextColor="#A78BFA"
                          keyboardType="phone-pad"
                          value={formData.phone}
                          onChangeText={(text) => handleInputChange('phone', text)}
                        />
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handlePhoneLogin}
                    className={`items-center justify-center h-12 mt-4 ${
                      isLoading ? 'bg-gray-300' : 'bg-purple-500'
                    } shadow-lg rounded-xl`}
                    disabled={isLoading}
                  >
                    <Text className="text-base font-semibold text-white">
                      {isLoading ? 'Signing In...' : 'Sign In as Provider'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* Emergency Contact */}
            <View className="p-3 mt-4 border border-red-200 bg-red-50 rounded-xl">
              <Text className="text-xs font-medium text-center text-red-600">
                Emergency? Call 911 or your healthcare provider immediately
              </Text>
            </View>

            {/* Privacy Notice */}
            <Text className="px-4 mt-4 text-xs text-center text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy.
              Your health information is protected under HIPAA.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      <Toast />
    </>
  );
};

export default SignInScreen;