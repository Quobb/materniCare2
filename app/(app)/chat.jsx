import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from "./../components/config";
import { router } from 'expo-router';
const ChatScreen = () => {
  const [activeMode, setActiveMode] = useState('chat');
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef(null);
  
  const [healthData, setHealthData] = useState({
    age: 28,
    gestational_age: 16,
    weight_pre_pregnancy: 65,
    height: 165,
    systolic_bp: 120,
    diastolic_bp: 80,
  });

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [chatMessages]);

  const loadChatHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem('chatHistory');
      if (saved) {
        setChatMessages(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveChatHistory = async (messages) => {
    try {
      await AsyncStorage.setItem('chatHistory', JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: currentMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      let response;

      if (activeMode === 'chat') {
        // Regular chat endpoint
        response = await axios.post(
          `http://10.251.112.137:8000/chat`,
          {
            message: userMessage.content,
            user_id: 'current-user',
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );

        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: response.data.response,
          confidence: response.data.confidence,
          intent: response.data.intent,
          suggestions: response.data.suggestions || [],
          emergency: response.data.emergency || false,
          timestamp: new Date().toISOString(),
          mode: activeMode,
        };

        const updatedMessages = [...newMessages, botMessage];
        setChatMessages(updatedMessages);
        await saveChatHistory(updatedMessages);

      } else {
        // Integrated consultation endpoint
        response = await axios.post(
          `http://10.251.112.137:8000/integrated-consultation`,
          {
            message: userMessage.content,
            user_id: 'current-user',
            health_data: healthData,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );

        // Handle the integrated consultation response
        const responseData = response.data;
        
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: responseData.chat_response,
          confidence: null, // Not provided in integrated response
          
          // Extract risk information from predictions
          riskLevel: extractRiskLevel(responseData.prediction_results),
          riskFactors: responseData.clinical_insights || [],
          
          // Additional consultation data
          predictions: responseData.prediction_results,
          healthRecommendations: responseData.health_recommendations || [],
          clinicalInsights: responseData.clinical_insights || [],
          
          timestamp: new Date().toISOString(),
          mode: activeMode,
        };

        const updatedMessages = [...newMessages, botMessage];
        setChatMessages(updatedMessages);
        await saveChatHistory(updatedMessages);
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        error: true,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...newMessages, errorMessage];
      setChatMessages(updatedMessages);
      
      Alert.alert('Error', 'Unable to connect to health assistant');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to extract overall risk level from predictions
  const extractRiskLevel = (predictions) => {
    if (!predictions) return null;
    
    // Check if there's a direct risk_level prediction
    if (predictions.risk_level) {
      return predictions.risk_level.prediction;
    }
    
    // Count high-risk predictions
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    
    Object.values(predictions).forEach(pred => {
      if (pred.prediction === 1 || pred.prediction === 'High' || pred.prediction === 'Critical') {
        highRiskCount++;
      } else if (pred.prediction === 'Medium' || pred.prediction === 'Moderate') {
        mediumRiskCount++;
      }
    });
    
    if (highRiskCount > 0) return 'High';
    if (mediumRiskCount > 0) return 'Medium';
    return 'Low';
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            setChatMessages([]);
            await AsyncStorage.removeItem('chatHistory');
          },
        },
      ]
    );
  };

  const getRiskColor = (riskLevel) => {
    if (!riskLevel) return 'bg-gray-100 text-gray-700';
    
    switch (riskLevel.toLowerCase()) {
      case 'high': 
      case 'critical':
        return 'bg-red-100 text-red-700';
      case 'medium': 
      case 'moderate':
        return 'bg-yellow-100 text-yellow-700';
      case 'low': 
      case 'normal':
        return 'bg-green-100 text-green-700';
      default: 
        return 'bg-gray-100 text-gray-700';
    }
  };

  const renderBotMessageDetails = (message) => {
    if (message.error) return null;

    return (
      <View className="mt-3 pt-2 border-t border-gray-200">
        <View className="flex-row items-center justify-between mb-2">
          {/* Confidence Score */}
          {message.confidence && (
            <Text className="text-xs text-gray-600">
              {Math.round(message.confidence * 100)}% confident
            </Text>
          )}
          
          {/* Risk Level */}
          {message.riskLevel && (
            <View className={`px-2 py-1 rounded-full ${getRiskColor(message.riskLevel)}`}>
              <Text className="text-xs font-medium">
                {message.riskLevel}
              </Text>
            </View>
          )}

          {/* Emergency Flag */}
          {message.emergency && (
            <View className="px-2 py-1 bg-red-500 rounded-full">
              <Text className="text-xs font-medium text-white">
                ⚠️ URGENT
              </Text>
            </View>
          )}
        </View>

        {/* Risk Factors / Clinical Insights */}
        {message.riskFactors?.length > 0 && (
          <View className="mt-2">
            <Text className="text-xs text-gray-600 mb-1">
              {message.mode === 'consultation' ? 'Clinical Insights:' : 'Risk Factors:'}
            </Text>
            <View className="flex-row flex-wrap">
              {message.riskFactors.map((factor, index) => (
                <View key={index} className="mr-1 mb-1 px-2 py-1 bg-orange-100 rounded-full">
                  <Text className="text-xs text-orange-700">{factor}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Health Recommendations (for consultation mode) */}
        {message.healthRecommendations?.length > 0 && (
          <View className="mt-2">
            <Text className="text-xs text-gray-600 mb-1">Recommendations:</Text>
            {message.healthRecommendations.slice(0, 3).map((rec, index) => (
              <Text key={index} className="text-xs text-blue-700 mb-1">
                • {rec}
              </Text>
            ))}
          </View>
        )}

        {/* Suggestions (for chat mode) */}
        {message.suggestions?.length > 0 && (
          <View className="mt-2">
            <Text className="text-xs text-gray-600 mb-1">Suggestions:</Text>
            <View className="flex-row flex-wrap">
              {message.suggestions.slice(0, 2).map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentMessage(suggestion)}
                  className="mr-2 mb-1 px-2 py-1 bg-blue-50 rounded-full border border-blue-200"
                >
                  <Text className="text-xs text-blue-600">{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Intent (for chat mode) */}
        {message.intent && (
          <View className="mt-2">
            <Text className="text-xs text-gray-500">
              Topic: {message.intent.replace('_', ' ')}
            </Text>
          </View>
        )}

        <Text className="text-xs text-gray-500 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View className="bg-blue-600 px-4 py-4">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-white">Health Chat</Text>
            <TouchableOpacity onPress={clearChat}>
              <Ionicons name="trash-outline" size={22} color="white" />
            </TouchableOpacity>
          </View>

          {/* Mode Toggle */}
          <View className="flex-row bg-white/20 rounded-xl p-1">
            <TouchableOpacity
              onPress={() => setActiveMode('chat')}
              className={`flex-1 py-2 px-4 rounded-lg ${
                activeMode === 'chat' ? 'bg-white' : ''
              }`}
            >
              <Text className={`text-center text-sm font-medium ${
                activeMode === 'chat' ? 'text-blue-600' : 'text-white'
              }`}>
                Chat
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setActiveMode('consultation')}
              className={`flex-1 py-2 px-4 rounded-lg ${
                activeMode === 'consultation' ? 'bg-white' : ''
              }`}
            >
              <Text className={`text-center text-sm font-medium ${
                activeMode === 'consultation' ? 'text-blue-600' : 'text-white'
              }`}>
                Consultation
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Area */}
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="chatbubble-ellipses" size={28} color="#3B82F6" />
              </View>
              <Text className="text-lg font-semibold text-gray-800 mb-2">
                Start Your Health Chat
              </Text>
              <Text className="text-sm text-gray-600 text-center px-8 mb-6">
                {activeMode === 'chat' 
                  ? 'Ask general questions about pregnancy' 
                  : 'Get personalized consultation with your health data'}
              </Text>
              
              <View className="space-y-2">
                <TouchableOpacity
                  onPress={() => setCurrentMessage("I'm feeling anxious about labor")}
                  className="px-4 py-2 bg-blue-100 rounded-full"
                >
                  <Text className="text-sm text-blue-700">Labor concerns</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCurrentMessage("What should I eat?")}
                  className="px-4 py-2 bg-green-100 rounded-full"
                >
                  <Text className="text-sm text-green-700">Nutrition advice</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCurrentMessage("How am I doing? Should I be concerned?")}
                  className="px-4 py-2 bg-purple-100 rounded-full"
                >
                  <Text className="text-sm text-purple-700">Health check</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="space-y-4">
              {chatMessages.map((message) => (
                <View
                  key={message.id}
                  className={`flex-row ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <View
                    className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-blue-500 rounded-br-sm'
                        : message.error
                        ? 'bg-red-100 border border-red-200 rounded-bl-sm'
                        : 'bg-gray-100 rounded-bl-sm'
                    }`}
                  >
                    <Text
                      className={`text-sm leading-5 ${
                        message.type === 'user'
                          ? 'text-white'
                          : message.error
                          ? 'text-red-800'
                          : 'text-gray-800'
                      }`}
                    >
                      {message.content}
                    </Text>

                    {/* Bot Message Details */}
                    {message.type === 'bot' && renderBotMessageDetails(message)}

                    {/* User Message Timestamp */}
                    {message.type === 'user' && (
                      <Text className="text-xs text-white/70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View className="px-4 py-4 bg-white border-t border-gray-200">
          {activeMode === 'consultation' && (
            <View className="mb-3 p-3 bg-purple-50 rounded-xl">
              <View className="flex-row items-center">
                <Ionicons name="medical" size={16} color="#8B5CF6" />
                <Text className="ml-2 text-sm text-purple-700">
                  Week {healthData.gestational_age} • BP: {healthData.systolic_bp}/{healthData.diastolic_bp}
                </Text>
              </View>
            </View>
          )}

          <View className="flex-row items-end space-x-3">
            <View className="flex-1 bg-gray-100 rounded-2xl px-4 py-3">
              <TextInput
                value={currentMessage}
                onChangeText={setCurrentMessage}
                placeholder={
                  activeMode === 'chat' 
                    ? "Ask about pregnancy..." 
                    : "Describe your concerns..."
                }
                multiline
                className="text-sm text-gray-800 min-h-[20px]"
                editable={!isLoading}
              />
            </View>
            
            <TouchableOpacity
              onPress={sendMessage}
              disabled={isLoading || !currentMessage.trim()}
              className={`w-12 h-12 items-center justify-center rounded-full ${
                isLoading || !currentMessage.trim() ? 'bg-gray-300' : 'bg-blue-500'
              }`}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;