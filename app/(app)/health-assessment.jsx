import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from "../components/config";
import { router, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

const HealthAssessmentScreen = () => {
  const params = useLocalSearchParams();
  const [assessmentData, setAssessmentData] = useState(null);
  const [riskFactors, setRiskFactors] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentWeek, setCurrentWeek] = useState(params?.currentWeek || 0);

  useEffect(() => {
    if (params?.riskAssessment && params?.aiRecommendations) {
      setAssessmentData({
        riskAssessment: params.riskAssessment,
        aiRecommendations: params.aiRecommendations,
        currentWeek: params.currentWeek
      });
    } else {
      fetchHealthAssessment();
    }
  }, []);

  const fetchHealthAssessment = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/health-tips/health-assessment`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data;
      setAssessmentData(data);
      setCurrentWeek(data.currentWeek || 0);
      
      // Process risk factors
      if (data.riskFactors) {
        setRiskFactors(data.riskFactors);
      }

      // Process recommendations
      if (data.aiRecommendations?.recommendations) {
        setRecommendations(data.aiRecommendations.recommendations);
      }

    } catch (error) {
      console.error('Fetch health assessment error:', error);
      Alert.alert('Error', 'Failed to fetch health assessment data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHealthAssessment();
    setRefreshing(false);
  }, []);

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'High Risk': 
        return { 
          bg: '#fef2f2', 
          text: '#b91c1c', 
          icon: 'warning', 
          accent: '#ef4444',
          gradient: ['#fee2e2', '#fef2f2']
        };
      case 'Medium Risk': 
        return { 
          bg: '#fefce8', 
          text: '#a16207', 
          icon: 'alert-circle', 
          accent: '#f59e0b',
          gradient: ['#fef3c7', '#fefce8']
        };
      case 'Low Risk': 
        return { 
          bg: '#f0fdf4', 
          text: '#15803d', 
          icon: 'checkmark-circle', 
          accent: '#10b981',
          gradient: ['#dcfce7', '#f0fdf4']
        };
      default: 
        return { 
          bg: '#f9fafb', 
          text: '#6b7280', 
          icon: 'help-circle', 
          accent: '#9ca3af',
          gradient: ['#f3f4f6', '#f9fafb']
        };
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' };
      case 'medium': return { bg: '#fefce8', text: '#a16207', border: '#fef3c7' };
      case 'low': return { bg: '#f0fdf4', text: '#15803d', border: '#dcfce7' };
      default: return { bg: '#f9fafb', text: '#6b7280', border: '#f3f4f6' };
    }
  };

  const handleRetakeAssessment = () => {
    router.push('./consultation');
  };

  const handleViewDetailedReport = () => {
    router.push('./detailed-report', {
      assessmentData: JSON.stringify(assessmentData),
      riskFactors: JSON.stringify(riskFactors)
    });
  };

  const handleScheduleConsultation = () => {
    Alert.alert(
      'Schedule Consultation',
      'Would you like to schedule a consultation with a healthcare provider?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Schedule', onPress: () => router.push('./consultation') }
      ]
    );
  };

  const renderOverviewTab = () => {
    const riskAssessment = assessmentData?.riskAssessment || params?.riskAssessment;
    const aiRecommendations = assessmentData?.aiRecommendations || params?.aiRecommendations;
    
    if (!riskAssessment) {
      return (
        <View style={{ alignItems: 'center', padding: 24 }}>
          <Ionicons name="analytics-outline" size={64} color="#9ca3af" />
          <Text style={{ marginTop: 16, fontSize: 18, fontWeight: '600', color: '#374151' }}>
            No Assessment Data
          </Text>
          <Text style={{ marginTop: 8, textAlign: 'center', color: '#6b7280' }}>
            Complete a health assessment to see your personalized risk analysis
          </Text>
          <TouchableOpacity
            onPress={handleRetakeAssessment}
            style={{
              marginTop: 16,
              paddingHorizontal: 24,
              paddingVertical: 12,
              backgroundColor: '#10b981',
              borderRadius: 12
            }}
          >
            <Text style={{ color: 'white', fontWeight: '500' }}>Take Assessment</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const riskColors = getRiskLevelColor(riskAssessment.risk_level);

    return (
      <View>
        {/* Risk Level Card */}
        <View style={{
          padding: 24,
          marginBottom: 20,
          backgroundColor: riskColors.bg,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: riskColors.accent + '20',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: riskColors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12
            }}>
              <Ionicons name={riskColors.icon} size={40} color="white" />
            </View>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: riskColors.text,
              textAlign: 'center'
            }}>
              {riskAssessment.risk_level}
            </Text>
            <Text style={{
              fontSize: 16,
              color: riskColors.text,
              textAlign: 'center',
              opacity: 0.8
            }}>
              Confidence: {Math.round(riskAssessment.confidence * 100)}%
            </Text>
          </View>

          <View style={{
            padding: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: 12,
            marginBottom: 16
          }}>
            <Text style={{
              fontSize: 16,
              color: riskColors.text,
              textAlign: 'center',
              lineHeight: 22
            }}>
              {riskAssessment.recommendation}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={handleViewDetailedReport}
              style={{
                flex: 1,
                paddingVertical: 12,
                backgroundColor: riskColors.accent,
                borderRadius: 12,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: 'white', fontWeight: '500' }}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleScheduleConsultation}
              style={{
                flex: 1,
                paddingVertical: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: riskColors.accent
              }}
            >
              <Text style={{ color: riskColors.text, fontWeight: '500' }}>Consult</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={{
          flexDirection: 'row',
          gap: 12,
          marginBottom: 20
        }}>
          <View style={{
            flex: 1,
            padding: 16,
            backgroundColor: 'white',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            alignItems: 'center'
          }}>
            <Ionicons name="calendar" size={24} color="#10b981" />
            <Text style={{ marginTop: 8, fontSize: 20, fontWeight: 'bold', color: '#065f46' }}>
              {currentWeek}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>Weeks</Text>
          </View>
          <View style={{
            flex: 1,
            padding: 16,
            backgroundColor: 'white',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            alignItems: 'center'
          }}>
            <Ionicons name="trending-up" size={24} color="#3b82f6" />
            <Text style={{ marginTop: 8, fontSize: 20, fontWeight: 'bold', color: '#1e40af' }}>
              {Math.round(riskAssessment.confidence * 100)}%
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>Accuracy</Text>
          </View>
          <View style={{
            flex: 1,
            padding: 16,
            backgroundColor: 'white',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            alignItems: 'center'
          }}>
            <Ionicons name="shield-checkmark" size={24} color="#8b5cf6" />
            <Text style={{ marginTop: 8, fontSize: 20, fontWeight: 'bold', color: '#7c3aed' }}>
              {riskFactors.length || 0}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>Factors</Text>
          </View>
        </View>

        {/* AI Recommendations Preview */}
        {aiRecommendations && (
          <View style={{
            padding: 20,
            backgroundColor: 'white',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            marginBottom: 20
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="bulb" size={20} color="#f59e0b" />
              <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#374151' }}>
                AI Recommendations
              </Text>
              <View style={{
                marginLeft: 12,
                paddingHorizontal: 8,
                paddingVertical: 4,
                backgroundColor: '#fef3c7',
                borderRadius: 20
              }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#a16207' }}>
                  {aiRecommendations.category}
                </Text>
              </View>
            </View>
            <Text style={{ color: '#6b7280', lineHeight: 20, marginBottom: 12 }}>
              Based on your assessment, here are personalized recommendations:
            </Text>
            {aiRecommendations.tips && aiRecommendations.tips.slice(0, 2).map((tip, index) => (
              <View key={index} style={{ flexDirection: 'row', marginBottom: 8 }}>
                <View style={{
                  width: 6,
                  height: 6,
                  backgroundColor: '#10b981',
                  borderRadius: 3,
                  marginTop: 8,
                  marginRight: 12
                }} />
                <Text style={{ flex: 1, color: '#4b5563', lineHeight: 20 }}>
                  {tip}
                </Text>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => setActiveTab('recommendations')}
              style={{
                marginTop: 8,
                alignSelf: 'flex-start'
              }}
            >
              <Text style={{ color: '#10b981', fontWeight: '500', fontSize: 14 }}>
                View all recommendations →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={handleRetakeAssessment}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 16,
              backgroundColor: '#f3f4f6',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e5e7eb'
            }}
          >
            <Ionicons name="refresh" size={20} color="#6b7280" />
            <Text style={{ marginLeft: 8, fontWeight: '500', color: '#374151' }}>
              Retake Assessment
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRiskFactorsTab = () => {
    const mockRiskFactors = riskFactors.length > 0 ? riskFactors : [
      { factor: 'Age', level: 'Low', description: 'Within normal range for pregnancy', impact: 'Minimal impact on pregnancy risk' },
      { factor: 'BMI', level: 'Medium', description: 'Slightly above recommended range', impact: 'Monitor weight gain closely' },
      { factor: 'Medical History', level: 'Low', description: 'No significant medical conditions', impact: 'No additional monitoring needed' },
      { factor: 'Previous Pregnancies', level: 'Low', description: 'Normal pregnancy history', impact: 'Positive indicator for current pregnancy' }
    ];

    return (
      <View>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#374151',
          marginBottom: 16
        }}>
          Risk Factor Analysis
        </Text>
        {mockRiskFactors.map((factor, index) => {
          const colors = getPriorityColor(factor.level);
          return (
            <View
              key={index}
              style={{
                padding: 20,
                marginBottom: 16,
                backgroundColor: 'white',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
                  {factor.factor}
                </Text>
                <View style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: colors.bg,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.border
                }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: colors.text
                  }}>
                    {factor.level} Risk
                  </Text>
                </View>
              </View>
              <Text style={{ color: '#6b7280', marginBottom: 8, lineHeight: 20 }}>
                {factor.description}
              </Text>
              <Text style={{ color: '#4b5563', fontSize: 14, fontStyle: 'italic' }}>
                Impact: {factor.impact}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderRecommendationsTab = () => {
    const aiRecommendations = assessmentData?.aiRecommendations || params?.aiRecommendations;
    
    if (!aiRecommendations?.tips) {
      return (
        <View style={{ alignItems: 'center', padding: 24 }}>
          <Ionicons name="bulb-outline" size={64} color="#9ca3af" />
          <Text style={{ marginTop: 16, fontSize: 18, fontWeight: '600', color: '#374151' }}>
            No Recommendations Available
          </Text>
          <Text style={{ marginTop: 8, textAlign: 'center', color: '#6b7280' }}>
            Complete your health assessment to get personalized recommendations
          </Text>
        </View>
      );
    }

    return (
      <View>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 16
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#374151'
          }}>
            Personalized Recommendations
          </Text>
          <View style={{
            marginLeft: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: '#fef3c7',
            borderRadius: 20
          }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#a16207' }}>
              {aiRecommendations.category}
            </Text>
          </View>
        </View>

        <View style={{
          padding: 16,
          marginBottom: 20,
          backgroundColor: '#f0fdf4',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#dcfce7'
        }}>
          <Text style={{ color: '#15803d', fontWeight: '500', marginBottom: 4 }}>
            Confidence Level: {Math.round(aiRecommendations.confidence * 100)}%
          </Text>
          <Text style={{ color: '#166534', fontSize: 14 }}>
            These recommendations are tailored to your current pregnancy week and risk assessment.
          </Text>
        </View>

        {aiRecommendations.tips.map((tip, index) => (
          <View
            key={index}
            style={{
              padding: 20,
              marginBottom: 16,
              backgroundColor: 'white',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{
                width: 32,
                height: 32,
                backgroundColor: '#10b981',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: '#374151',
                  lineHeight: 22,
                  marginBottom: 8
                }}>
                  {tip}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={{ marginLeft: 4, fontSize: 12, color: '#10b981', fontWeight: '500' }}>
                    Week {currentWeek} Relevant
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        <View style={{
          padding: 16,
          backgroundColor: '#f8fafc',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#e2e8f0'
        }}>
          <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center' }}>
            These recommendations are generated based on your health assessment and current pregnancy week. 
            Always consult with your healthcare provider for medical advice.
          </Text>
        </View>
      </View>
    );
  };

  const tabs = [
    { id: 'overview', title: 'Overview', icon: 'analytics' },
    { id: 'factors', title: 'Risk Factors', icon: 'warning' },
    { id: 'recommendations', title: 'Recommendations', icon: 'bulb' },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f0fdf4' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading assessment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0fdf4' }}>
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24
        }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#065f46' }}>
              Health Assessment
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              Week {currentWeek} • Personalized Analysis
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: activeTab === tab.id ? '#10b981' : 'white',
                  borderWidth: activeTab === tab.id ? 0 : 1,
                  borderColor: '#e5e7eb',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={activeTab === tab.id ? 'white' : '#6b7280'}
                />
                <Text style={{
                  marginLeft: 6,
                  fontWeight: '500',
                  color: activeTab === tab.id ? 'white' : '#374151'
                }}>
                  {tab.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Tab Content */}
        <View style={{ marginBottom: 24 }}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'factors' && renderRiskFactorsTab()}
          {activeTab === 'recommendations' && renderRecommendationsTab()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HealthAssessmentScreen;