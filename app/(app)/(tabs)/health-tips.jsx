import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from "../../components/config";
import { router } from 'expo-router';

const HealthTipsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('mental_health'); // Updated default tab
  const [searchQuery, setSearchQuery] = useState('');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [gestationalWeek, setGestationalWeek] = useState(0);
  const [favoritesTips, setFavoritesTips] = useState(new Set());
  const [healthTips, setHealthTips] = useState({});
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState('loading');
  const [personalizedFor, setPersonalizedFor] = useState(null);

  const categories = [
    { id: 'nutrition', title: 'Nutrition', icon: 'nutrition', color: '#10B981' },
    { id: 'exercise', title: 'Exercise', icon: 'fitness', color: '#F59E0B' },
    { id: 'mental_health', title: 'Mental Health', icon: 'happy', color: '#8B5CF6' },
    { id: 'sleep', title: 'Sleep', icon: 'moon', color: '#3B82F6' },
    { id: 'general', title: 'General', icon: 'medical', color: '#EF4444' },
  ];

  // Load favorites from storage
  useEffect(() => {
    loadFavorites();
    fetchHealthTips();
  }, []);

  useEffect(() => {
    if (activeTab !== 'all') {
      fetchCategoryTips(activeTab);
    }
  }, [activeTab]);

  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('favoriteTips');
      if (saved) {
        setFavoritesTips(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const saveFavorites = async (favorites) => {
    try {
      await AsyncStorage.setItem('favoriteTips', JSON.stringify([...favorites]));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const fetchHealthTips = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/health-tips`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data;
      
      // Update state with comprehensive response
      setCurrentWeek(data.currentWeek || 0);
      setGestationalWeek(data.gestationalWeek || 0);
      setAiRecommendations(data.aiRecommendations);
      setRiskAssessment(data.riskAssessment);
      setDataSource(data.dataSource || 'unknown');
      setPersonalizedFor(data.personalizedFor);

      // Process health tips - group by category
      if (data.healthTips && Array.isArray(data.healthTips)) {
        const groupedTips = data.healthTips.reduce((acc, tip) => {
          const category = tip.category || 'general';
          if (!acc[category]) acc[category] = [];
          acc[category].push({
            id: tip.id,
            title: tip.title,
            description: tip.content, // Updated: using 'content' field from API
            weekRelevant: Array.from(
              { length: (tip.week_end || currentWeek) - (tip.week_start || currentWeek) + 1 },
              (_, i) => (tip.week_start || currentWeek) + i
            ),
            priority: tip.priority || 'medium',
            aiGenerated: data.dataSource === 'ai-model',
            tips: [], // No sub-tips in the new format
            category: tip.category,
            content: tip.content
          });
          return acc;
        }, {});
        setHealthTips(groupedTips);
      }

      // Add AI-generated tips if available
      if (data.aiRecommendations?.tips) {
        const aiCategory = mapAiCategoryToLocal(data.aiRecommendations.category);
        const aiTips = data.aiRecommendations.tips.map((tip, index) => ({
          id: `ai-${index}`,
          title: `AI Recommendation: ${data.aiRecommendations.category}`,
          description: tip,
          content: tip,
          weekRelevant: [currentWeek],
          priority: 'high',
          aiGenerated: true,
          tips: [],
          category: aiCategory,
          confidence: data.aiRecommendations.confidence
        }));

        setHealthTips(prev => ({
          ...prev,
          [aiCategory]: [
            ...(prev[aiCategory] || []),
            ...aiTips
          ]
        }));
      }

    } catch (error) {
      console.error('Fetch health tips error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to fetch health tips';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategoryTips = async (category) => {
    if (healthTips[category]) return; // Already loaded

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(
        `${API_BASE_URL}/health-tips/category/${category}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.healthTips) {
        setHealthTips(prev => ({
          ...prev,
          [category]: response.data.healthTips.map(tip => ({
            id: tip.id,
            title: tip.title,
            description: tip.content, // Updated: using 'content' field
            content: tip.content,
            weekRelevant: Array.from(
              { length: (tip.week_end || 0) - (tip.week_start || 0) + 1 },
              (_, i) => (tip.week_start || 0) + i
            ),
            priority: tip.priority || 'medium',
            aiGenerated: false,
            tips: [],
            category: tip.category
          }))
        }));
      }
    } catch (error) {
      console.error('Fetch category tips error:', error);
    }
  };

  const mapAiCategoryToLocal = (aiCategory) => {
    const mapping = {
      'Nutrition Focus': 'nutrition',
      'Exercise Focus': 'exercise',
      'Wellness Focus': 'mental_health', // Updated mapping
      'Sleep Focus': 'sleep',
      'General Focus': 'general'
    };
    return mapping[aiCategory] || 'general';
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHealthTips();
    setRefreshing(false);
  }, []);

  const toggleFavorite = async (tipId) => {
    const newFavorites = new Set(favoritesTips);
    if (newFavorites.has(tipId)) {
      newFavorites.delete(tipId);
    } else {
      newFavorites.add(tipId);
    }
    setFavoritesTips(newFavorites);
    await saveFavorites(newFavorites);
  };

  const getRelevantTips = () => {
    const categoryTips = healthTips[activeTab] || [];
    return categoryTips
      .filter(tip =>
        tip.weekRelevant.includes(currentWeek) &&
        (searchQuery === '' ||
          tip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (tip.description && tip.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (tip.content && tip.content.toLowerCase().includes(searchQuery.toLowerCase())))
      )
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'High Risk': return { bg: 'bg-red-100', text: 'text-red-700', icon: 'warning' };
      case 'Medium Risk': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'alert-circle' };
      case 'Low Risk': return { bg: 'bg-green-100', text: 'text-green-700', icon: 'checkmark-circle' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', icon: 'help-circle' };
    }
  };

  const handleAIAssessment = () => {
    router.replace('../health-assessment', {
      currentWeek: currentWeek,
      riskAssessment,
      aiRecommendations,
      personalizedFor
    });
  };

  const handleAIAssistant = () => {
    router.push('../chat', {
      context: {
        week: currentWeek,
        category: activeTab,
        currentTips: getRelevantTips(),
        riskLevel: riskAssessment?.risk_level,
        recommendations: aiRecommendations,
        personalizedFor
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-green-50">
      <ScrollView 
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-2xl font-bold text-green-800">Health Tips</Text>
            <Text className="text-sm text-gray-500">
              {dataSource === 'ai-model' ? 'AI-Powered Insights' : 'Standard Recommendations'}
            </Text>
            {personalizedFor && (
              <Text className="text-xs text-green-600 mt-1">
                Personalized for {personalizedFor.age}y, Week {personalizedFor.currentWeek}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push('FavoriteTips')}>
            <Ionicons name="heart" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Risk Assessment Banner */}
        {riskAssessment && (
          <View className={`p-4 mb-4 rounded-2xl shadow-sm ${
            riskAssessment.risk_level === 'High Risk' ? 'bg-red-50' :
            riskAssessment.risk_level === 'Medium Risk' ? 'bg-yellow-50' : 'bg-green-50'
          }`}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Ionicons 
                    name={getRiskLevelColor(riskAssessment.risk_level).icon} 
                    size={20} 
                    color={
                      riskAssessment.risk_level === 'High Risk' ? '#b91c1c' :
                      riskAssessment.risk_level === 'Medium Risk' ? '#a16207' : '#15803d'
                    } 
                  />
                  <Text className={`ml-2 font-semibold ${
                    riskAssessment.risk_level === 'High Risk' ? 'text-red-700' :
                    riskAssessment.risk_level === 'Medium Risk' ? 'text-yellow-700' : 'text-green-700'
                  }`}>
                    {riskAssessment.risk_level}
                  </Text>
                </View>
                <Text className={`text-sm ${
                  riskAssessment.risk_level === 'High Risk' ? 'text-red-700' :
                  riskAssessment.risk_level === 'Medium Risk' ? 'text-yellow-700' : 'text-green-700'
                }`}>
                  Confidence: {Math.round(riskAssessment.confidence * 100)}%
                </Text>
                <Text className={`text-xs mt-1 ${
                  riskAssessment.risk_level === 'High Risk' ? 'text-red-700' :
                  riskAssessment.risk_level === 'Medium Risk' ? 'text-yellow-700' : 'text-green-700'
                }`}>
                  {riskAssessment.recommendation}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={handleAIAssessment}
                className="px-3 py-2 bg-white bg-opacity-20 rounded-xl"
              >
                <Text className={`text-xs font-medium ${
                  riskAssessment.risk_level === 'High Risk' ? 'text-red-700' :
                  riskAssessment.risk_level === 'Medium Risk' ? 'text-yellow-700' : 'text-green-700'
                }`}>
                  View Details
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Personalized Banner */}
        <View className="p-6 mb-6 bg-green-500 rounded-3xl shadow-lg">
          <View className="flex-row items-center">
            <Image
              source={require('../../../assets/animation/Gynecology consultation-amico.png')}
              className="w-16 h-16 mr-4"
              resizeMode="contain"
            />
            <View className="flex-1">
              <Text className="text-lg font-semibold text-white">
                Week {currentWeek} Tips
              </Text>
              <Text className="text-sm text-white text-opacity-80">
                {aiRecommendations ? `${aiRecommendations.category}` : 'Personalized for your journey'}
              </Text>
              <View className="flex-row mt-2 gap-2">
                <View className="self-start px-3 py-1 rounded-full bg-white bg-opacity-20">
                  <Text className="text-xs font-medium text-white">
                    {dataSource === 'ai-model' ? 'AI-Powered' : 'Standard'}
                  </Text>
                </View>
                {aiRecommendations && (
                  <View className="self-start px-3 py-1 rounded-full bg-white bg-opacity-20">
                    <Text className="text-xs font-medium text-white">
                      {Math.round(aiRecommendations.confidence * 100)}% match
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View className="p-3 mb-4 bg-white border border-green-200 rounded-2xl shadow-sm">
          <View className="flex-row items-center">
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              className="flex-1 ml-3 text-gray-700"
              placeholder="Search health tips..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          <View className="flex-row gap-3">
            {categories.map((category) => {
              const isRecommended = aiRecommendations && 
                mapAiCategoryToLocal(aiRecommendations.category) === category.id;
              
              return (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setActiveTab(category.id)}
                  className={`flex-row items-center px-4 py-3 rounded-2xl relative shadow-sm ${
                    activeTab === category.id ? 'bg-green-500' : 'bg-white border border-green-200'
                  }`}
                >
                  {isRecommended && (
                    <View className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full" />
                  )}
                  <Ionicons
                    name={category.icon}
                    size={20}
                    color={activeTab === category.id ? 'white' : category.color}
                  />
                  <Text className={`ml-2 font-medium ${
                    activeTab === category.id ? 'text-white' : 'text-gray-700'
                  }`}>
                    {category.title}
                  </Text>
                  {isRecommended && activeTab !== category.id && (
                    <Text className="ml-1 text-xs text-orange-600 font-semibold">★</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Tips List */}
        <View className="mb-6">
          {isLoading ? (
            <View className="items-center py-6">
              <ActivityIndicator size="large" color="#10B981" />
              <Text className="mt-2 text-gray-500">Loading personalized tips...</Text>
            </View>
          ) : getRelevantTips().length === 0 ? (
            <View className="items-center p-6 bg-white border border-green-200 rounded-2xl shadow-sm">
              <Ionicons name="search" size={48} color="#93C5FD" />
              <Text className="mt-2 text-center text-gray-500">
                {searchQuery ? 'No tips found for your search' : 'No tips available for this category'}
              </Text>
            </View>
          ) : (
            getRelevantTips().map((tip) => (
              <View
                key={tip.id}
                className="p-5 mb-4 bg-white border border-green-200 rounded-2xl shadow-sm"
              >
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <Text className="flex-1 text-lg font-bold text-green-800">
                        {tip.title}
                      </Text>
                      <TouchableOpacity onPress={() => toggleFavorite(tip.id)}>
                        <Ionicons
                          name={favoritesTips.has(tip.id) ? 'heart' : 'heart-outline'}
                          size={20}
                          color={favoritesTips.has(tip.id) ? '#EF4444' : '#6B7280'}
                        />
                      </TouchableOpacity>
                    </View>
                    <View className="flex-row items-center mb-2 flex-wrap gap-2">
                      <View className={`px-2 py-1 rounded-full ${
                        tip.priority === 'high' ? 'bg-red-50' : 
                        tip.priority === 'medium' ? 'bg-yellow-50' : 'bg-green-50'
                      }`}>
                        <Text className={`text-xs font-medium capitalize ${
                          tip.priority === 'high' ? 'text-red-700' :
                          tip.priority === 'medium' ? 'text-yellow-700' : 'text-green-700'
                        }`}>
                          {tip.priority}
                        </Text>
                      </View>
                      {tip.aiGenerated && (
                        <View className="px-2 py-1 bg-purple-50 rounded-full">
                          <Text className="text-xs font-medium text-purple-700">AI</Text>
                        </View>
                      )}
                      {tip.confidence && (
                        <View className="px-2 py-1 bg-blue-50 rounded-full">
                          <Text className="text-xs font-medium text-blue-700">
                            {Math.round(tip.confidence * 100)}% match
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <Text className="mb-4 text-sm leading-5 text-gray-700">
                  {tip.description || tip.content}
                </Text>

                {tip.tips && tip.tips.length > 0 && (
                  <View className="gap-2">
                    {tip.tips.map((subTip, index) => (
                      <View key={index} className="flex-row items-start">
                        <View className="w-2 h-2 mt-2 mr-3 bg-green-500 rounded" />
                        <Text className="flex-1 text-sm leading-5 text-gray-600">
                          {subTip}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View className="flex-row items-center justify-between pt-3 mt-4 border-t border-gray-100">
                  <Text className="text-xs text-gray-500">
                    Week {currentWeek} relevant
                  </Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity>
                      <Ionicons name="share-outline" size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                      <Ionicons name="bookmark-outline" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* AI Assistant Section */}
        <View className="p-4 mb-6 bg-slate-50 border border-slate-200 rounded-2xl">
          <View className="flex-row items-center mb-3">
            <Ionicons name="chatbubble-ellipses" size={20} color="#8B5CF6" />
            <Text className="ml-2 font-semibold text-purple-700">AI Health Assistant</Text>
            {dataSource === 'ai-model' && (
              <View className="px-2 py-1 ml-2 bg-green-50 rounded-full">
                <Text className="text-xs font-medium text-green-700">Active</Text>
              </View>
            )}
          </View>
          <Text className="mb-3 text-sm text-purple-700">
            Get personalized advice based on your current pregnancy week, risk assessment, and health data.
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleAIAssistant}
              className="flex-1 flex-row items-center justify-center px-4 py-3 bg-purple-500 rounded-xl"
            >
              <Ionicons name="chatbubble-ellipses" size={16} color="white" />
              <Text className="ml-2 font-medium text-white">Chat with AI</Text>
            </TouchableOpacity>
            {riskAssessment && (
              <TouchableOpacity
                onPress={handleAIAssessment}
                className="flex-row items-center justify-center px-4 py-3 bg-blue-500 rounded-xl"
              >
                <Ionicons name="analytics" size={16} color="white" />
                <Text className="ml-2 font-medium text-white">Assessment</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Data Source Info */}
        {dataSource !== 'loading' && (
          <View className="p-3 mb-6 bg-gray-50 rounded-xl">
            <Text className="text-xs text-center text-gray-500">
              Tips powered by: {dataSource === 'ai-model' ? 'AI Model + Database' : 
                               dataSource === 'fallback-rules' ? 'Fallback Rules + Database' : 
                               'Database Only'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HealthTipsScreen;