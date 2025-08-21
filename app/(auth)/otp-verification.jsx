import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { useAuth } from '../contexts/AuthContext'; // Adjust path as needed
import { API_BASE_URL } from "../components/config";
import { useRouter, useLocalSearchParams } from 'expo-router';

const OtpVerificationScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Extract parameters from search params
  const { sessionToken, phoneNumber, expiresIn, role } = params;
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(parseInt(expiresIn) || 600); // 10 minutes default
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef([]);
  const { login } = useAuth(); // Assuming you have an auth context

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  // Helper function to show toast
  const showToast = (type, title, message) => {
    Toast.show({
      type,
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
    });
  };

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Check if pregnancy profile exists (for mothers)
  const checkPregnancyProfile = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/pregnancy-profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data && response.data.profile;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  };

  const handleChange = (text, index) => {
    if (/^\d$/.test(text) || text === '') {
      const newOtp = [...otp];
      newOtp[index] = text;
      setOtp(newOtp);

      // Move to next input if not the last box
      if (text !== '' && index < 5) {
        inputs.current[index + 1].focus();
      }

      // Move to previous on delete
      if (text === '' && index > 0) {
        inputs.current[index - 1].focus();
      }
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      showToast('error', 'Invalid OTP', 'Please enter the complete 6-digit code');
      return;
    }

    if (!sessionToken) {
      showToast('error', 'Session Error', 'Invalid session. Please try logging in again.');
      router.back();
      return;
    }

    setIsLoading(true);

    try {
      console.log('Verifying OTP...');
      
      const response = await axios.post(
        `${API_BASE_URL}/auth/verify-phone-otp`,
        {
          sessionToken,
          otpCode,
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const { token, user } = response.data;
      console.log('OTP verification successful for user:', user?.phone_number || user?.id);
      
      // Update auth context
      await login(user, token);

      // Handle user role-based navigation
      if (user.role === 'mother') {
        console.log('Mother logging in via phone, checking pregnancy profile...');
        
        try {
          const hasPregnancyProfile = await checkPregnancyProfile(token);
          
          if (!hasPregnancyProfile) {
            console.log('No pregnancy profile found, redirecting to setup');
            showToast('success', 'Welcome!', 'Please complete your pregnancy profile');
            router.push({
              pathname: '/pregnancy-profile-setup',
              params: { isFirstTime: 'true' }
            });
            return;
          }
        } catch (profileError) {
          console.error('Error during pregnancy profile check:', profileError);
          showToast('warning', 'Profile Check Failed', 'Proceeding to dashboard. You can set up your profile later.');
        }
      }

      // Show success toast
      showToast('success', 'Welcome!', 'Phone login successful');
      
      // Navigate to Main using replace to prevent going back
      router.replace('/(tabs)'); // Adjust this path based on your app structure

    } catch (error) {
      console.error('OTP verification error:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      let errorMessage = 'Invalid OTP code. Please try again.';
      
      if (error.response?.status === 400) {
        errorMessage = error.response.data.error || 'Invalid or expired OTP. Please try again.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many verification attempts. Please request a new OTP.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again.';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = 'Network connection error. Please check your internet connection.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      showToast('error', 'Verification Failed', errorMessage);
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      if (inputs.current[0]) {
        inputs.current[0].focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend && timeLeft > 0) {
      showToast('warning', 'Please Wait', `You can resend OTP in ${formatTime(timeLeft)}`);
      return;
    }

    if (!sessionToken) {
      showToast('error', 'Session Error', 'Invalid session. Please try logging in again.');
      router.back();
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/resend-phone-otp`,
        {
          sessionToken,
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      showToast('success', 'OTP Resent', 'A new verification code has been sent to your phone');
      
      // Reset timer
      setTimeLeft(600); // 10 minutes
      setCanResend(false);
      
      // Clear current OTP
      setOtp(['', '', '', '', '', '']);
      if (inputs.current[0]) {
        inputs.current[0].focus();
      }

    } catch (error) {
      console.error('Resend OTP error:', error);
      
      let errorMessage = 'Failed to resend OTP. Please try again.';
      
      if (error.response?.status === 400) {
        errorMessage = error.response.data.error || 'Invalid session. Please try logging in again.';
        // Navigate back if session is invalid
        router.back();
        return;
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many attempts. Please wait before requesting another OTP.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again.';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = 'Network connection error. Please check your internet connection.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      showToast('error', 'Resend Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 mt-4 bg-gradient-to-b from-pink-50 to-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-5">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
          </TouchableOpacity>

          <View className="items-center mb-8">
            <Text className="text-2xl font-bold text-purple-700">Verify OTP</Text>
            <Text className="text-sm text-center text-gray-600">
              Enter the 6-digit code sent to {phoneNumber}
            </Text>
            {timeLeft > 0 && (
              <Text className="mt-2 text-xs text-purple-500">
                Code expires in: {formatTime(timeLeft)}
              </Text>
            )}
            {timeLeft === 0 && (
              <Text className="mt-2 text-xs text-red-500">
                Code has expired. Please request a new one.
              </Text>
            )}
          </View>

          <View className="items-center justify-center">
            <Image
              source={require('../../assets/animation/Deconstructed food-rafiki.png')}
              className="w-48 h-48 p-6 mt-6"
              resizeMode="contain"
            />
          </View>

          <View className="flex-row justify-between mb-6">
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputs.current[index] = ref)}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                keyboardType="numeric"
                maxLength={1}
                className={`w-12 h-12 text-xl text-center text-purple-700 border rounded-lg bg-purple-50 ${
                  digit ? 'border-purple-500' : 'border-purple-200'
                }`}
                editable={!isLoading}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={handleVerifyOtp}
            className={`items-center justify-center h-12 rounded-xl mb-4 ${
              isLoading || otp.join('').length !== 6 
                ? 'bg-gray-300' 
                : 'bg-purple-500'
            }`}
            disabled={isLoading || otp.join('').length !== 6}
          >
            <Text className="text-base font-semibold text-white">
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleResendOtp} 
            className={`items-center py-2 ${
              (!canResend && timeLeft > 0) || isLoading ? 'opacity-50' : ''
            }`}
            disabled={(!canResend && timeLeft > 0) || isLoading}
          >
            <Text className={`text-sm text-center ${
              (!canResend && timeLeft > 0) || isLoading 
                ? 'text-gray-400' 
                : 'text-purple-600'
            }`}>
              {isLoading ? 'Sending...' : 'Resend Code'}
            </Text>
          </TouchableOpacity>

          {timeLeft === 0 && (
            <View className="p-3 mt-4 border border-red-200 rounded-lg bg-red-50">
              <Text className="text-sm text-center text-red-600">
                Your OTP has expired. Please request a new verification code.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Toast component */}
      <Toast />
    </SafeAreaView>
  );
};

export default OtpVerificationScreen;