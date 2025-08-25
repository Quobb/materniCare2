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
  const [activeTab, setActiveTab] = useState('nutrition');
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

      // Process health tips - group by category
      if (data.healthTips) {
        const groupedTips = data.healthTips.reduce((acc, tip) => {
          const category = tip.category || 'general';
          if (!acc[category]) acc[category] = [];
          acc[category].push({
            id: tip.id,
            title: tip.title,
            description: tip.description,
            weekRelevant: Array.from(
              { length: (tip.week_end || currentWeek) - (tip.week_start || currentWeek) + 1 },
              (_, i) => (tip.week_start || currentWeek) + i
            ),
            priority: tip.priority || 'medium',
            aiGenerated: data.dataSource === 'ai-model',
            tips: tip.content ? [tip.content] : [],
            category: tip.category
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
          weekRelevant: [gestationalWeek || currentWeek],
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

      setHealthTips(prev => ({
        ...prev,
        [category]: response.data.healthTips.map(tip => ({
          id: tip.id,
          title: tip.title,
          description: tip.description,
          weekRelevant: Array.from(
            { length: tip.week_end - tip.week_start + 1 },
            (_, i) => tip.week_start + i
          ),
          priority: tip.priority || 'medium',
          aiGenerated: false,
          tips: tip.content ? [tip.content] : [],
          category: tip.category
        }))
      }));
    } catch (error) {
      console.error('Fetch category tips error:', error);
    }
  };

  const mapAiCategoryToLocal = (aiCategory) => {
    const mapping = {
      'Nutrition Focus': 'nutrition',
      'Exercise Focus': 'exercise',
      'Wellness Focus': 'mental_health'
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
        tip.weekRelevant.includes(gestationalWeek || currentWeek) &&
        (searchQuery === '' ||
          tip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tip.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
    // router.push('HealthAssessment', {
    //   currentWeek: gestationalWeek || currentWeek,
    //   riskAssessment,
    //   aiRecommendations
    // });
    router.replace('../health-assessment' ,{
        currentWeek: gestationalWeek || currentWeek,
      riskAssessment,
      aiRecommendations
    });
  };

  const handleAIAssistant = () => {
    router.push('../chat', {
      context: {
        week: gestationalWeek || currentWeek,
        category: activeTab,
        currentTips: getRelevantTips(),
        riskLevel: riskAssessment?.risk_level,
        recommendations: aiRecommendations
      },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0fdf4' }}>
      <ScrollView 
        style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#065f46' }}>Health Tips</Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              {dataSource === 'ai-model' ? 'AI-Powered Insights' : 'Standard Recommendations'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('FavoriteTips')}>
            <Ionicons name="heart" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Risk Assessment Banner */}
        {riskAssessment && (
          <View style={{
            padding: 16,
            marginBottom: 16,
            backgroundColor: getRiskLevelColor(riskAssessment.risk_level).bg === 'bg-red-100' ? '#fef2f2' :
                             getRiskLevelColor(riskAssessment.risk_level).bg === 'bg-yellow-100' ? '#fefce8' : '#f0fdf4',
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons 
                    name={getRiskLevelColor(riskAssessment.risk_level).icon} 
                    size={20} 
                    color={getRiskLevelColor(riskAssessment.risk_level).text === 'text-red-700' ? '#b91c1c' :
                           getRiskLevelColor(riskAssessment.risk_level).text === 'text-yellow-700' ? '#a16207' : '#15803d'} 
                  />
                  <Text style={{
                    marginLeft: 8,
                    fontWeight: '600',
                    color: getRiskLevelColor(riskAssessment.risk_level).text === 'text-red-700' ? '#b91c1c' :
                           getRiskLevelColor(riskAssessment.risk_level).text === 'text-yellow-700' ? '#a16207' : '#15803d'
                  }}>
                    {riskAssessment.risk_level}
                  </Text>
                </View>
                <Text style={{
                  fontSize: 14,
                  color: getRiskLevelColor(riskAssessment.risk_level).text === 'text-red-700' ? '#b91c1c' :
                         getRiskLevelColor(riskAssessment.risk_level).text === 'text-yellow-700' ? '#a16207' : '#15803d'
                }}>
                  Confidence: {Math.round(riskAssessment.confidence * 100)}%
                </Text>
                <Text style={{
                  fontSize: 12,
                  marginTop: 4,
                  color: getRiskLevelColor(riskAssessment.risk_level).text === 'text-red-700' ? '#b91c1c' :
                         getRiskLevelColor(riskAssessment.risk_level).text === 'text-yellow-700' ? '#a16207' : '#15803d'
                }}>
                  {riskAssessment.recommendation}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={handleAIAssessment}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 12
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: getRiskLevelColor(riskAssessment.risk_level).text === 'text-red-700' ? '#b91c1c' :
                         getRiskLevelColor(riskAssessment.risk_level).text === 'text-yellow-700' ? '#a16207' : '#15803d'
                }}>
                  View Details
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Personalized Banner */}
        <View style={{
          padding: 24,
          marginBottom: 24,
          backgroundColor: '#10b981',
          borderRadius: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 4,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../../../assets/animation/Gynecology consultation-amico.png')}
              style={{ width: 64, height: 64, marginRight: 16 }}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>
                Week {gestationalWeek || currentWeek} Tips
              </Text>
              <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.8)' }}>
                {aiRecommendations ? `${aiRecommendations.category} Focus` : 'Personalized for your journey'}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                <View style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)'
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: 'white' }}>
                    {dataSource === 'ai-model' ? 'AI-Powered' : 'Standard'}
                  </Text>
                </View>
                {aiRecommendations && (
                  <View style={{
                    alignSelf: 'flex-start',
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)'
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: 'white' }}>
                      {Math.round(aiRecommendations.confidence * 100)}% match
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{
          padding: 12,
          marginBottom: 16,
          backgroundColor: 'white',
          borderWidth: 1,
          borderColor: '#dcfce7',
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              style={{ flex: 1, marginLeft: 12, color: '#374151' }}
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {categories.map((category) => {
              const isRecommended = aiRecommendations && 
                mapAiCategoryToLocal(aiRecommendations.category) === category.id;
              
              return (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setActiveTab(category.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 16,
                    position: 'relative',
                    backgroundColor: activeTab === category.id ? '#10b981' : 'white',
                    borderWidth: activeTab === category.id ? 0 : 1,
                    borderColor: '#dcfce7',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 3,
                  }}
                >
                  {isRecommended && (
                    <View style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      width: 12,
                      height: 12,
                      backgroundColor: '#fb923c',
                      borderRadius: 6
                    }} />
                  )}
                  <Ionicons
                    name={category.icon}
                    size={20}
                    color={activeTab === category.id ? 'white' : category.color}
                  />
                  <Text style={{
                    marginLeft: 8,
                    fontWeight: '500',
                    color: activeTab === category.id ? 'white' : '#374151'
                  }}>
                    {category.title}
                  </Text>
                  {isRecommended && activeTab !== category.id && (
                    <Text style={{ marginLeft: 4, fontSize: 12, color: '#ea580c', fontWeight: '600' }}>★</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Tips List */}
        <View style={{ marginBottom: 24 }}>
          {isLoading ? (
            <View style={{ alignItems: 'center', padding: 24 }}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={{ marginTop: 8, color: '#6b7280' }}>Loading personalized tips...</Text>
            </View>
          ) : getRelevantTips().length === 0 ? (
            <View style={{
              alignItems: 'center',
              padding: 24,
              backgroundColor: 'white',
              borderWidth: 1,
              borderColor: '#dcfce7',
              borderRadius: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 2,
            }}>
              <Ionicons name="search" size={48} color="#93C5FD" />
              <Text style={{ marginTop: 8, textAlign: 'center', color: '#6b7280' }}>
                {searchQuery ? 'No tips found for your search' : 'No tips available for this category'}
              </Text>
            </View>
          ) : (
            getRelevantTips().map((tip) => (
              <View
                key={tip.id}
                style={{
                  padding: 20,
                  marginBottom: 16,
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#dcfce7',
                  borderRadius: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ flex: 1, fontSize: 18, fontWeight: 'bold', color: '#065f46' }}>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 20,
                        backgroundColor: tip.priority === 'high' ? '#fef2f2' : tip.priority === 'medium' ? '#fefce8' : '#f0fdf4'
                      }}>
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '500',
                          textTransform: 'capitalize',
                          color: tip.priority === 'high' ? '#b91c1c' : tip.priority === 'medium' ? '#a16207' : '#15803d'
                        }}>
                          {tip.priority}
                        </Text>
                      </View>
                      {tip.aiGenerated && (
                        <View style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          backgroundColor: '#f3e8ff',
                          borderRadius: 20
                        }}>
                          <Text style={{ fontSize: 12, fontWeight: '500', color: '#7c3aed' }}>AI</Text>
                        </View>
                      )}
                      {tip.confidence && (
                        <View style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          backgroundColor: '#dbeafe',
                          borderRadius: 20
                        }}>
                          <Text style={{ fontSize: 12, fontWeight: '500', color: '#1d4ed8' }}>
                            {Math.round(tip.confidence * 100)}% match
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <Text style={{ marginBottom: 16, fontSize: 14, lineHeight: 20, color: '#374151' }}>
                  {tip.description}
                </Text>

                {tip.tips.length > 0 && (
                  <View style={{ gap: 8 }}>
                    {tip.tips.map((subTip, index) => (
                      <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={{
                          width: 8,
                          height: 8,
                          marginTop: 8,
                          marginRight: 12,
                          backgroundColor: '#10b981',
                          borderRadius: 4
                        }} />
                        <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: '#4b5563' }}>
                          {subTip}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  marginTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: '#f3f4f6'
                }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Week {gestationalWeek || currentWeek} relevant
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
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
        <View style={{
          padding: 16,
          marginBottom: 24,
          backgroundColor: '#f8fafc',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#e2e8f0'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="chatbubble-ellipses" size={20} color="#8B5CF6" />
            <Text style={{ marginLeft: 8, fontWeight: '600', color: '#7c3aed' }}>AI Health Assistant</Text>
            {dataSource === 'ai-model' && (
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginLeft: 8,
                backgroundColor: '#f0fdf4',
                borderRadius: 20
              }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#15803d' }}>Active</Text>
              </View>
            )}
          </View>
          <Text style={{ marginBottom: 12, fontSize: 14, color: '#7c3aed' }}>
            Get personalized advice based on your current pregnancy week, risk assessment, and health data.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={handleAIAssistant}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: '#8b5cf6',
                borderRadius: 12
              }}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color="white" />
              <Text style={{ marginLeft: 8, fontWeight: '500', color: 'white' }}>Chat with AI</Text>
            </TouchableOpacity>
            {riskAssessment && (
              <TouchableOpacity
                onPress={handleAIAssessment}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: '#3b82f6',
                  borderRadius: 12
                }}
              >
                <Ionicons name="analytics" size={16} color="white" />
                <Text style={{ marginLeft: 8, fontWeight: '500', color: 'white' }}>Assessment</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Data Source Info */}
        {dataSource !== 'loading' && (
          <View style={{
            padding: 12,
            marginBottom: 24,
            backgroundColor: '#f9fafb',
            borderRadius: 12
          }}>
            <Text style={{ fontSize: 12, textAlign: 'center', color: '#6b7280' }}>
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