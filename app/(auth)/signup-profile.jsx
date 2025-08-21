import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from "../components/config";
import { router } from 'expo-router';
const SignupProfileScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
   
  });
  const [originalData, setOriginalData] = useState({});

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
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone) => /^[0-9]{10,15}$/.test(phone.replace(/\D/g, ''));

  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!isValidEmail(formData.email)) return 'Please enter a valid email address';
    if (!formData.phone.trim()) return 'Phone number is required';
    if (!isValidPhone(formData.phone)) return 'Please enter a valid phone number';
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showToast('error', 'Authentication Error', 'Please log in again');
        router.push('./signin');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        timeout: 10000,
        headers: { 
          'Authorization': `Bearer ${token}`
        },
      });

      // Fix: Handle different API response structures
      const user = response.data.data?.user || response.data.user || response.data;
      const userData = {
        name: user.full_name || user.name || '',
        email: user.email || '',
        phone: user.phone_number || user.phone || '',
        role: user.role || '',
        date_of_birth: user.date_of_birth || '',
        created_at: user.created_at || '',
        two_factor_enabled: user.two_factor_enabled || false,
      };

      setFormData(userData);
      setOriginalData(userData);
      setProfileImage(user.profile_image);

    } catch (error) {
      console.error('Profile load error:', error);
      if (error.response?.status === 401) {
        showToast('error', 'Authentication Error', 'Please log in again');
        router.push('./signin');
      } else if (error.response?.data) {
        showToast('error', 'Error', error.response.data.message || 'Failed to load profile');
      } else if (error.request) {
        showToast('error', 'Network Error', 'Please check your connection');
      } else {
        showToast('error', 'Error', 'Failed to load profile');
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const selectImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera roll permissions are needed to select an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setProfileImage(imageUri);
      }
    } catch (error) {
      console.error('Image selection error:', error);
      showToast('error', 'Error', 'Failed to select image');
    }
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      showToast('error', 'Validation Error', validationError);
      return;
    }

    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showToast('error', 'Authentication Error', 'Please log in again');
        router.push('../(app)/(tabs)');
        return;
      }

      // Prepare update payload - only include changed fields
      const updatePayload = {};
      if (formData.name !== originalData.name) {
        // Fix: Use correct field name that API expects
        updatePayload.full_name = formData.name.trim();
      }
      if (formData.email !== originalData.email) {
        updatePayload.email = formData.email.trim().toLowerCase();
      }
      if (formData.phone !== originalData.phone) {
        // Fix: Use correct field name that API expects
        updatePayload.phone_number = formData.phone.replace(/\D/g, '');
      }
      if (profileImage && profileImage.startsWith('data:image')) {
        updatePayload.profile_image = profileImage;
      }

      // Check if there are any changes
      if (Object.keys(updatePayload).length === 0) {
        showToast('info', 'No Changes', 'No changes detected to save');
        setIsEditing(false);
        return;
      }

      const response = await axios.patch(`${API_BASE_URL}/auth/profile`, updatePayload, {
        timeout: 15000,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      // Success
      showToast('success', 'Profile Updated', 'Your profile has been updated successfully');

      // Fix: Handle different API response structures and update local data
      const updatedUser = response.data.data?.user || response.data.user || response.data;
      const newUserData = {
        name: updatedUser.full_name || updatedUser.name || formData.name,
        email: updatedUser.email || formData.email,
        phone: updatedUser.phone_number || updatedUser.phone || formData.phone,
        
      };

      setFormData(newUserData);
      setOriginalData(newUserData);
      setProfileImage(updatedUser.profile_image);
      setIsEditing(false);

      // Save to AsyncStorage
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));

      // Fix: Use correct  method to go to main screen
      router.push('../(app)/(tabs)');





    } catch (error) {
      console.error('Save profile error:', error);
      if (error.response?.status === 401) {
        showToast('error', 'Authentication Error', 'Please log in again');
        router.push('./signin');
      } else if (error.response?.status === 409) {
        showToast('error', 'Email Conflict', 'Email is already in use by another account');
      } else if (error.response?.data) {
        showToast('error', 'Error', error.response.data.message || 'Failed to update profile');
      } else if (error.request) {
        showToast('error', 'Network Error', 'Please check your connection');
      } else {
        showToast('error', 'Error', 'Failed to update profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
    // Reset profile image to original if it was a base64 image
    if (profileImage && profileImage.startsWith('data:image')) {
      loadProfile(); // Reload to get original image
    }
  };

  // Fix: Proper  to main screen
  const navigateToMain = () => {
   router.push('../(app)/(tabs)');
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (isLoadingProfile) {
    return (
      <SafeAreaView className="flex-1 bg-gradient-to-br from-pink-50 to-purple-50">
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color="#EC4899" />
          <Text className="mt-4 text-lg text-gray-600">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView className="flex-1 bg-gradient-to-br from-pink-50 to-purple-50">
        {/* Fixed Top  */}
        <View className="flex-row items-center justify-between px-6 py-4 bg-transparent">
          <TouchableOpacity
            onPress={navigateToMain}
            className="p-2 bg-white rounded-full shadow-sm"
          >
            <Text className="mb-2 text-sm font-semibold text-gray-700">Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="p-2"
            onPress={() => isEditing ? handleCancel() : setIsEditing(true)}
          >
            <Text className={`text-sm font-semibold ${isEditing ? 'text-gray-600' : 'text-pink-600'}`}>
              {isEditing ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} 
            className="px-6"
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Header - Centered */}
            <View className="items-center justify-center mb-8">
              {/* Profile Image */}
              <TouchableOpacity
                onPress={isEditing ? selectImage : null}
                className="relative mb-4"
                disabled={!isEditing}
              >
                <View className="w-32 h-32 bg-pink-100 rounded-full shadow-lg">
                  {profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      className="w-32 h-32 rounded-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="items-center justify-center w-32 h-32 bg-pink-200 rounded-full">
                      <Ionicons name="person" size={48} color="#EC4899" />
                    </View>
                  )}
                  {isEditing && (
                    <View className="absolute bottom-0 right-0 p-2 bg-pink-600 rounded-full shadow-lg">
                      <Ionicons name="camera" size={16} color="white" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <Text className="mb-2 text-3xl font-bold text-pink-600">My Profile</Text>
              <Text className="text-base text-center text-gray-600">
                {isEditing ? 'Edit your profile information' : 'View your account details'}
              </Text>
            </View>

            {/* Form Fields - Centered */}
            <View className="mb-6">
              {/* Full Name */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-700">Full Name</Text>
                <View className={`flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl ${!isEditing && 'opacity-70'}`}>
                  <Ionicons name="person-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                  <TextInput
                    className="flex-1 px-4 text-base text-gray-800"
                    placeholder="Enter your full name"
                    placeholderTextColor="#A0A0A0"
                    value={formData.name}
                    onChangeText={(text) => handleInputChange('name', text)}
                    autoCapitalize="words"
                    editable={isEditing}
                  />
                </View>
                {isEditing && formData.name && !formData.name.trim() && (
                  <Text className="mt-1 ml-2 text-xs text-red-500">Name is required</Text>
                )}
              </View>

              {/* Email */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-700">Email Address</Text>
                <View className={`flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl ${!isEditing && 'opacity-70'}`}>
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
                    editable={isEditing}
                  />
                </View>
                {isEditing && formData.email && !isValidEmail(formData.email) && (
                  <Text className="mt-1 ml-2 text-xs text-red-500">Please enter a valid email address</Text>
                )}
              </View>

              {/* Phone Number */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-700">Phone Number</Text>
                <View className={`flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl ${!isEditing && 'opacity-70'}`}>
                  <Ionicons name="call-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                  <TextInput
                    className="flex-1 px-4 text-base text-gray-800"
                    placeholder="Enter phone number"
                    placeholderTextColor="#A0A0A0"
                    keyboardType="phone-pad"
                    value={formData.phone}
                    onChangeText={(text) => handleInputChange('phone', text)}
                    editable={isEditing}
                  />
                </View>
                {isEditing && formData.phone && !isValidPhone(formData.phone) && (
                  <Text className="mt-1 ml-2 text-xs text-red-500">Please enter a valid phone number</Text>
                )}
              </View>

              {/* Save/Edit Button */}
              {isEditing ? (
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
                  onPress={handleSave}
                  disabled={isLoading}
                >
                  <Text className={`text-lg font-bold ${!isLoading ? 'text-white' : 'text-gray-500'}`}>
                    {isLoading ? 'Saving Changes...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="items-center justify-center h-14 rounded-2xl shadow-lg mb-6 bg-pink-600"
                  style={{
                    shadowColor: '#EC4899',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                  onPress={() => setIsEditing(true)}
                >
                  <Text className="text-lg font-bold text-white">Edit Profile</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Trust Badge */}
            <View className="items-center pb-4">
              <View className="flex-row items-center px-4 py-2 rounded-full bg-green-50">
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text className="ml-2 text-xs font-medium text-green-700">Your data is secure & encrypted</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Toast />
    </>
  );
};

export default SignupProfileScreen;