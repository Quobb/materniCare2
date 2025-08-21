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
  PanResponder,
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
  
  const [newAppointment, setNewAppointment] = useState({
    type: '',
    doctor_id: '',
    date: new Date(),
    time: new Date(),
    notes: '',
    reminder: true,
  });

  const [updateAppointment, setUpdateAppointment] = useState({
    type: '',
    doctor_id: '',
    date: new Date(),
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
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig.extra.eas.projectId,
      })).data;
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

    const appointmentDate = new Date(appointment.scheduled_at);
    const reminderTime = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
    
    if (reminderTime > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Appointment Reminder 📅",
          body: `You have a ${appointment.type} appointment tomorrow with ${appointment.doctor?.full_name}`,
          data: { appointmentId: appointment.id },
        },
        trigger: {
          date: reminderTime,
        },
      });

      // Also schedule a notification 1 hour before
      const oneHourBefore = new Date(appointmentDate.getTime() - 60 * 60 * 1000);
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
      const scheduledDate = new Date(
        newAppointment.date.getFullYear(),
        newAppointment.date.getMonth(),
        newAppointment.date.getDate(),
        newAppointment.time.getHours(),
        newAppointment.time.getMinutes()
      );

      const response = await axios.post(
        `${API_BASE_URL}/appointments`,
        {
          type: newAppointment.type,
          doctor_id: newAppointment.doctor_id,
          scheduled_at: scheduledDate.toISOString(),
          notes: newAppointment.notes || null,
          reminder: newAppointment.reminder,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const createdAppointment = response.data.appointment;
      setAppointments((prev) => [...prev, createdAppointment]);
      
      // Schedule reminder if enabled
      if (newAppointment.reminder) {
        await scheduleAppointmentReminder(createdAppointment);
        showToast('success', 'Success', 'Appointment added with reminders set!');
      } else {
        showToast('success', 'Success', 'Appointment added successfully!');
      }
      
      setShowAddModal(false);
      setNewAppointment({
        type: '',
        doctor_id: '',
        date: new Date(),
        time: new Date(),
        notes: '',
        reminder: true,
      });
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to create appointment';
      showToast('error', 'Error', errorMessage);
      console.log('Error details:', error.response?.data);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAppointmentData = async () => {
    if (!updateAppointment.type || !updateAppointment.doctor_id) {
      Alert.alert('Error', 'Please select appointment type and doctor');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const scheduledDate = new Date(
        updateAppointment.date.getFullYear(),
        updateAppointment.date.getMonth(),
        updateAppointment.date.getDate(),
        updateAppointment.time.getHours(),
        updateAppointment.time.getMinutes()
      );

      const response = await axios.patch(
        `${API_BASE_URL}/appointments/${selectedAppointment.id}`,
        {
          type: updateAppointment.type,
          doctor_id: updateAppointment.doctor_id,
          scheduled_at: scheduledDate.toISOString(),
          notes: updateAppointment.notes || null,
          reminder: updateAppointment.reminder,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedAppointment = response.data.appointment;
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === selectedAppointment.id ? updatedAppointment : apt
        )
      );

      // Cancel old reminders and set new ones if enabled
      await cancelAppointmentReminder(selectedAppointment.id);
      if (updateAppointment.reminder) {
        await scheduleAppointmentReminder(updatedAppointment);
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
              await axios.patch(
                `${API_BASE_URL}/appointments/${id}/status`,
                { status: 'cancelled' },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              // Cancel reminders for deleted appointment
              await cancelAppointmentReminder(id);
              
              setAppointments((prev) =>
                prev.map((apt) =>
                  apt.id === id ? { ...apt, status: 'cancelled' } : apt
                )
              );
              
              showToast('success', 'Success', 'Appointment cancelled and reminders removed');
            } catch (error) {
              const errorMessage =
                error.response?.data?.error || 'Failed to cancel appointment';
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
      const token = await AsyncStorage.getItem('authToken');
      await axios.patch(
        `${API_BASE_URL}/appointments/${appointment.id}`,
        { reminder: newReminderState },
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
      showToast('error', 'Error', 'Failed to update reminder setting');
    }
  };

  // Handle long press to open update modal
  const handleLongPress = (appointment) => {
    if (appointment.status === 'cancelled') return;
    
    setSelectedAppointment(appointment);
    const appointmentDate = new Date(appointment.scheduled_at);
    setUpdateAppointment({
      type: appointment.type,
      doctor_id: appointment.doctor_id,
      date: appointmentDate,
      time: appointmentDate,
      notes: appointment.notes || '',
      reminder: appointment.reminder,
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
    return appointments
      .filter((apt) => new Date(apt.scheduled_at) >= today && apt.status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  };

  const getPastAppointments = () => {
    const today = new Date();
    return appointments
      .filter((apt) => new Date(apt.scheduled_at) < today)
      .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toISOString().split('T')[0];
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const modalTranslateY = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight, 0],
  });

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
              <Text className="text-sm text-pink-600">
                {isRefreshing ? 'Refreshing...' : 'Loading...'}
              </Text>
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
                const aptDate = new Date(apt.scheduled_at);
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
            <Text className="text-center text-gray-600">Loading...</Text>
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
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-pink-700">
                      {appointment.type || 'Appointment'}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {appointment.doctor?.full_name || 'Unknown Doctor'}
                    </Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${getStatusColor(appointment.status)}`}>
                    <Text className="text-xs font-medium capitalize">{appointment.status}</Text>
                  </View>
                </View>

                <View className="flex-row items-center mb-2">
                  <Ionicons name="calendar" size={16} color="#6B7280" />
                  <Text className="ml-1 text-sm text-gray-600">
                    {formatDate(appointment.scheduled_at)}
                  </Text>
                  <Ionicons name="time" size={16} color="#6B7280" className="ml-4" />
                  <Text className="ml-1 text-sm text-gray-600">
                    {formatTime(appointment.scheduled_at)}
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
                
                <Text className="text-xs text-gray-400 mt-1">Long press to edit</Text>
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
                      {appointment.doctor?.full_name || 'Unknown Doctor'}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {formatDate(appointment.scheduled_at)} • {formatTime(appointment.scheduled_at)}
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
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
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

            {/* Doctor */}
            <View className="mb-4">
              <Text className="mb-2 font-medium text-gray-700">Doctor/Provider *</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4 }}
              >
                {doctors.map((doctor, index) => (
                  <TouchableOpacity
                    key={doctor.id}
                    onPress={() =>
                      setNewAppointment((prev) => ({ ...prev, doctor_id: doctor.id }))
                    }
                    className={`px-4 py-2 rounded-full border ${
                      newAppointment.doctor_id === doctor.id
                        ? 'bg-pink-500 border-pink-500'
                        : 'bg-white border-gray-300'
                    }`}
                    style={{ 
                      marginRight: index < doctors.length - 1 ? 8 : 0,
                      minWidth: 100
                    }}
                  >
                    <Text
                      className={`text-sm text-center ${
                        newAppointment.doctor_id === doctor.id
                          ? 'text-white font-medium'
                          : 'text-gray-700'
                      }`}
                      numberOfLines={1}
                    >
                      {doctor.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {newAppointment.doctor_id && (
                <Text className="text-sm text-pink-600 mt-1">
                  Selected: {doctors.find(d => d.id === newAppointment.doctor_id)?.full_name}
                </Text>
              )}
            </View>

            {/* Date */}
            <View className="mb-4">
              <Text className="mb-2 font-medium text-gray-700">Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <Text className="text-gray-700">{newAppointment.date.toDateString()}</Text>
                <Ionicons name="calendar" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Time */}
            <View className="mb-4">
              <Text className="mb-2 font-medium text-gray-700">Time</Text>
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <Text className="text-gray-700">
                  {newAppointment.time.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Ionicons name="time" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Notes */}
            <View className="mb-4">
              <Text className="mb-2 font-medium text-gray-700">Notes</Text>
              <TextInput
                className="p-3 text-gray-700 bg-gray-50 rounded-xl"
                placeholder="Add notes (optional)"
                multiline
                numberOfLines={3}
                value={newAppointment.notes}
                onChangeText={(text) => setNewAppointment((prev) => ({ ...prev, notes: text }))}
              />
            </View>

            {/* Reminder Toggle */}
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text className="font-medium text-gray-700">Set Reminder & Alarm</Text>
                <Text className="text-sm text-gray-500">Get notified 24h and 1h before</Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  setNewAppointment((prev) => ({ ...prev, reminder: !prev.reminder }))
                }
                className={`w-12 h-6 rounded-full ${
                  newAppointment.reminder ? 'bg-pink-500' : 'bg-gray-300'
                }`}
              >
                <View
                  className={`w-5 h-5 bg-white rounded-full mt-0.5 ${
                    newAppointment.reminder ? 'ml-6' : 'ml-0.5'
                  }`}
                />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Update Appointment Bottom Modal */}
      <Modal visible={showUpdateModal} transparent animationType="none">
        <View className="flex-1 bg-black bg-opacity-50">
          <TouchableOpacity 
            className="flex-1"
            onPress={closeUpdateModal}
            activeOpacity={1}
          />
          <Animated.View
            style={{
              transform: [{ translateY: modalTranslateY }],
              height: screenHeight / 2,
            }}
            className="bg-white rounded-t-3xl"
          >
            <SafeAreaView className="flex-1">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <TouchableOpacity onPress={closeUpdateModal}>
                  <Text className="font-medium text-pink-600">Cancel</Text>
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-pink-700">Update Appointment</Text>
                <TouchableOpacity onPress={updateAppointmentData} disabled={isLoading}>
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
                    contentContainerStyle={{ paddingHorizontal: 4 }}
                  >
                    {appointmentTypes.map((type, index) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setUpdateAppointment((prev) => ({ ...prev, type }))}
                        className={`px-3 py-2 rounded-full border ${
                          updateAppointment.type === type
                            ? 'bg-pink-500 border-pink-500'
                            : 'bg-white border-gray-300'
                        }`}
                        style={{ 
                          marginRight: index < appointmentTypes.length - 1 ? 6 : 0,
                          minWidth: 70
                        }}
                      >
                        <Text
                          className={`text-xs text-center ${
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
                </View>

                {/* Doctor */}
                <View className="mb-4">
                  <Text className="mb-2 font-medium text-gray-700">Doctor/Provider *</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 4 }}
                  >
                    {doctors.map((doctor, index) => (
                      <TouchableOpacity
                        key={doctor.id}
                        onPress={() =>
                          setUpdateAppointment((prev) => ({ ...prev, doctor_id: doctor.id }))
                        }
                        className={`px-3 py-2 rounded-full border ${
                          updateAppointment.doctor_id === doctor.id
                            ? 'bg-pink-500 border-pink-500'
                            : 'bg-white border-gray-300'
                        }`}
                        style={{ 
                          marginRight: index < doctors.length - 1 ? 6 : 0,
                          minWidth: 80
                        }}
                      >
                        <Text
                          className={`text-xs text-center ${
                            updateAppointment.doctor_id === doctor.id
                              ? 'text-white font-medium'
                              : 'text-gray-700'
                          }`}
                          numberOfLines={1}
                        >
                          {doctor.full_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Date and Time Row */}
                <View className="flex-row mb-4 space-x-2">
                  <View className="flex-1">
                    <Text className="mb-2 font-medium text-gray-700">Date</Text>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      className="flex-row items-center justify-between p-2 bg-gray-50 rounded-xl"
                    >
                      <Text className="text-sm text-gray-700">
                        {updateAppointment.date.toLocaleDateString()}
                      </Text>
                      <Ionicons name="calendar" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  
                  <View className="flex-1">
                    <Text className="mb-2 font-medium text-gray-700">Time</Text>
                    <TouchableOpacity
                      onPress={() => setShowTimePicker(true)}
                      className="flex-row items-center justify-between p-2 bg-gray-50 rounded-xl"
                    >
                      <Text className="text-sm text-gray-700">
                        {updateAppointment.time.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      <Ionicons name="time" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Notes */}
                <View className="mb-4">
                  <Text className="mb-2 font-medium text-gray-700">Notes</Text>
                  <TextInput
                    className="p-2 text-sm text-gray-700 bg-gray-50 rounded-xl"
                    placeholder="Add notes (optional)"
                    multiline
                    numberOfLines={2}
                    value={updateAppointment.notes}
                    onChangeText={(text) => setUpdateAppointment((prev) => ({ ...prev, notes: text }))}
                  />
                </View>

                {/* Reminder Toggle */}
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="font-medium text-gray-700">Set Reminder & Alarm</Text>
                    <Text className="text-xs text-gray-500">Get notified 24h and 1h before</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      setUpdateAppointment((prev) => ({ ...prev, reminder: !prev.reminder }))
                    }
                    className={`w-10 h-5 rounded-full ${
                      updateAppointment.reminder ? 'bg-pink-500' : 'bg-gray-300'
                    }`}
                  >
                    <View
                      className={`w-4 h-4 bg-white rounded-full mt-0.5 ${
                        updateAppointment.reminder ? 'ml-5' : 'ml-0.5'
                      }`}
                    />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={showUpdateModal ? updateAppointment.date : newAppointment.date}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              if (showUpdateModal) {
                setUpdateAppointment((prev) => ({ ...prev, date: selectedDate }));
              } else {
                setNewAppointment((prev) => ({ ...prev, date: selectedDate }));
              }
            }
          }}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={showUpdateModal ? updateAppointment.time : newAppointment.time}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) {
              if (showUpdateModal) {
                setUpdateAppointment((prev) => ({ ...prev, time: selectedTime }));
              } else {
                setNewAppointment((prev) => ({ ...prev, time: selectedTime }));
              }
            }
          }}
        />
      )}
    </SafeAreaView>

    <Toast />
    </>
  );
};

export default AppointmentsScreen;