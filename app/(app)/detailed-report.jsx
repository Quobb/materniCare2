import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from "../components/config";

const DetailedReportScreen = () => {
  const params = useLocalSearchParams();
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('summary');

  useEffect(() => {
    if (params?.assessmentData && params?.riskFactors) {
      try {
        const assessmentData = JSON.parse(params.assessmentData);
        const riskFactors = JSON.parse(params.riskFactors);
        setReportData({ assessmentData, riskFactors });
      } catch (error) {
        console.error('Error parsing data:', error);
        fetchDetailedReport();
      }
    } else {
      fetchDetailedReport();
    }
  }, []);

  const fetchDetailedReport = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/health-tips/detailed-report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReportData(response.data);
    } catch (error) {
      console.error('Fetch detailed report error:', error);
      Alert.alert('Error', 'Failed to fetch detailed report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareReport = async () => {
    try {
      const reportContent = generateReportText();
      await Share.share({
        message: reportContent,
        title: 'Pregnancy Health Assessment Report',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share report');
    }
  };

  const generateReportText = () => {
    if (!reportData?.assessmentData?.riskAssessment) return '';
    
    const { riskAssessment, aiRecommendations } = reportData.assessmentData;
    return `
Pregnancy Health Assessment Report

Risk Level: ${riskAssessment.risk_level}
Confidence: ${Math.round(riskAssessment.confidence * 100)}%
Recommendation: ${riskAssessment.recommendation}

Generated on: ${new Date().toLocaleDateString()}
    `;
  };

  const getRiskLevelStyle = (riskLevel) => {
    switch (riskLevel) {
      case 'High Risk':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'Medium Risk':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'Low Risk':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getRiskIconColor = (riskLevel) => {
    switch (riskLevel) {
      case 'High Risk': return '#dc2626';
      case 'Medium Risk': return '#d97706';
      case 'Low Risk': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const renderSummarySection = () => {
    const { riskAssessment, aiRecommendations, currentWeek } = reportData?.assessmentData || {};
    
    if (!riskAssessment) {
      return (
        <View className="items-center py-12">
          <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
          <Text className="mt-4 text-lg font-semibold text-gray-900">No Report Data</Text>
          <Text className="mt-2 text-center text-gray-500">Unable to generate detailed report</Text>
        </View>
      );
    }

    return (
      <View>
        {/* Executive Summary */}
        <View className={`p-6 rounded-2xl border-2 mb-6 ${getRiskLevelStyle(riskAssessment.risk_level)}`}>
          <View className="flex-row items-center mb-4">
            <View className="items-center justify-center w-12 h-12 mr-4 bg-white rounded-full">
              <Ionicons 
                name={riskAssessment.risk_level === 'High Risk' ? 'warning' : 
                     riskAssessment.risk_level === 'Medium Risk' ? 'alert-circle' : 'checkmark-circle'} 
                size={24} 
                color={getRiskIconColor(riskAssessment.risk_level)} 
              />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-xl font-bold">{riskAssessment.risk_level}</Text>
              <Text className="text-sm opacity-80">
                Assessment Confidence: {Math.round(riskAssessment.confidence * 100)}%
              </Text>
            </View>
          </View>
          
          <View className="p-4 bg-white bg-opacity-60 rounded-xl">
            <Text className="text-base leading-6">{riskAssessment.recommendation}</Text>
          </View>
        </View>

        {/* Key Metrics */}
        <View className="p-6 mb-6 bg-white border border-gray-200 rounded-2xl">
          <Text className="mb-4 text-lg font-semibold text-gray-900">Key Metrics</Text>
          <View className="flex-row">
            <View className="items-center flex-1 p-4 mr-3 bg-blue-50 rounded-xl">
              <Ionicons name="calendar" size={24} color="#3b82f6" />
              <Text className="mt-2 text-2xl font-bold text-blue-600">{currentWeek || 0}</Text>
              <Text className="text-sm text-blue-600">Weeks</Text>
            </View>
            <View className="items-center flex-1 p-4 mr-3 bg-green-50 rounded-xl">
              <Ionicons name="trending-up" size={24} color="#10b981" />
              <Text className="mt-2 text-2xl font-bold text-green-600">
                {Math.round(riskAssessment.confidence * 100)}%
              </Text>
              <Text className="text-sm text-green-600">Accuracy</Text>
            </View>
            <View className="items-center flex-1 p-4 bg-purple-50 rounded-xl">
              <Ionicons name="analytics" size={24} color="#8b5cf6" />
              <Text className="mt-2 text-2xl font-bold text-purple-600">
                {reportData?.riskFactors?.length || 4}
              </Text>
              <Text className="text-sm text-purple-600">Factors</Text>
            </View>
          </View>
        </View>

        {/* AI Insights */}
        {aiRecommendations && (
          <View className="p-6 mb-6 border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl">
            <View className="flex-row items-center mb-4">
              <View className="items-center justify-center w-10 h-10 mr-3 bg-indigo-100 rounded-full">
                <Ionicons name="bulb" size={20} color="#6366f1" />
              </View>
              <View>
                <Text className="text-lg font-semibold text-indigo-900">AI-Powered Insights</Text>
                <Text className="text-sm text-indigo-600">{aiRecommendations.category} Focus</Text>
              </View>
            </View>
            <View className="p-4 bg-white bg-opacity-70 rounded-xl">
              <Text className="leading-6 text-indigo-800">
                Based on advanced analysis of your health data, our AI model has identified personalized recommendations 
                with {Math.round(aiRecommendations.confidence * 100)}% confidence level.
              </Text>
            </View>
          </View>
        )}

        {/* Report Generation Info */}
        <View className="p-4 border border-gray-200 bg-gray-50 rounded-xl">
          <Text className="text-sm text-center text-gray-600">
            Report generated on {new Date().toLocaleDateString()} • 
            Based on current health assessment data
          </Text>
        </View>
      </View>
    );
  };

  const renderRiskAnalysisSection = () => {
    const mockRiskFactors = reportData?.riskFactors || [
      { 
        factor: 'Maternal Age', 
        level: 'Low', 
        value: '28 years',
        description: 'Within optimal range for pregnancy',
        impact: 'Minimal risk factor. Age is within the recommended range for pregnancy.',
        recommendation: 'Continue with standard prenatal care schedule.'
      },
      { 
        factor: 'Body Mass Index (BMI)', 
        level: 'Medium', 
        value: '26.5',
        description: 'Slightly above normal weight range',
        impact: 'Moderate risk factor. May increase chances of gestational diabetes.',
        recommendation: 'Monitor weight gain closely and maintain healthy diet.'
      },
      { 
        factor: 'Medical History', 
        level: 'Low', 
        value: 'No significant conditions',
        description: 'No previous medical complications',
        impact: 'No additional risk from medical history.',
        recommendation: 'Continue regular health monitoring.'
      },
      { 
        factor: 'Previous Pregnancies', 
        level: 'Low', 
        value: '1 previous normal delivery',
        description: 'One successful previous pregnancy',
        impact: 'Positive indicator for current pregnancy outcome.',
        recommendation: 'Experience may help with current pregnancy management.'
      },
    ];

    return (
      <View>
        <Text className="mb-6 text-lg font-semibold text-gray-900">Comprehensive Risk Analysis</Text>
        
        {mockRiskFactors.map((factor, index) => (
          <View key={index} className="p-6 mb-4 bg-white border border-gray-200 shadow-sm rounded-2xl">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="flex-1 text-lg font-semibold text-gray-900">{factor.factor}</Text>
              <View className={`px-3 py-1 rounded-full border ${getPriorityStyle(factor.level)}`}>
                <Text className="text-xs font-medium">{factor.level} Risk</Text>
              </View>
            </View>
            
            <View className="p-4 mb-4 bg-gray-50 rounded-xl">
              <Text className="mb-1 text-sm font-medium text-gray-700">Current Value:</Text>
              <Text className="text-base text-gray-900">{factor.value}</Text>
            </View>
            
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-gray-700">Assessment:</Text>
              <Text className="leading-5 text-gray-600">{factor.description}</Text>
            </View>
            
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-gray-700">Impact Analysis:</Text>
              <Text className="leading-5 text-gray-600">{factor.impact}</Text>
            </View>
            
            <View className="p-4 border border-blue-200 bg-blue-50 rounded-xl">
              <Text className="mb-1 text-sm font-medium text-blue-800">Recommendation:</Text>
              <Text className="leading-5 text-blue-700">{factor.recommendation}</Text>
            </View>
          </View>
        ))}
        
        <View className="p-4 mt-4 border bg-amber-50 border-amber-200 rounded-xl">
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle" size={20} color="#d97706" />
            <Text className="ml-2 font-medium text-amber-800">Important Note</Text>
          </View>
          <Text className="text-sm leading-5 text-amber-700">
            This analysis is based on available data and AI assessment. Always consult with your healthcare 
            provider for comprehensive medical evaluation and personalized care recommendations.
          </Text>
        </View>
      </View>
    );
  };

  const renderRecommendationsSection = () => {
    const { aiRecommendations } = reportData?.assessmentData || {};
    
    if (!aiRecommendations?.tips) {
      return (
        <View className="items-center py-12">
          <Ionicons name="bulb-outline" size={64} color="#9ca3af" />
          <Text className="mt-4 text-lg font-semibold text-gray-900">No Recommendations</Text>
          <Text className="mt-2 text-center text-gray-500">Complete assessment for personalized recommendations</Text>
        </View>
      );
    }

    const categorizedRecommendations = {
      'Immediate Actions': aiRecommendations.tips.slice(0, 2),
      'Weekly Goals': aiRecommendations.tips.slice(2, 4) || [],
      'Long-term Planning': aiRecommendations.tips.slice(4) || []
    };

    return (
      <View>
        <View className="flex-row items-center mb-6">
          <Text className="flex-1 text-lg font-semibold text-gray-900">Detailed Recommendations</Text>
          <View className="px-3 py-1 bg-purple-100 rounded-full">
            <Text className="text-xs font-medium text-purple-700">{aiRecommendations.category}</Text>
          </View>
        </View>

        <View className="p-4 mb-6 border border-purple-200 bg-purple-50 rounded-xl">
          <View className="flex-row items-center mb-2">
            <Ionicons name="star" size={20} color="#8b5cf6" />
            <Text className="ml-2 font-medium text-purple-800">AI Confidence Level</Text>
          </View>
          <Text className="text-sm text-purple-700">
            These recommendations are generated with {Math.round(aiRecommendations.confidence * 100)}% confidence 
            based on your health profile and current pregnancy week.
          </Text>
        </View>

        {Object.entries(categorizedRecommendations).map(([category, recommendations]) => (
          recommendations.length > 0 && (
            <View key={category} className="mb-6">
              <Text className="mb-3 text-base font-semibold text-gray-800">{category}</Text>
              {recommendations.map((recommendation, index) => (
                <View key={index} className="p-5 mb-3 bg-white border border-gray-200 shadow-sm rounded-xl">
                  <View className="flex-row items-start">
                    <View className="items-center justify-center w-8 h-8 mt-1 mr-4 bg-green-100 rounded-full">
                      <Text className="text-sm font-bold text-green-600">{index + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="mb-3 leading-6 text-gray-900">{recommendation}</Text>
                      <View className="flex-row items-center">
                        <Ionicons name="time" size={14} color="#6b7280" />
                        <Text className="ml-1 text-xs text-gray-500">
                          {category === 'Immediate Actions' ? 'Start immediately' :
                           category === 'Weekly Goals' ? 'Implement this week' :
                           'Plan for coming weeks'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )
        ))}

        <View className="p-4 border border-green-200 bg-green-50 rounded-xl">
          <View className="flex-row items-center mb-2">
            <Ionicons name="shield-checkmark" size={20} color="#16a34a" />
            <Text className="ml-2 font-medium text-green-800">Follow-up Reminder</Text>
          </View>
          <Text className="text-sm leading-5 text-green-700">
            Review these recommendations regularly and discuss them with your healthcare provider during 
            your next appointment. Your care plan may be adjusted based on your progress.
          </Text>
        </View>
      </View>
    );
  };

  const sections = [
    { id: 'summary', title: 'Summary', icon: 'document-text' },
    { id: 'analysis', title: 'Risk Analysis', icon: 'analytics' },
    { id: 'recommendations', title: 'Recommendations', icon: 'bulb' },
  ];

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-green-50">
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color="#10B981" />
          <Text className="mt-4 text-gray-600">Generating detailed report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-green-50">
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-green-800">Detailed Report</Text>
            <Text className="text-sm text-gray-600">Comprehensive Health Assessment</Text>
          </View>
          <View className="flex-row space-x-3">
            <TouchableOpacity 
              onPress={handleShareReport}
              className="items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-full shadow-sm"
            >
              <Ionicons name="share-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.back()}
              className="items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-full shadow-sm"
            >
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          <View className="flex-row space-x-3">
            {sections.map((section) => (
              <TouchableOpacity
                key={section.id}
                onPress={() => setActiveSection(section.id)}
                className={`flex-row items-center px-4 py-3 rounded-xl border ${
                  activeSection === section.id
                    ? 'bg-green-600 border-green-600'
                    : 'bg-white border-gray-200'
                } shadow-sm`}
              >
                <Ionicons
                  name={section.icon}
                  size={18}
                  color={activeSection === section.id ? 'white' : '#6b7280'}
                />
                <Text className={`ml-2 font-medium ${
                  activeSection === section.id ? 'text-white' : 'text-gray-700'
                }`}>
                  {section.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Content Sections */}
        <View className="mb-6">
          {activeSection === 'summary' && renderSummarySection()}
          {activeSection === 'analysis' && renderRiskAnalysisSection()}
          {activeSection === 'recommendations' && renderRecommendationsSection()}
        </View>

        {/* Footer Actions */}
        <View className="flex-row pb-6 space-x-3">
          <TouchableOpacity
            onPress={() => router.push('./health-assessment')}
            className="items-center flex-1 py-4 bg-gray-100 border border-gray-200 rounded-xl"
          >
            <Text className="font-medium text-gray-700">Back to Assessment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShareReport}
            className="items-center flex-1 py-4 bg-green-600 rounded-xl"
          >
            <Text className="font-medium text-white">Share Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DetailedReportScreen;