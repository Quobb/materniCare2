import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from "../components/config";

const ConsultationScreen = () => {
  const [activeTab, setActiveTab] = useState('book');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [consultationType, setConsultationType] = useState('video');
  const [consultationReason, setConsultationReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const fetchDoctors = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/appointments/doctors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDoctors(response.data.doctors || mockDoctors);
    } catch (error) {
      console.error('Fetch doctors error:', error);
      setDoctors(mockDoctors);
    }
  };

  const fetchAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(response.data.appointments || mockAppointments);
    } catch (error) {
      console.error('Fetch appointments error:', error);
      setAppointments(mockAppointments);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(
        `${API_BASE_URL}/available-slots?doctorId=${selectedDoctor.id}&date=${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvailableSlots(response.data.slots || generateMockSlots());
    } catch (error) {
      console.error('Fetch slots error:', error);
      setAvailableSlots(generateMockSlots());
    }
  };

  const generateMockSlots = () => [
    '09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'
  ];

  const mockDoctors = [
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      specialty: 'Obstetrician & Gynecologist',
      experience: '12 years',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face',
      nextAvailable: 'Today, 2:00 PM',
      consultationFee: '$75',
      languages: ['English', 'Spanish']
    },
    {
      id: 2,
      name: 'Dr. Michael Chen',
      specialty: 'Maternal-Fetal Medicine',
      experience: '15 years',
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face',
      nextAvailable: 'Tomorrow, 10:00 AM',
      consultationFee: '$85',
      languages: ['English', 'Mandarin']
    },
    {
      id: 3,
      name: 'Dr. Emily Rodriguez',
      specialty: 'High-Risk Pregnancy Specialist',
      experience: '10 years',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1594824949417-772a4935c7ad?w=400&h=400&fit=crop&crop=face',
      nextAvailable: 'Today, 4:30 PM',
      consultationFee: '$90',
      languages: ['English', 'Spanish', 'French']
    }
  ];

  const mockAppointments = [
    {
      id: 1,
      doctorName: 'Dr. Sarah Johnson',
      date: '2024-03-15',
      time: '10:00 AM',
      type: 'Video Call',
      status: 'Upcoming',
      reason: 'Routine Checkup'
    },
    {
      id: 2,
      doctorName: 'Dr. Michael Chen',
      date: '2024-03-10',
      time: '2:30 PM',
      type: 'In-Person',
      status: 'Completed',
      reason: 'Ultrasound Review'
    }
  ];

  const consultationReasons = [
    'Prenatal Checkup',
    'Ultrasound',
    'Blood Test',
    'Glucose Test',
    'Consultation',
    'Emergency Visit',
    'Vaccination',
    'Specialist Visit',
  ];

  const generateNextWeekDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        display: date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        })
      });
    }
    return dates;
  };

  const handleBookConsultation = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime || !consultationReason) {
      Alert.alert('Incomplete Information', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const bookingData = {
        doctorId: selectedDoctor.id,
        appointment_date: selectedDate,
        time: selectedTime,
        type: consultationType,
        status: consultationReason,
        notes: additionalNotes
      };

      await axios.post(`${API_BASE_URL}/`, bookingData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert(
        'Consultation Booked!',
        `Your ${consultationType === 'video' ? 'video call' : 'in-person'} consultation with ${selectedDoctor.name} is scheduled for ${selectedDate} at ${selectedTime}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setActiveTab('appointments');
              fetchAppointments();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Book consultation error:', error);
      Alert.alert('Booking Failed', 'Unable to book consultation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const renderBookingTab = () => {
    const nextWeekDates = generateNextWeekDates();

    return (
      <View>
        {/* Doctor Selection */}
        <View className="mb-6">
          <Text className="mb-4 text-lg font-semibold text-gray-900">Select Healthcare Provider</Text>
          {doctors.map((doctor) => (
            <TouchableOpacity
              key={doctor.id}
              onPress={() => setSelectedDoctor(doctor)}
              className={`p-4 rounded-2xl border-2 mb-4 ${
                selectedDoctor?.id === doctor.id
                  ? 'bg-green-50 border-green-500'
                  : 'bg-white border-gray-200'
              }`}
            >
              <View className="flex-row items-center">
                <Image
                  source={{ uri: doctor.image }}
                  className="w-16 h-16 mr-4 rounded-full"
                  defaultSource={require('../../assets/animation/Baby-bro.png')}
                />
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">{doctor.name}</Text>
                  <Text className="mb-1 text-sm text-gray-600">{doctor.specialty}</Text>
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="star" size={14} color="#fbbf24" />
                    <Text className="ml-1 text-sm text-gray-600">{doctor.rating} • {doctor.experience}</Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-green-600">{doctor.nextavailable}</Text>
                    <Text className="text-sm font-semibold text-gray-900">{doctor.consultationfee}</Text>
                  </View>
                </View>
              </View>
              {selectedDoctor?.id === doctor.id && (
                <View className="pt-3 mt-3 border-t border-green-200">
                  <Text className="text-sm text-gray-600">
                    Languages: {doctor.languages.join(', ')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Consultation Type */}
        <View className="mb-6">
          <Text className="mb-4 text-lg font-semibold text-gray-900">Consultation Type</Text>
          <View className="flex-row space-x-4">
            <TouchableOpacity
              onPress={() => setConsultationType('video')}
              className={`flex-1 p-4 rounded-xl border-2 ${
                consultationType === 'video'
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-gray-200'
              }`}
            >
              <View className="items-center">
                <Ionicons 
                  name="videocam" 
                  size={24} 
                  color={consultationType === 'video' ? '#3b82f6' : '#6b7280'} 
                />
                <Text className={`mt-2 font-medium ${
                  consultationType === 'video' ? 'text-blue-700' : 'text-gray-600'
                }`}>
                  Video Call
                </Text>
                <Text className="mt-1 text-xs text-center text-gray-500">
                  Convenient & Safe
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setConsultationType('in-person')}
              className={`flex-1 p-4 rounded-xl border-2 ${
                consultationType === 'in-person'
                  ? 'bg-green-50 border-green-500'
                  : 'bg-white border-gray-200'
              }`}
            >
              <View className="items-center">
                <Ionicons 
                  name="medical" 
                  size={24} 
                  color={consultationType === 'in-person' ? '#10b981' : '#6b7280'} 
                />
                <Text className={`mt-2 font-medium ${
                  consultationType === 'in-person' ? 'text-green-700' : 'text-gray-600'
                }`}>
                  In-Person
                </Text>
                <Text className="mt-1 text-xs text-center text-gray-500">
                  Physical Examination
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Selection */}
        {selectedDoctor && (
          <View className="mb-6">
            <Text className="mb-4 text-lg font-semibold text-gray-900">Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-3">
                {nextWeekDates.map((dateObj) => (
                  <TouchableOpacity
                    key={dateObj.date}
                    onPress={() => setSelectedDate(dateObj.date)}
                    className={`p-4 rounded-xl border-2 min-w-20 items-center ${
                      selectedDate === dateObj.date
                        ? 'bg-purple-50 border-purple-500'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      selectedDate === dateObj.date ? 'text-purple-700' : 'text-gray-600'
                    }`}>
                      {dateObj.display}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Time Selection */}
        {selectedDoctor && selectedDate && (
          <View className="mb-6">
            <Text className="mb-4 text-lg font-semibold text-gray-900">Available Times</Text>
            <View className="flex-row flex-wrap gap-3">
              {availableSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  onPress={() => setSelectedTime(time)}
                  className={`px-4 py-3 rounded-xl border-2 ${
                    selectedTime === time
                      ? 'bg-orange-50 border-orange-500'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className={`font-medium ${
                    selectedTime === time ? 'text-orange-700' : 'text-gray-600'
                  }`}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Consultation Reason */}
        <View className="mb-6">
          <Text className="mb-4 text-lg font-semibold text-gray-900">Reason for Consultation</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {consultationReasons.map((reason) => (
              <TouchableOpacity
                key={reason}
                onPress={() => setConsultationReason(reason)}
                className={`px-4 py-2 rounded-full border ${
                  consultationReason === reason
                    ? 'bg-indigo-50 border-indigo-500'
                    : 'bg-white border-gray-300'
                }`}
              >
                <Text className={`text-sm ${
                  consultationReason === reason ? 'text-indigo-700 font-medium' : 'text-gray-600'
                }`}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Additional Notes */}
        <View className="mb-6">
          <Text className="mb-4 text-lg font-semibold text-gray-900">Additional Notes (Optional)</Text>
          <TextInput
            className="p-4 text-gray-900 bg-white border border-gray-300 rounded-xl"
            placeholder="Describe your symptoms or concerns..."
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Book Button */}
        <TouchableOpacity
          onPress={handleBookConsultation}
          disabled={isLoading || !selectedDoctor || !selectedDate || !selectedTime || !consultationReason}
          className={`py-4 rounded-xl items-center ${
            isLoading || !selectedDoctor || !selectedDate || !selectedTime || !consultationReason
              ? 'bg-gray-300'
              : 'bg-green-600'
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-lg font-semibold text-white">Book Consultation</Text>
          )}
        </TouchableOpacity>

        {selectedDoctor && selectedDate && selectedTime && (
          <View className="p-4 mt-4 bg-gray-50 rounded-xl">
            <Text className="mb-2 text-sm font-medium text-gray-700">Booking Summary:</Text>
            <Text className="text-sm text-gray-600">
              {consultationType === 'video' ? 'Video Call' : 'In-Person'} with {selectedDoctor.name}
            </Text>
            <Text className="text-sm text-gray-600">
              {selectedDate} at {selectedTime}
            </Text>
            <Text className="text-sm text-gray-600">
              Fee: {selectedDoctor.consultationFee}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderAppointmentsTab = () => {
    return (
      <View>
        <Text className="mb-6 text-lg font-semibold text-gray-900">Your Appointments</Text>
        
        {appointments.length === 0 ? (
          <View className="items-center py-12">
            <Ionicons name="calendar-outline" size={64} color="#9ca3af" />
            <Text className="mt-4 text-lg font-semibold text-gray-900">No Appointments</Text>
            <Text className="mt-2 text-center text-gray-500">You haven't booked any consultations yet</Text>
            <TouchableOpacity
              onPress={() => setActiveTab('book')}
              className="px-6 py-3 mt-4 bg-green-600 rounded-xl"
            >
              <Text className="font-medium text-white">Book Your First Consultation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          appointments.map((appointment) => (
            <View key={appointment.id} className="p-5 mb-4 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">{appointment.doctors?.name}</Text>
                  <Text className="text-sm text-gray-600">{appointment.notes}</Text>
                </View>
                <View className={`px-3 py-1 rounded-full border ${getStatusStyle(appointment.status)}`}>
                  <Text className="text-xs font-medium">{appointment.status}</Text>
                </View>
              </View>
              
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="calendar" size={16} color="#6b7280" />
                  <Text className="ml-2 text-sm text-gray-600">
                    {new Date(appointment.appointment_date).toLocaleDateString()} • {appointment.time}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons 
                    name={appointment.type === 'Video Call' ? 'videocam' : 'medical'} 
                    size={16} 
                    color="#6b7280" 
                  />
                  <Text className="ml-1 text-sm text-gray-600">{appointment.type}</Text>
                </View>
              </View>
              
              {appointment.status === 'Upcoming' && (
                <View className="flex-row pt-4 mt-4 space-x-3 border-t border-gray-200">
                  <TouchableOpacity className="items-center flex-1 py-3 bg-green-600 rounded-xl">
                    <Text className="font-medium text-white">
                      {appointment.type === 'Video Call' ? 'Join Call' : 'Get Directions'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="items-center flex-1 py-3 bg-gray-100 rounded-xl">
                    <Text className="font-medium text-gray-700">Reschedule</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    );
  };

  const renderResourcesTab = () => {
    const resources = [
      {
        title: 'Preparing for Your Consultation',
        description: 'Tips to make the most of your appointment',
        icon: 'clipboard',
        color: 'blue'
      },
      {
        title: 'Understanding Your Test Results',
        description: 'Common pregnancy tests explained',
        icon: 'analytics',
        color: 'green'
      },
      {
        title: 'When to Contact Your Doctor',
        description: 'Warning signs and emergency contacts',
        icon: 'medical',
        color: 'red'
      },
      {
        title: 'Insurance & Billing Information',
        description: 'Understanding coverage and costs',
        icon: 'card',
        color: 'purple'
      }
    ];

    const getResourceColor = (color) => {
      switch (color) {
        case 'blue': return { bg: 'bg-blue-50', text: 'text-blue-700', icon: '#3b82f6' };
        case 'green': return { bg: 'bg-green-50', text: 'text-green-700', icon: '#10b981' };
        case 'red': return { bg: 'bg-red-50', text: 'text-red-700', icon: '#ef4444' };
        case 'purple': return { bg: 'bg-purple-50', text: 'text-purple-700', icon: '#8b5cf6' };
        default: return { bg: 'bg-gray-50', text: 'text-gray-700', icon: '#6b7280' };
      }
    };

    return (
      <View>
        <Text className="mb-6 text-lg font-semibold text-gray-900">Helpful Resources</Text>
        
        {resources.map((resource, index) => {
          const colors = getResourceColor(resource.color);
          return (
            <TouchableOpacity
              key={index}
              className={`${colors.bg} rounded-2xl border border-opacity-20 p-5 mb-4`}
            >
              <View className="flex-row items-center">
                <View className="items-center justify-center w-12 h-12 mr-4 bg-white rounded-full">
                  <Ionicons name={resource.icon} size={24} color={colors.icon} />
                </View>
                <View className="flex-1">
                  <Text className={`text-lg font-semibold ${colors.text} mb-1`}>
                    {resource.title}
                  </Text>
                  <Text className={`text-sm ${colors.text} opacity-80`}>
                    {resource.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.icon} />
              </View>
            </TouchableOpacity>
          );
        })}

        <View className="p-4 mt-4 border bg-amber-50 border-amber-200 rounded-xl">
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle" size={20} color="#d97706" />
            <Text className="ml-2 font-medium text-amber-800">Emergency Contacts</Text>
          </View>
          <Text className="mb-2 text-sm text-amber-700">
            If you're experiencing a medical emergency, call 911 immediately.
          </Text>
          <Text className="text-sm text-amber-700">
            For urgent pregnancy-related concerns after hours, call our 24/7 helpline: (555) 123-4567
          </Text>
        </View>
      </View>
    );
  };

  const tabs = [
    { id: 'book', title: 'Book', icon: 'add-circle' },
    { id: 'appointments', title: 'Appointments', icon: 'calendar' },
    { id: 'resources', title: 'Resources', icon: 'library' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-green-50">
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-green-800">Consultation</Text>
            <Text className="text-sm text-gray-600">Connect with healthcare providers</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.back()}
            className="items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-full shadow-sm"
          >
            <Ionicons name="close" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View className="flex-row p-2 mb-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl ${
                activeTab === tab.id ? 'bg-green-600' : 'bg-transparent'
              }`}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={activeTab === tab.id ? 'white' : '#6b7280'}
              />
              <Text className={`ml-2 font-medium ${
                activeTab === tab.id ? 'text-white' : 'text-gray-600'
              }`}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View className="mb-6">
          {activeTab === 'book' && renderBookingTab()}
          {activeTab === 'appointments' && renderAppointmentsTab()}
          {activeTab === 'resources' && renderResourcesTab()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ConsultationScreen;