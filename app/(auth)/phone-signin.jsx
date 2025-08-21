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
import { router } from 'expo-router';

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

  // Get login function from AuthContext
  const { login } = useContext(AuthContext);

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
      type: type, // 'success', 'error', 'info'
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
    });
  };

  const checkPregnancyProfile = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/pregnancy/current`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.pregnancy ? true : false;
    } catch (error) {
      // If 404, user has no pregnancy record
      if (error.response?.status === 404) {
        return false;
      }
      // For other errors, assume profile exists to avoid blocking
      return true;
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
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: formData.email,
        password: formData.password,
      });

      const { token, user } = response.data;
      
      // Store token in AsyncStorage
      await AsyncStorage.setItem('authToken', token);
      
      // Update auth context
      await login(user, token);

      // Check if user has pregnancy profile (only for mothers)
      if (user.role === 'mother') {
        const hasPregnancyProfile = await checkPregnancyProfile(token);
        
        if (!hasPregnancyProfile) {
          showToast('success', 'Welcome!', 'Please complete your pregnancy profile');
          router.push('./pregnancy-profile', { isFirstTime: true });
          return;
        }
      }

      // Show success toast
      showToast('success', 'Welcome Back!', 'Login successful');
      
      // Navigate to Main (which contains the Dashboard)
      router.push('../(app)/(tabs)');

    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to sign in. Please try again.';
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
      // Direct phone login without OTP verification
      const response = await axios.post(`${API_BASE_URL}/auth/phone-login`, {
        phone_number: `${countryCode}${formData.phone}`,
        role: activeTab === 'phone' ? 'provider' : 'patient',
      });

      const { token, user } = response.data;
      
      // Store token in AsyncStorage
      await AsyncStorage.setItem('authToken', token);
      
      // Update auth context
      await login(user, token);

      // Healthcare providers go directly to dashboard
      // Mothers need to check pregnancy profile
      if (user.role === 'mother') {
        const hasPregnancyProfile = await checkPregnancyProfile(token);
        
        if (!hasPregnancyProfile) {
          showToast('success', 'Welcome!', 'Please complete your pregnancy profile');
          router.push('pregnancy-profile', { isFirstTime: true });
          return;
        }
      }

      // Show success toast
      showToast('success', 'Welcome!', 'Phone login successful');
      
      // Navigate to Main (which contains the Dashboard)
      router.push('../(app)/(tabs)');

    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to sign in with phone. Please try again.';
      showToast('error', 'Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Placeholder for Google login implementation
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
                    onPress={() => router.push('password-reset')}
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

            {/* OR Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-purple-200" />
              <Text className="px-3 text-sm text-purple-600 bg-white">OR</Text>
              <View className="flex-1 h-px bg-purple-200" />
            </View>

            {/* Alternative Sign In Options */}
            <View className="space-y-3">
              <TouchableOpacity 
                className="flex-row items-center justify-center h-12 bg-white border-2 border-purple-200 shadow-sm rounded-xl"
                onPress={handleGoogleLogin}
              >
                <Image
                  source={require('../../assets/animation/Motherhood-cuate.png')} // Replace with Google icon
                  className="w-6 h-6 mr-3"
                  resizeMode="contain"
                />
                <Text className="text-base font-semibold text-purple-700">Continue with Google</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-sm text-gray-600">New to MomCare? </Text>
              <TouchableOpacity onPress={() => router.push('./signup')}>
                <Text className="text-sm font-semibold text-purple-600">Create Account</Text>
              </TouchableOpacity>
            </View>

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
      
      {/* Toast Message Component */}
      <Toast />
    </>
  );
};

export default SignInScreen;