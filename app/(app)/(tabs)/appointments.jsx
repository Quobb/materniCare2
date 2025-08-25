import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  Pressable,
  Dimensions,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from "../../components/config";

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const { height: screenHeight } = Dimensions.get('window');

const AppointmentsScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [modalAnimation] = useState(new Animated.Value(0));
  const [datePickerMode, setDatePickerMode] = useState('add'); // 'add' or 'update'
  const [timePickerMode, setTimePickerMode] = useState('add');
  
  const [newAppointment, setNewAppointment] = useState({
    type: '',
    doctor_id: '',
    appointment_date: new Date(),
    time: new Date(),
    notes: '',
    reminder: true,
  });

  const [updateAppointment, setUpdateAppointment] = useState({
    type: '',
    doctor_id: '',
    appointment_date: new Date(),
    time: new Date(),
    notes: '',
    reminder: true,
  });

  const appointmentTypes = [
    'Prenatal Checkup',
    'Ultrasound',
    'Blood Test',
    'Glucose Test',
    'Consultation',
    'Emergency Visit',
    'Vaccination',
    'Specialist Visit',
  ];

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
    registerForPushNotificationsAsync();
  }, []);

  // Register for push notifications
  const registerForPushNotificationsAsync = async () => {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert('Permission Required', 'Push notifications are needed for appointment reminders.');
        return;
      }
      
      try {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })).data;
      } catch (error) {
        console.log('Push token error:', error);
      }
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  };

  // Schedule notification for appointment
  const scheduleAppointmentReminder = async (appointment) => {
    if (!appointment.reminder) return;

    // Create appointment date from separate date and time
    const appointmentDateTime = new Date(appointment.appointment_date);
    appointmentDateTime.setHours(
      new Date(appointment.time).getHours(),
      new Date(appointment.time).getMinutes(),
      0,
      0
    );
    
    const reminderTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
    
    if (reminderTime > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Appointment Reminder 📅",
          body: `You have a ${appointment.type} appointment tomorrow with ${appointment.doctors?.name || 'your doctor'}`,
          data: { appointmentId: appointment.id },
        },
        trigger: {
          date: reminderTime,
        },
      });

      // Also schedule a notification 1 hour before
      const oneHourBefore = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000);
      if (oneHourBefore > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Appointment Starting Soon ⏰",
            body: `Your ${appointment.type} appointment is in 1 hour!`,
            data: { appointmentId: appointment.id },
          },
          trigger: {
            date: oneHourBefore,
          },
        });
      }
    }
  };

  // Cancel scheduled notifications for appointment
  const cancelAppointmentReminder = async (appointmentId) => {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const appointmentNotifications = scheduledNotifications.filter(
      notification => notification.content.data?.appointmentId === appointmentId
    );
    
    for (const notification of appointmentNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  };

  const showToast = (type, title, message) => {
    Toast.show({
      type: type,
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
    });
  };

  const fetchAppointments = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(response.data.appointments);
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to fetch appointments';
      showToast('error', 'Error', errorMessage);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const fetchDoctors = async (showLoader = true) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/appointments/doctors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDoctors(response.data.doctors);
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to fetch doctors';
      if (showLoader) {
        showToast('error', 'Error', errorMessage);
      }
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchAppointments(false),
        fetchDoctors(false)
      ]);
    } catch (error) {
      console.log('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const addAppointment = async () => {
    if (!newAppointment.type || !newAppointment.doctor_id) {
      Alert.alert('Error', 'Please select appointment type and doctor');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');

      // Format date and time separately
      const appointmentDate = newAppointment.appointment_date.toISOString().split('T')[0]; // YYYY-MM-DD
      const appointmentTime = newAppointment.time.toTimeString().split(' ')[0]; // HH:MM:SS

      const response = await axios.post(
        `${API_BASE_URL}/appointments`,
        {
          type: newAppointment.type,
          doctor_id: newAppointment.doctor_id,
          appointment_date: appointmentDate,
          time: appointmentTime,
          notes: newAppointment.notes || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const createdAppointment = response.data.appointment;
      setAppointments((prev) => [...prev, createdAppointment]);
      
      // Schedule reminder if enabled
      if (newAppointment.reminder) {
        await scheduleAppointmentReminder({ ...createdAppointment, reminder: true });
        showToast('success', 'Success', 'Appointment added with reminders set!');
      } else {
        showToast('success', 'Success', 'Appointment added successfully!');
      }
      
      setShowAddModal(false);
      resetNewAppointment();
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to create appointment';
      showToast('error', 'Error', errorMessage);
      console.log('Error details:', error.response?.data);
    } finally {
      setIsLoading(false);
    }
  };

  const resetNewAppointment = () => {
    setNewAppointment({
      type: '',
      doctor_id: '',
      appointment_date: new Date(),
      time: new Date(),
      notes: '',
      reminder: true,
    });
  };

  const updateAppointmentData = async () => {
    if (!updateAppointment.type || !updateAppointment.doctor_id) {
      Alert.alert('Error', 'Please select appointment type and doctor');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');

      // Format date and time separately
      const appointmentDate = updateAppointment.appointment_date.toISOString().split('T')[0]; // YYYY-MM-DD
      const appointmentTime = updateAppointment.time.toTimeString().split(' ')[0]; // HH:MM:SS

      const response = await axios.put(
        `${API_BASE_URL}/appointments/${selectedAppointment.id}`,
        {
          type: updateAppointment.type,
          doctor_id: updateAppointment.doctor_id,
          appointment_date: appointmentDate,
          time: appointmentTime,
          notes: updateAppointment.notes || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedAppointmentData = response.data.appointment;
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === selectedAppointment.id ? updatedAppointmentData : apt
        )
      );

      // Cancel old reminders and set new ones if enabled
      await cancelAppointmentReminder(selectedAppointment.id);
      if (updateAppointment.reminder) {
        await scheduleAppointmentReminder({ ...updatedAppointmentData, reminder: true });
        showToast('success', 'Success', 'Appointment updated with new reminders!');
      } else {
        showToast('success', 'Success', 'Appointment updated successfully!');
      }

      closeUpdateModal();
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to update appointment';
      showToast('error', 'Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAppointment = (id) => {
    Alert.alert(
      'Delete Appointment',
      'Are you sure you want to delete this appointment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              await axios.delete(
                `${API_BASE_URL}/appointments/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              // Cancel reminders for deleted appointment
              await cancelAppointmentReminder(id);
              
              setAppointments((prev) => prev.filter((apt) => apt.id !== id));
              
              showToast('success', 'Success', 'Appointment deleted and reminders removed');
            } catch (error) {
              const errorMessage =
                error.response?.data?.error || 'Failed to delete appointment';
              showToast('error', 'Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const toggleReminder = async (appointment) => {
    const newReminderState = !appointment.reminder;
    
    try {
      // Update local state immediately
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointment.id ? { ...apt, reminder: newReminderState } : apt
        )
      );

      if (newReminderState) {
        await scheduleAppointmentReminder({ ...appointment, reminder: newReminderState });
        showToast('success', 'Reminder On', 'Appointment reminders have been set!');
      } else {
        await cancelAppointmentReminder(appointment.id);
        showToast('info', 'Reminder Off', 'Appointment reminders have been cancelled');
      }
    } catch (error) {
      // Revert state if error
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointment.id ? { ...apt, reminder: appointment.reminder } : apt
        )
      );
      showToast('error', 'Error', 'Failed to update reminder setting');
    }
  };

  // Handle long press to open update modal
  const handleLongPress = (appointment) => {
    if (appointment.status === 'cancelled') return;
    
    setSelectedAppointment(appointment);
    
    // Parse appointment date and time
    const appointmentDate = new Date(appointment.appointment_date);
    const timeComponents = appointment.time.split(':');
    const appointmentTime = new Date();
    appointmentTime.setHours(parseInt(timeComponents[0]), parseInt(timeComponents[1]), 0, 0);
    
    setUpdateAppointment({
      type: appointment.type,
      doctor_id: appointment.doctor_id,
      appointment_date: appointmentDate,
      time: appointmentTime,
      notes: appointment.notes || '',
      reminder: appointment.reminder || false,
    });
    openUpdateModal();
  };

  const openUpdateModal = () => {
    setShowUpdateModal(true);
    Animated.timing(modalAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeUpdateModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowUpdateModal(false);
      setSelectedAppointment(null);
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-pink-100 text-pink-700';
      case 'completed':
        return 'bg-pink-200 text-pink-800';
      case 'cancelled':
        return 'bg-pink-300 text-pink-900';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getUpcomingAppointments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    return appointments
      .filter((apt) => {
        const aptDate = new Date(apt.appointment_date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate >= today && apt.status !== 'cancelled';
      })
      .sort((a, b) => {
        const dateA = new Date(a.appointment_date);
        const dateB = new Date(b.appointment_date);
        return dateA - dateB;
      });
  };

  const getPastAppointments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    return appointments
      .filter((apt) => {
        const aptDate = new Date(apt.appointment_date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate < today;
      })
      .sort((a, b) => {
        const dateA = new Date(a.appointment_date);
        const dateB = new Date(b.appointment_date);
        return dateB - dateA; // Most recent first
      });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const modalTranslateY = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight, 0],
  });

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(false);
    
    if (datePickerMode === 'add') {
      setNewAppointment(prev => ({ ...prev, appointment_date: currentDate }));
    } else {
      setUpdateAppointment(prev => ({ ...prev, appointment_date: currentDate }));
    }
  };

  const onTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || new Date();
    setShowTimePicker(false);
    
    if (timePickerMode === 'add') {
      setNewAppointment(prev => ({ ...prev, time: currentTime }));
    } else {
      setUpdateAppointment(prev => ({ ...prev, time: currentTime }));
    }
  };

  const openDatePicker = (mode) => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const openTimePicker = (mode) => {
    setTimePickerMode(mode);
    setShowTimePicker(true);
  };

  return (
    <>
    <SafeAreaView className="flex-1 bg-gradient-to-b from-pink-50 to-white">
      <ScrollView 
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#FF8AB7']}
            tintColor="#FF8AB7"
            title="Pull to refresh"
            titleColor="#6B7280"
          />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-pink-700">Appointments</Text>
          <View className="flex-row items-center space-x-3">
            {(isRefreshing || isLoading) && (
              <ActivityIndicator size="small" color="#FF8AB7" />
            )}
            <TouchableOpacity onPress={() => setShowAddModal(true)} disabled={isLoading || isRefreshing}>
              <Ionicons name="add-circle" size={24} color={(isLoading || isRefreshing) ? '#D1D5DB' : '#FF8AB7'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row justify-between mb-6">
          <View className="flex-1 p-4 mr-2 bg-white border border-pink-100 shadow-sm rounded-2xl">
            <Text className="text-sm font-medium text-pink-600">Upcoming</Text>
            <Text className="text-2xl font-bold text-pink-700">
              {getUpcomingAppointments().length}
            </Text>
          </View>
          <View className="flex-1 p-4 ml-2 bg-white border border-pink-100 shadow-sm rounded-2xl">
            <Text className="text-sm font-medium text-pink-600">This Month</Text>
            <Text className="text-2xl font-bold text-pink-700">
              {appointments.filter((apt) => {
                const aptDate = new Date(apt.appointment_date);
                const now = new Date();
                return (
                  aptDate.getMonth() === now.getMonth() &&
                  aptDate.getFullYear() === now.getFullYear()
                );
              }).length}
            </Text>
          </View>
        </View>

        {/* Upcoming Appointments */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-pink-700">Upcoming Appointments</Text>
            <TouchableOpacity 
              onPress={onRefresh} 
              disabled={isRefreshing || isLoading}
              className="p-2"
            >
              <Ionicons 
                name="refresh" 
                size={20} 
                color={(isRefreshing || isLoading) ? '#D1D5DB' : '#6B7280'} 
              />
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <View className="items-center p-6">
              <ActivityIndicator size="large" color="#FF8AB7" />
              <Text className="mt-2 text-center text-gray-600">Loading appointments...</Text>
            </View>
          ) : getUpcomingAppointments().length === 0 ? (
            <View className="items-center p-6 bg-white border border-pink-100 shadow-sm rounded-2xl">
              <Ionicons name="calendar-outline" size={48} color="#FFB1CC" />
              <Text className="mt-2 text-gray-600">No upcoming appointments</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(true)}
                className="px-4 py-2 mt-3 bg-pink-500 rounded-xl"
                disabled={isLoading || isRefreshing}
              >
                <Text className="font-medium text-white">Schedule Appointment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            getUpcomingAppointments().map((appointment) => (
              <Pressable
                key={appointment.id}
                onLongPress={() => handleLongPress(appointment)}
                className="p-4 mb-3 bg-white border border-pink-100 shadow-sm rounded-2xl"
                delayLongPress={500}
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-pink-700">
                      {appointment.type || 'Appointment'}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {appointment.doctors?.name || 'Unknown Doctor'}
                    </Text>
                    {appointment.doctors?.specialty && (
                      <Text className="text-xs text-gray-500">
                        {appointment.doctors.specialty}
                      </Text>
                    )}
                  </View>
                  <View className={`px-3 py-1 rounded-full ${getStatusColor(appointment.status)}`}>
                    <Text className="text-xs font-medium capitalize">{appointment.status}</Text>
                  </View>
                </View>

                <View className="flex-row items-center mb-2">
                  <Ionicons name="calendar" size={16} color="#6B7280" />
                  <Text className="ml-1 text-sm text-gray-600">
                    {formatDate(appointment.appointment_date)}
                  </Text>
                  <Ionicons name="time" size={16} color="#6B7280" style={{ marginLeft: 16 }} />
                  <Text className="ml-1 text-sm text-gray-600">
                    {formatTime(appointment.time)}
                  </Text>
                </View>

                {appointment.notes && (
                  <Text className="mb-2 text-sm text-gray-600">{appointment.notes}</Text>
                )}

                <View className="flex-row items-center justify-between pt-3 mt-3 border-t border-gray-100">
                  <TouchableOpacity
                    onPress={() => toggleReminder(appointment)}
                    className="flex-row items-center"
                  >
                    <Ionicons
                      name={appointment.reminder ? 'notifications' : 'notifications-off'}
                      size={18}
                      color={appointment.reminder ? '#FF8AB7' : '#6B7280'}
                    />
                    <Text
                      className={`text-sm ml-1 ${
                        appointment.reminder ? 'text-pink-600' : 'text-gray-600'
                      }`}
                    >
                      {appointment.reminder ? 'Reminder On' : 'Reminder Off'}
                    </Text>
                  </TouchableOpacity>

                  <View className="flex-row space-x-3">
                    <TouchableOpacity onPress={() => handleLongPress(appointment)}>
                      <Ionicons name="create" size={18} color="#FF8AB7" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteAppointment(appointment.id)}>
                      <Ionicons name="trash" size={18} color="#FF8AB7" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text className="mt-1 text-xs text-gray-400">Long press to edit</Text>
              </Pressable>
            ))
          )}
        </View>

        {/* Past Appointments */}
        {getPastAppointments().length > 0 && (
          <View className="mb-6">
            <Text className="mb-4 text-xl font-bold text-pink-700">Past Appointments</Text>
            {getPastAppointments().slice(0, 3).map((appointment) => (
              <View
                key={appointment.id}
                className="p-4 mb-3 border border-gray-200 bg-gray-50 rounded-2xl"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-700">
                      {appointment.type || 'Appointment'}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {appointment.doctors?.name || 'Unknown Doctor'}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {formatDate(appointment.appointment_date)} • {formatTime(appointment.time)}
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color="#FF8AB7" />
                </View>
              </View>
            ))}
            {getPastAppointments().length > 3 && (
              <TouchableOpacity className="items-center py-2">
                <Text className="font-medium text-pink-600">View All Past Appointments</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="mb-4 text-xl font-bold text-pink-700">Quick Actions</Text>
          <View className="flex-row justify-between">
            <TouchableOpacity className="items-center flex-1 p-4 mr-2 bg-white border border-pink-100 shadow-sm rounded-2xl">
              <Ionicons name="call" size={24} color="#FF8AB7" />
              <Text className="mt-2 text-sm text-center text-gray-700">Call Doctor</Text>
            </TouchableOpacity>
            <TouchableOpacity className="items-center flex-1 p-4 mx-1 bg-white border border-pink-100 shadow-sm rounded-2xl">
              <Ionicons name="location" size={24} color="#FF8AB7" />
              <Text className="mt-2 text-sm text-center text-gray-700">Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity className="items-center flex-1 p-4 ml-2 bg-white border border-pink-100 shadow-sm rounded-2xl">
              <Ionicons name="document-text" size={24} color="#FF8AB7" />
              <Text className="mt-2 text-sm text-center text-gray-700">Reports</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Add Appointment Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <TouchableOpacity 
              onPress={() => {
                setShowAddModal(false);
                resetNewAppointment();
              }}
            >
              <Text className="font-medium text-pink-600">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-pink-700">Add Appointment</Text>
            <TouchableOpacity onPress={addAppointment} disabled={isLoading}>
              <Text className={`font-medium ${isLoading ? 'text-gray-400' : 'text-pink-600'}`}>
                {isLoading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Appointment Type */}
            <View className="mb-4">
              <Text className="mb-2 font-medium text-gray-700">Appointment Type *</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                className="mb-2"
                contentContainerStyle={{ paddingHorizontal: 4 }}
              >
                {appointmentTypes.map((type, index) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setNewAppointment((prev) => ({ ...prev, type }))}
                    className={`px-4 py-2 rounded-full border ${
                      newAppointment.type === type
                        ? 'bg-pink-500 border-pink-500'
                        : 'bg-white border-gray-300'
                    }`}
                    style={{ 
                      marginRight: index < appointmentTypes.length - 1 ? 8 : 0,
                      minWidth: 80
                    }}
                  >
                    <Text
                      className={`text-sm text-center ${
                        newAppointment.type === type 
                          ? 'text-white font-medium' 
                          : 'text-gray-700'
                      }`}
                      numberOfLines={1}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {newAppointment.type && (
                <Text className="text-sm text-pink-600">
                  Selected: {newAppointment.type}
                </Text>
              )}
            </View>

            {/* Doctor Selection */}
            <View className="mb-4">
              <Text className="mb-2 font-medium text-gray-700">Doctor *</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                className="mb-2"
                contentContainerStyle={{ paddingHorizontal: 4 }}
              >
                {doctors.map((doctor, index) => (
                  <TouchableOpacity
                    key={doctor.id}
                    onPress={() => setNewAppointment((prev) => ({ ...prev, doctor_id: doctor.id }))}
                    className={`px-4 py-3 rounded-xl border ${
                      newAppointment.doctor_id === doctor.id
                        ? 'bg-pink-500 border-pink-500'
                        : 'bg-white border-gray-300'
                    }`}
                    style={{ 
                      marginRight: index < doctors.length - 1 ? 8 : 0,
                      minWidth: 120
                    }}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        newAppointment.doctor_id === doctor.id 
                          ? 'text-white' 
                          : 'text-gray-700'
                      }`}
                      numberOfLines={1}
                    >
                      {doctor.name}
                    </Text>
                    <Text
                      className={`text-xs ${
                        newAppointment.doctor_id === doctor.id 
                          ? 'text-pink-100' 
                          : 'text-gray-500'
                      }`}
                      numberOfLines={1}
                    >
                      {doctor.specialty}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {newAppointment.doctor_id && (
                <Text className="text-sm text-pink-600">
                  Selected: {doctors.find(d => d.id === newAppointment.doctor_id)?.name}
                </Text>
              )}
            </View>

            {/* Date and Time */}
            <View className="flex-row mb-4 space-x-4">
              <View className="flex-1">
                <Text className="mb-2 font-medium text-gray-700">Date *</Text>
                <TouchableOpacity
                  onPress={() => openDatePicker('add')}
                  className="p-3 border border-gray-300 rounded-xl"
                >
                  <Text className="text-gray-700">
                    {newAppointment.appointment_date.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="flex-1">
                <Text className="mb-2 font-medium text-gray-700">Time *</Text>
                <TouchableOpacity
                  onPress={() => openTimePicker('add')}
                  className="p-3 border border-gray-300 rounded-xl"
                >
                  <Text className="text-gray-700">
                    {newAppointment.time.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notes */}
            <View className="mb-4">
              <Text className="mb-2 font-medium text-gray-700">Notes</Text>
              <TextInput
                value={newAppointment.notes}
                onChangeText={(text) => setNewAppointment((prev) => ({ ...prev, notes: text }))}
                placeholder="Add any notes about this appointment..."
                multiline
                numberOfLines={3}
                className="p-3 border border-gray-300 rounded-xl"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            {/* Reminder Toggle */}
            <View className="mb-4">
              <TouchableOpacity
                onPress={() => setNewAppointment((prev) => ({ ...prev, reminder: !prev.reminder }))}
                className="flex-row items-center justify-between p-3 border border-gray-300 rounded-xl"
              >
                <Text className="font-medium text-gray-700">Set Reminder</Text>
                <Ionicons
                  name={newAppointment.reminder ? 'toggle' : 'toggle-outline'}
                  size={24}
                  color={newAppointment.reminder ? '#FF8AB7' : '#6B7280'}
                />
              </TouchableOpacity>
              {newAppointment.reminder && (
                <Text className="mt-1 text-xs text-gray-500">
                  You'll receive reminders 24 hours and 1 hour before your appointment
                </Text>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Update Appointment Modal */}
      <Modal visible={showUpdateModal} transparent animationType="none">
        <View className="flex-1 bg-black bg-opacity-50">
          <Animated.View
            style={{
              transform: [{ translateY: modalTranslateY }],
              flex: 1,
            }}
            className="bg-white"
          >
            <SafeAreaView className="flex-1">
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <TouchableOpacity onPress={closeUpdateModal}>
                  <Text className="font-medium text-pink-600">Cancel</Text>
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-pink-700">Update Appointment</Text>
                <TouchableOpacity onPress={updateAppointmentData} disabled={isLoading}>
                  <Text className={`font-medium ${isLoading ? 'text-gray-400' : 'text-pink-600'}`}>
                    {isLoading ? 'Updating...' : 'Update'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1 p-4">
                {/* Appointment Type */}
                <View className="mb-4">
                  <Text className="mb-2 font-medium text-gray-700">Appointment Type *</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    className="mb-2"
                    contentContainerStyle={{ paddingHorizontal: 4 }}
                  >
                    {appointmentTypes.map((type, index) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setUpdateAppointment((prev) => ({ ...prev, type }))}
                        className={`px-4 py-2 rounded-full border ${
                          updateAppointment.type === type
                            ? 'bg-pink-500 border-pink-500'
                            : 'bg-white border-gray-300'
                        }`}
                        style={{ 
                          marginRight: index < appointmentTypes.length - 1 ? 8 : 0,
                          minWidth: 80
                        }}
                      >
                        <Text
                          className={`text-sm text-center ${
                            updateAppointment.type === type 
                              ? 'text-white font-medium' 
                              : 'text-gray-700'
                          }`}
                          numberOfLines={1}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {updateAppointment.type && (
                    <Text className="text-sm text-pink-600">
                      Selected: {updateAppointment.type}
                    </Text>
                  )}
                </View>

                {/* Doctor Selection */}
                <View className="mb-4">
                  <Text className="mb-2 font-medium text-gray-700">Doctor *</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    className="mb-2"
                    contentContainerStyle={{ paddingHorizontal: 4 }}
                  >
                    {doctors.map((doctor, index) => (
                      <TouchableOpacity
                        key={doctor.id}
                        onPress={() => setUpdateAppointment((prev) => ({ ...prev, doctor_id: doctor.id }))}
                        className={`px-4 py-3 rounded-xl border ${
                          updateAppointment.doctor_id === doctor.id
                            ? 'bg-pink-500 border-pink-500'
                            : 'bg-white border-gray-300'
                        }`}
                        style={{ 
                          marginRight: index < doctors.length - 1 ? 8 : 0,
                          minWidth: 120
                        }}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            updateAppointment.doctor_id === doctor.id 
                              ? 'text-white' 
                              : 'text-gray-700'
                          }`}
                          numberOfLines={1}
                        >
                          {doctor.name}
                        </Text>
                        <Text
                          className={`text-xs ${
                            updateAppointment.doctor_id === doctor.id 
                              ? 'text-pink-100' 
                              : 'text-gray-500'
                          }`}
                          numberOfLines={1}
                        >
                          {doctor.specialty}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {updateAppointment.doctor_id && (
                    <Text className="text-sm text-pink-600">
                      Selected: {doctors.find(d => d.id === updateAppointment.doctor_id)?.name}
                    </Text>
                  )}
                </View>

                {/* Date and Time */}
                <View className="flex-row mb-4 space-x-4">
                  <View className="flex-1">
                    <Text className="mb-2 font-medium text-gray-700">Date *</Text>
                    <TouchableOpacity
                      onPress={() => openDatePicker('update')}
                      className="p-3 border border-gray-300 rounded-xl"
                    >
                      <Text className="text-gray-700">
                        {updateAppointment.appointment_date.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1">
                    <Text className="mb-2 font-medium text-gray-700">Time *</Text>
                    <TouchableOpacity
                      onPress={() => openTimePicker('update')}
                      className="p-3 border border-gray-300 rounded-xl"
                    >
                      <Text className="text-gray-700">
                        {updateAppointment.time.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Notes */}
                <View className="mb-4">
                  <Text className="mb-2 font-medium text-gray-700">Notes</Text>
                  <TextInput
                    value={updateAppointment.notes}
                    onChangeText={(text) => setUpdateAppointment((prev) => ({ ...prev, notes: text }))}
                    placeholder="Add any notes about this appointment..."
                    multiline
                    numberOfLines={3}
                    className="p-3 border border-gray-300 rounded-xl"
                    style={{ textAlignVertical: 'top' }}
                  />
                </View>

                {/* Reminder Toggle */}
                <View className="mb-4">
                  <TouchableOpacity
                    onPress={() => setUpdateAppointment((prev) => ({ ...prev, reminder: !prev.reminder }))}
                    className="flex-row items-center justify-between p-3 border border-gray-300 rounded-xl"
                  >
                    <Text className="font-medium text-gray-700">Set Reminder</Text>
                    <Ionicons
                      name={updateAppointment.reminder ? 'toggle' : 'toggle-outline'}
                      size={24}
                      color={updateAppointment.reminder ? '#FF8AB7' : '#6B7280'}
                    />
                  </TouchableOpacity>
                  {updateAppointment.reminder && (
                    <Text className="mt-1 text-xs text-gray-500">
                      You'll receive reminders 24 hours and 1 hour before your appointment
                    </Text>
                  )}
                </View>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'add' ? newAppointment.appointment_date : updateAppointment.appointment_date}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={timePickerMode === 'add' ? newAppointment.time : updateAppointment.time}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}
    </SafeAreaView>
    
    {/* Toast Messages */}
    <Toast />
    </>
  );
};

export default AppointmentsScreen;