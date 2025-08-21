import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { API_BASE_URL } from "../components/config";
import { router } from 'expo-router';

const KickCountHistory = () => {
  const [kickData, setKickData] = useState({
    kickCounts: [],
    dailyAverages: {},
    summary: {
      totalSessions: 0,
      totalKicks: 0,
      averagePerSession: 0
    }
  });
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [chartType, setChartType] = useState('line');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  
 
  useEffect(() => {
    fetchKickData();
    fetchChartData();
  }, [selectedPeriod]);

  const fetchKickData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/kick-count`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { days: selectedPeriod },
      });
      
      setKickData({
        kickCounts: response.data.kickCounts || [],
        dailyAverages: response.data.dailyAverages || {},
        summary: response.data.summary || {
          totalSessions: 0,
          totalKicks: 0,
          averagePerSession: 0
        }
      });
    } catch (error) {
      console.error('Fetch kick data error:', error);
      const errorMessage =
        error.response?.data?.error || 'Failed to fetch kick count data';
      Alert.alert('Error', errorMessage);
    }
  };

  const fetchChartData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found');
        setIsLoading(false);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/kick-count/chart`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { days: selectedPeriod },
      });
      
      console.log('Chart response:', response.data); // Debug log
      
      const chartResponse = response.data.chart.data;
      
      // Format labels to show only day/month for better readability
      const formattedLabels = chartResponse.labels.map(label => {
        const date = new Date(label);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      });

      const chartDataToSet = {
        labels: formattedLabels,
        datasets: [{
          data: chartResponse.datasets[0].data.length > 0 
            ? chartResponse.datasets[0].data 
            : [0], // Ensure at least one data point for chart rendering
          color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
          strokeWidth: 3,
        }],
      };

      console.log('Setting chart data:', chartDataToSet); // Debug log
      setChartData(chartDataToSet);

    } catch (error) {
      console.error('Chart fetch error:', error);
      const errorMessage =
        error.response?.data?.error || 'Failed to fetch chart data';
      Alert.alert('Error', errorMessage);
      
      // Set empty chart data on error
      setChartData({
        labels: ['No Data'],
        datasets: [{ data: [0] }],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchKickData(), fetchChartData()]);
    setRefreshing(false);
  };

  const handlePeriodChange = async (newPeriod) => {
    console.log('Changing period to:', newPeriod); // Debug log
    setSelectedPeriod(newPeriod);
    setIsLoading(true);
    // The useEffect will handle the data fetching
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInsightMessage = () => {
    const { summary } = kickData;
    const avgPerSession = summary?.averagePerSession || 0;
    
    if (avgPerSession >= 10) {
      return {
        message: "Excellent! Your baby is very active with healthy movement patterns.",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        icon: "checkmark-circle"
      };
    } else if (avgPerSession >= 6) {
      return {
        message: "Good activity levels. Continue monitoring regularly.",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        icon: "information-circle"
      };
    } else if (avgPerSession > 0) {
      return {
        message: "Lower than usual activity. Consider discussing with your healthcare provider.",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        icon: "warning"
      };
    } else {
      return {
        message: "Start tracking to see your baby's movement patterns.",
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
        icon: "heart"
      };
    }
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '3',
      stroke: '#8B5CF6',
    },
    propsForBackgroundLines: {
      strokeWidth: 1,
      stroke: '#e5e7eb',
    },
  };

  const barChartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  const insight = getInsightMessage();
  const hasChartData = chartData.labels.length > 1 && chartData.datasets[0].data.some(val => val > 0);

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-purple-50 to-white">
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-purple-600">Kick History</Text>
          <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
            <Ionicons 
              name={refreshing ? "hourglass" : "refresh"} 
              size={24} 
              color="#8B5CF6" 
            />
          </TouchableOpacity>
        </View>

        

        {/* Summary Statistics */}
        <View className="p-4 mb-6 bg-white border border-purple-100 shadow-sm rounded-2xl">
          <Text className="mb-4 text-lg font-semibold text-purple-600">
            Summary ({selectedPeriod} days)
          </Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl font-bold text-purple-600">
                {kickData.summary?.totalKicks || 0}
              </Text>
              <Text className="text-sm text-gray-600">Total Kicks</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-purple-600">
                {kickData.summary?.totalSessions || 0}
              </Text>
              <Text className="text-sm text-gray-600">Sessions</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-purple-600">
                {kickData.summary?.averagePerSession || 0}
              </Text>
              <Text className="text-sm text-gray-600">Avg/Session</Text>
            </View>
          </View>
        </View>

        {/* Chart Type Toggle */}
        <View className="flex-row justify-center mb-4 space-x-2">
          <TouchableOpacity
            onPress={() => setChartType('line')}
            className={`px-4 py-2 rounded-xl ${
              chartType === 'line'
                ? 'bg-purple-600'
                : 'bg-gray-200'
            }`}
          >
            <Text className={`font-semibold ${
              chartType === 'line' ? 'text-white' : 'text-gray-600'
            }`}>
              Line Chart
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setChartType('bar')}
            className={`px-4 py-2 rounded-xl ${
              chartType === 'bar'
                ? 'bg-purple-600'
                : 'bg-gray-200'
            }`}
          >
            <Text className={`font-semibold ${
              chartType === 'bar' ? 'text-white' : 'text-gray-600'
            }`}>
              Bar Chart
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chart Section */}
        <View className="p-4 mb-6 bg-white border border-purple-100 shadow-sm rounded-2xl">
          <Text className="mb-4 text-lg font-semibold text-purple-600">
            Daily Average Kicks
          </Text>
          
          {isLoading ? (
            <View className="items-center justify-center h-40">
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text className="mt-2 text-gray-500">Loading chart...</Text>
            </View>
          ) : hasChartData ? (
            <View className="items-center">
              {chartType === 'line' ? (
                <LineChart
                  data={chartData}
                  width={screenWidth - 60}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                />
              ) : (
                <BarChart
                  data={chartData}
                  width={screenWidth - 60}
                  height={220}
                  chartConfig={barChartConfig}
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                  showValuesOnTopOfBars
                />
              )}
            </View>
          ) : (
            <View className="items-center justify-center h-40">
              <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
              <Text className="mt-2 text-gray-500">No data available for chart</Text>
              <Text className="text-sm text-gray-400">Start tracking to see trends</Text>
            </View>
          )}
        </View>

        {/* Insights */}
        <View className={`p-4 mb-6 ${insight.bgColor} border ${insight.borderColor} rounded-2xl`}>
          <View className="flex-row items-center mb-2">
            <Ionicons name={insight.icon} size={20} color={insight.color.replace('text-', '#')} />
            <Text className={`ml-2 font-semibold ${insight.color}`}>Insights</Text>
          </View>
          <Text className={`text-sm leading-5 ${insight.color}`}>
            {insight.message}
          </Text>
        </View>

        {/* Recent Sessions List */}
        {kickData.kickCounts && kickData.kickCounts.length > 0 && (
          <View className="p-4 mb-6 bg-white border border-purple-100 shadow-sm rounded-2xl">
            <Text className="mb-4 text-lg font-semibold text-purple-600">
              Recent Sessions
            </Text>
            {kickData.kickCounts.slice(0, 10).map((session, index) => (
              <View
                key={session.id || index}
                className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
              >
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <View className="w-3 h-3 mr-3 rounded-full bg-purple-600"></View>
                    <Text className="font-semibold text-gray-800">
                      {session.count} kicks
                    </Text>
                  </View>
                  {session.notes && (
                    <Text className="mt-1 ml-6 text-sm text-gray-600">
                      {session.notes}
                    </Text>
                  )}
                </View>
                <View className="items-end">
                  <Text className="text-sm font-medium text-purple-600">
                    {formatDate(session.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
            
            {kickData.kickCounts.length > 10 && (
              <TouchableOpacity className="pt-3 mt-2 border-t border-gray-100">
                <Text className="font-semibold text-center text-purple-600">
                  View All Sessions ({kickData.kickCounts.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Daily Averages */}
        {kickData.dailyAverages && Object.keys(kickData.dailyAverages).length > 0 && (
          <View className="p-4 mb-6 bg-white border border-purple-100 shadow-sm rounded-2xl">
            <Text className="mb-4 text-lg font-semibold text-purple-600">
              Daily Breakdown
            </Text>
            {Object.entries(kickData.dailyAverages)
              .sort(([a], [b]) => new Date(b) - new Date(a))
              .slice(0, 7)
              .map(([date, data]) => (
              <View
                key={date}
                className="flex-row items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
              >
                <Text className="font-medium text-gray-800">
                  {new Date(date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
                <View className="flex-row space-x-4">
                  <Text className="text-sm text-gray-600">
                    {data.sessions} sessions
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {data.total} total kicks
                  </Text>
                  <Text className="font-semibold text-purple-600">
                    {data.average} avg
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {(!kickData.kickCounts || kickData.kickCounts.length === 0) && !isLoading && (
          <View className="items-center justify-center py-12">
            <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
            <Text className="mt-4 text-lg font-medium text-gray-500">
              No kick data yet
            </Text>
            <Text className="mt-2 text-center text-gray-400">
              Start tracking your baby's kicks to see charts and trends
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="px-6 py-3 mt-4 bg-purple-600 rounded-2xl"
            >
              <Text className="font-semibold text-white">Start Tracking</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default KickCountHistory;