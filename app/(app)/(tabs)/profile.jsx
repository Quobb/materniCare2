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
import { API_BASE_URL } from "../../components/config";

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
  const [bioData, setBioData] = useState({
    age: '',
    bmi: '',
    weight: '',
    medical_conditions: '',
    previous_pregnancies: '',
    gestational_week: '',
  });
  const [originalData, setOriginalData] = useState({});
  const [originalBioData, setOriginalBioData] = useState({});
  const [profileId, setProfileId] = useState(null);

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

  const handleBioChange = (field, value) => {
    setBioData((prev) => ({ ...prev, [field]: value }));
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
    
    // Validate bio data
    if (bioData.age && (isNaN(bioData.age) || bioData.age < 0 || bioData.age > 120)) {
      return 'Please enter a valid age (0-120)';
    }
    if (bioData.bmi && (isNaN(bioData.bmi) || bioData.bmi < 0 || bioData.bmi > 100)) {
      return 'Please enter a valid BMI (0-100)';
    }
    if (bioData.weight && (isNaN(bioData.weight) || bioData.weight < 0)) {
      return 'Please enter a valid weight';
    }
    if (bioData.previous_pregnancies && (isNaN(bioData.previous_pregnancies) || bioData.previous_pregnancies < 0)) {
      return 'Please enter a valid number for previous pregnancies';
    }
    if (bioData.gestational_week && (isNaN(bioData.gestational_week) || bioData.gestational_week < 0 || bioData.gestational_week > 42)) {
      return 'Please enter a valid gestational week (0-42)';
    }
    
    return null;
  };

  const loadUserBioData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/auth/user-profile/me`, {
        timeout: 10000,
        headers: { 
          'Authorization': `Bearer ${token}`
        },
      });

      const profile = response.data.data?.profile || response.data.profile;
      if (profile) {
        const bioInfo = {
          age: profile.age?.toString() || '',
          bmi: profile.bmi?.toString() || '',
          weight: profile.weight?.toString() || '',
          medical_conditions: profile.medical_conditions || '',
          previous_pregnancies: profile.previous_pregnancies?.toString() || '',
          gestational_week: profile.gestational_week?.toString() || '',
        };
        
        setBioData(bioInfo);
        setOriginalBioData(bioInfo);
        setProfileId(profile.id);
      }
    } catch (error) {
      console.error('Bio data load error:', error);
      // Don't show error toast for bio data as it might not exist yet
    }
  };

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showToast('error', 'Authentication Error', 'Please log in again');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        timeout: 10000,
        headers: { 
          'Authorization': `Bearer ${token}`
        },
      });

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

      // Load bio data separately
      await loadUserBioData();

    } catch (error) {
      console.error('Profile load error:', error);
      if (error.response?.status === 401) {
        showToast('error', 'Authentication Error', 'Please log in again');
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

  const saveBioData = async (token) => {
    try {
      // Check if there are bio changes
      const bioChanges = {};
      if (bioData.age !== originalBioData.age && bioData.age.trim() !== '') {
        bioChanges.age = parseInt(bioData.age);
      }
      if (bioData.bmi !== originalBioData.bmi && bioData.bmi.trim() !== '') {
        bioChanges.bmi = parseFloat(bioData.bmi);
      }
      if (bioData.weight !== originalBioData.weight && bioData.weight.trim() !== '') {
        bioChanges.weight = parseFloat(bioData.weight);
      }
      if (bioData.medical_conditions !== originalBioData.medical_conditions) {
        bioChanges.medical_conditions = bioData.medical_conditions.trim();
      }
      if (bioData.previous_pregnancies !== originalBioData.previous_pregnancies && bioData.previous_pregnancies.trim() !== '') {
        bioChanges.previous_pregnancies = parseInt(bioData.previous_pregnancies);
      }
      if (bioData.gestational_week !== originalBioData.gestational_week && bioData.gestational_week.trim() !== '') {
        bioChanges.gestational_week = parseInt(bioData.gestational_week);
      }

      if (Object.keys(bioChanges).length > 0) {
        if (profileId) {
          // Update existing profile
          await axios.put(`${API_BASE_URL}/auth/user-profile/${profileId}`, bioChanges, {
            timeout: 15000,
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
          });
        } else {
          // Create new profile - you'll need to implement this endpoint
          const response = await axios.post(`${API_BASE_URL}/auth/user-profile`, bioChanges, {
            timeout: 15000,
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
          });
          setProfileId(response.data.data?.profile?.id);
        }
        
        setOriginalBioData(bioData);
      }
    } catch (error) {
      console.error('Bio data save error:', error);
      throw error; // Re-throw to handle in main save function
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
        return;
      }

      // Prepare update payload for basic profile - only include changed fields
      const updatePayload = {};
      if (formData.name !== originalData.name) {
        updatePayload.full_name = formData.name.trim();
      }
      if (formData.email !== originalData.email) {
        updatePayload.email = formData.email.trim().toLowerCase();
      }
      if (formData.phone !== originalData.phone) {
        updatePayload.phone_number = formData.phone.replace(/\D/g, '');
      }
      if (profileImage && profileImage.startsWith('data:image')) {
        updatePayload.profile_image = profileImage;
      }

      // Update basic profile if there are changes
      if (Object.keys(updatePayload).length > 0) {
        const response = await axios.patch(`${API_BASE_URL}/auth/profile`, updatePayload, {
          timeout: 15000,
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        const updatedUser = response.data.data?.user || response.data.user || response.data;
        const newUserData = {
          name: updatedUser.full_name || updatedUser.name || formData.name,
          email: updatedUser.email || formData.email,
          phone: updatedUser.phone_number || updatedUser.phone || formData.phone,
        };

        setFormData(newUserData);
        setOriginalData(newUserData);
        setProfileImage(updatedUser.profile_image);

        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      }

      // Save bio data
      await saveBioData(token);

      // Check if any changes were made
      if (Object.keys(updatePayload).length === 0 && JSON.stringify(bioData) === JSON.stringify(originalBioData)) {
        showToast('info', 'No Changes', 'No changes detected to save');
      } else {
        showToast('success', 'Profile Updated', 'Your profile has been updated successfully');
      }

      setIsEditing(false);

    } catch (error) {
      console.error('Save profile error:', error);
      if (error.response?.status === 401) {
        showToast('error', 'Authentication Error', 'Please log in again');
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
    setBioData(originalBioData);
    setIsEditing(false);
    if (profileImage && profileImage.startsWith('data:image')) {
      loadProfile();
    }
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
        {/* Fixed Top Navigation */}
        <View className="flex-row items-center justify-between px-6 py-4 bg-transparent">
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

            {/* Basic Info Section */}
            <View className="mb-6">
              <Text className="mb-4 text-lg font-bold text-gray-800">Basic Information</Text>
              
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
              </View>
            </View>

            {/* Bio Data Section */}
            <View className="mb-6">
              <Text className="mb-4 text-lg font-bold text-gray-800">Health Information</Text>
              
              {/* Age & Weight Row */}
              <View className="flex-row mb-5 space-x-3">
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-semibold text-gray-700">Age</Text>
                  <View className={`flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl ${!isEditing && 'opacity-70'}`}>
                    <Ionicons name="calendar-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                    <TextInput
                      className="flex-1 px-4 text-base text-gray-800"
                      placeholder="Age"
                      placeholderTextColor="#A0A0A0"
                      keyboardType="numeric"
                      value={bioData.age}
                      onChangeText={(text) => handleBioChange('age', text)}
                      editable={isEditing}
                    />
                  </View>
                </View>
                
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-semibold text-gray-700">Weight (kg)</Text>
                  <View className={`flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl ${!isEditing && 'opacity-70'}`}>
                    <Ionicons name="fitness-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                    <TextInput
                      className="flex-1 px-4 text-base text-gray-800"
                      placeholder="Weight"
                      placeholderTextColor="#A0A0A0"
                      keyboardType="numeric"
                      value={bioData.weight}
                      onChangeText={(text) => handleBioChange('weight', text)}
                      editable={isEditing}
                    />
                  </View>
                </View>
              </View>

              {/* BMI */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-700">BMI</Text>
                <View className={`flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl ${!isEditing && 'opacity-70'}`}>
                  <Ionicons name="analytics-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                  <TextInput
                    className="flex-1 px-4 text-base text-gray-800"
                    placeholder="Enter BMI"
                    placeholderTextColor="#A0A0A0"
                    keyboardType="numeric"
                    value={bioData.bmi}
                    onChangeText={(text) => handleBioChange('bmi', text)}
                    editable={isEditing}
                  />
                </View>
              </View>

              {/* Medical Conditions */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-700">Medical Conditions</Text>
                <View className={`flex-row items-start bg-white border border-pink-100 shadow-sm rounded-2xl ${!isEditing && 'opacity-70'}`}>
                  <Ionicons name="medical-outline" size={20} color="#EC4899" style={{ marginLeft: 16, marginTop: 16 }} />
                  <TextInput
                    className="flex-1 px-4 py-4 text-base text-gray-800"
                    placeholder="Enter any medical conditions"
                    placeholderTextColor="#A0A0A0"
                    value={bioData.medical_conditions}
                    onChangeText={(text) => handleBioChange('medical_conditions', text)}
                    multiline={true}
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={isEditing}
                  />
                </View>
              </View>

              {/* Pregnancy Info Row */}
              <View className="flex-row mb-5 space-x-3">
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-semibold text-gray-700">Previous Pregnancies</Text>
                  <View className={`flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl ${!isEditing && 'opacity-70'}`}>
                    <Ionicons name="heart-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                    <TextInput
                      className="flex-1 px-4 text-base text-gray-800"
                      placeholder="Count"
                      placeholderTextColor="#A0A0A0"
                      keyboardType="numeric"
                      value={bioData.previous_pregnancies}
                      onChangeText={(text) => handleBioChange('previous_pregnancies', text)}
                      editable={isEditing}
                    />
                  </View>
                </View>
                
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-semibold text-gray-700">Gestational Week</Text>
                  <View className={`flex-row items-center bg-white border border-pink-100 shadow-sm h-14 rounded-2xl ${!isEditing && 'opacity-70'}`}>
                    <Ionicons name="time-outline" size={20} color="#EC4899" style={{ marginLeft: 16 }} />
                    <TextInput
                      className="flex-1 px-4 text-base text-gray-800"
                      placeholder="Week"
                      placeholderTextColor="#A0A0A0"
                      keyboardType="numeric"
                      value={bioData.gestational_week}
                      onChangeText={(text) => handleBioChange('gestational_week', text)}
                      editable={isEditing}
                    />
                  </View>
                </View>
              </View>
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