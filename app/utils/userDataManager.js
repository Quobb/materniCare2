// userDataManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../components/config'; // Adjust path as needed

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_PROFILE: 'userProfile',
  USER_SESSION: 'user_session',
  USER_ROLE: 'userRole',
  USER_NAME: 'userName',
  LAST_ACTIVITY: 'lastActivity',
  REFRESH_TOKEN: 'refreshToken'
};

// Enhanced user session storage
export const storeUserSession = async (sessionData) => {
  try {
    if (sessionData && typeof sessionData === 'object') {
      const sessionToStore = {
        ...sessionData,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(sessionToStore));
      console.log('✅ User session stored successfully');
      return true;
    } else {
      console.warn('⚠️ No valid session data to store');
      return false;
    }
  } catch (error) {
    console.error('❌ Error storing user session:', error);
    return false;
  }
};

// Store user data from login response - THIS IS THE MAIN FUNCTION FOR LOGIN
export const storeUserDataFromLogin = async (loginResponse) => {
  try {
    const { data } = loginResponse;
    
    if (!data || !data.user || !data.token) {
      throw new Error('Invalid login response structure');
    }

    const { user, token } = data;

    // Store authentication token
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    
    // Store user profile data in standardized format
    const userProfile = {
      id: user.id,
      name: user.full_name ,
      email: user.email || '',
      phone: user.phone_number || '',
      role: user.role || 'user',
      dateOfBirth: user.date_of_birth || null,
      profileImage: user.profile_image || user.avatar || '',
      twoFactorEnabled: user.two_factor_enabled || false,
      createdAt: user.created_at || null,
      updatedAt: user.updated_at || null
    };
    
    // Store individual fields for easy access
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile)],
      [STORAGE_KEYS.USER_ROLE, userProfile.role],
      [STORAGE_KEYS.USER_NAME, userProfile.name],
      [STORAGE_KEYS.LAST_ACTIVITY, new Date().toISOString()]
    ]);

    // Store complete session data
    await storeUserSession({
      user: userProfile,
      token: token,
      loginResponse: data
    });

    console.log('✅ User data stored successfully after login:', {
      name: userProfile.name,
      email: userProfile.email,
      role: userProfile.role
    });
    
    return userProfile;
    
  } catch (error) {
    console.error('❌ Error storing user data from login:', error);
    throw error;
  }
};

// Get cached user profile
export const getCachedUserProfile = async () => {
  try {
    const cachedProfile = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (cachedProfile) {
      return JSON.parse(cachedProfile);
    }
    return null;
  } catch (error) {
    console.error('Error getting cached user profile:', error);
    return null;
  }
};

// Get auth token
export const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Update last activity
export const updateLastActivity = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, new Date().toISOString());
  } catch (error) {
    console.error('Error updating last activity:', error);
  }
};

// Helper function to safely extract user data from various API response structures
const extractUserFromResponse = (responseData) => {
  console.log('🔍 Full API Response:', JSON.stringify(responseData, null, 2));
  
  // Check various possible response structures
  let user = null;
  
  if (responseData.user) {
    user = responseData.user;
    console.log('📍 Found user in response.data.user');
  } else if (responseData.data && responseData.data.user) {
    user = responseData.data.user;
    console.log('📍 Found user in response.data.data.user');
  } else if (responseData.profile) {
    user = responseData.profile;
    console.log('📍 Found user in response.data.profile');
  } else if (responseData.data) {
    user = responseData.data;
    console.log('📍 Found user in response.data.data (direct user object)');
  } else if (responseData.id) {
    user = responseData;
    console.log('📍 Found user in response.data (direct user object)');
  }
  
  if (!user || !user.id) {
    console.error('❌ Could not find valid user object in API response');
    console.log('Available keys in response:', Object.keys(responseData || {}));
    return null;
  }
  
  console.log('✅ Extracted user object:', {
    id: user.id,
    name: user.full_name || user.name,
    email: user.email
  });
  
  return user;
};

// Fetch fresh user data from API with enhanced debugging
export const fetchUserData = async (forceRefresh = false) => {
  try {
    // Check if we have cached data and it's recent (unless force refresh)
    if (!forceRefresh) {
      const cachedProfile = await getCachedUserProfile();
      const lastActivity = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
      
      if (cachedProfile && lastActivity) {
        const lastActivityTime = new Date(lastActivity);
        const now = new Date();
        const timeDiff = now - lastActivityTime;
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        // If data is less than 5 minutes old, use cached data
        if (timeDiff < fiveMinutes) {
          console.log('📱 Using cached user data');
          await updateLastActivity(); // Update activity time
          return cachedProfile;
        }
      }
    }

    // Fetch fresh data from API
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('🔄 Fetching fresh user data from API...');
    console.log('🔑 Using token:', token?.substring(0, 20) + '...');
    console.log('🌐 API URL:', `${API_BASE_URL}/auth/profile`);
    
    const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 seconds timeout
    });

    console.log('📡 API Response Status:', response.status);
    console.log('📊 API Response Headers:', response.headers);
    
    if (!response.data) {
      console.error('❌ Empty response from API');
      throw new Error('Empty API response');
    }

    // Use enhanced extraction function
    const user = extractUserFromResponse(response.data);
    
    if (!user) {
      throw new Error('Could not extract user data from API response');
    }
    
    // Transform API response to consistent format with better fallbacks
    const userProfile = {
      id: user.id,
      name: user.full_name || user.name || user.username || 'User',
      email: user.email || '',
      phone: user.phone_number || user.phone || '',
      role: user.role || 'user',
      dateOfBirth: user.date_of_birth || user.dob || null,
      profileImage: user.profile_image || user.avatar || user.image || '',
      twoFactorEnabled: user.two_factor_enabled || user.twoFA || false,
      createdAt: user.created_at || user.createdAt || null,
      updatedAt: user.updated_at || user.updatedAt || null
    };

    // Validate essential fields
    if (!userProfile.id) {
      throw new Error('User ID is required but missing from API response');
    }

    console.log('✅ Transformed user profile:', {
      id: userProfile.id,
      name: userProfile.name,
      email: userProfile.email,
      role: userProfile.role
    });

    // Update stored data
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile)],
      [STORAGE_KEYS.USER_ROLE, userProfile.role],
      [STORAGE_KEYS.USER_NAME, userProfile.name],
      [STORAGE_KEYS.LAST_ACTIVITY, new Date().toISOString()]
    ]);

    console.log('✅ Fresh user data fetched and stored');
    return userProfile;

  } catch (error) {
    console.error('❌ Error fetching user data:', error);
    
    // Enhanced error logging
    if (error.response) {
      console.error('📡 Response Status:', error.response.status);
      console.error('📡 Response Data:', error.response.data);
      console.error('📡 Response Headers:', error.response.headers);
    } else if (error.request) {
      console.error('📡 No response received:', error.request);
    } else {
      console.error('📡 Request setup error:', error.message);
    }
    
    // Handle different error scenarios
    if (error.response?.status === 401) {
      // Token expired or invalid - clear stored data
      console.log('🚨 Authentication expired, clearing user data');
      await clearUserData();
      throw new Error('Authentication expired');
    } else if (error.response?.status === 404) {
      console.log('🚨 Profile endpoint not found');
      throw new Error('Profile endpoint not found');
    } else if (error.code === 'ECONNABORTED') {
      // Network timeout - try to return cached data
      console.log('⚠️ Network timeout, trying cached data');
      const cachedProfile = await getCachedUserProfile();
      if (cachedProfile) {
        console.log('✅ Using cached data due to network timeout');
        return cachedProfile;
      }
      throw new Error('Network timeout and no cached data available');
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      console.log('⚠️ Network error, trying cached data');
      const cachedProfile = await getCachedUserProfile();
      if (cachedProfile) {
        console.log('✅ Using cached data due to network error');
        return cachedProfile;
      }
      throw new Error('Network error and no cached data available');
    }
    
    throw error;
  }
};

// Clear all user data (for logout)
export const clearUserData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_PROFILE,
      STORAGE_KEYS.USER_SESSION,
      STORAGE_KEYS.USER_ROLE,
      STORAGE_KEYS.USER_NAME,
      STORAGE_KEYS.LAST_ACTIVITY,
      STORAGE_KEYS.REFRESH_TOKEN
    ]);
    console.log('✅ User data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing user data:', error);
  }
};

// Test API endpoint function - useful for debugging
export const testProfileEndpoint = async () => {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.log('❌ No auth token found');
      return;
    }

    console.log('🧪 Testing profile endpoint...');
    console.log('🔑 Token:', token?.substring(0, 20) + '...');
    console.log('🌐 URL:', `${API_BASE_URL}/auth/profile`);

    const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Test successful!');
    console.log('📊 Status:', response.status);
    console.log('📄 Response structure:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error.response) {
      console.log('📡 Error response:', error.response.data);
    }
    return null;
  }
};

// Enhanced hook for user profile with better error handling and caching
import React, { useState, useEffect } from 'react';

export  const useUserProfile = () => {
  const [userProfile, setUserProfile] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    role: 'user',
    profileImage: '',
    dateOfBirth: null,
    twoFactorEnabled: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeUserProfile();
  }, []);

  const initializeUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Initializing user profile...');
      
      // First try to get cached data for immediate display
      const cachedProfile = await getCachedUserProfile();
      if (cachedProfile) {
        console.log('📱 Found cached profile, displaying immediately');
        setUserProfile(cachedProfile);
        setLoading(false);
      }
      
      // Then fetch fresh data in background
      console.log('🔄 Fetching fresh profile data...');
      const freshProfile = await fetchUserData(false);
      if (freshProfile) {
        console.log('✅ Fresh profile loaded successfully');
        setUserProfile(freshProfile);
      }
      
    } catch (error) {
      console.error('❌ Profile initialization error:', error);
      setError(error.message);
      
      // Try to use any cached data as fallback
      const cachedProfile = await getCachedUserProfile();
      if (cachedProfile) {
        console.log('📱 Using cached profile as fallback');
        setUserProfile(cachedProfile);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async (forceRefresh = true) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Refreshing profile...');
      const freshProfile = await fetchUserData(forceRefresh);
      if (freshProfile) {
        setUserProfile(freshProfile);
        console.log('✅ Profile refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Profile refresh error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileImage = async (imageUri) => {
    try {
      const updatedProfile = {
        ...userProfile,
        profileImage: imageUri
      };
      setUserProfile(updatedProfile);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
      console.log('✅ Profile image updated locally');
    } catch (error) {
      console.error('❌ Error updating profile image:', error);
    }
  };

  const debugProfile = async () => {
    console.log('🐛 Debug Profile Information:');
    console.log('Current State:', userProfile);
    console.log('Loading:', loading);
    console.log('Error:', error);
    
    const cachedData = await getCachedUserProfile();
    console.log('Cached Data:', cachedData);
    
    const token = await getAuthToken();
    console.log('Auth Token:', token ? 'Present' : 'Missing');
    
    // Test the API endpoint
    await testProfileEndpoint();
  };

  return { 
    userProfile, 
    loading, 
    error,
    refreshProfile,
    updateProfileImage,
    debugProfile,
    testEndpoint: testProfileEndpoint,
    isAuthenticated: !!userProfile.id
  };
};