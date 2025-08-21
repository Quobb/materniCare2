import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  FlatList, 
  RefreshControl,
  StatusBar,
  Dimensions,
  Platform,
  SafeAreaView,
  Animated,
  Linking,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { 
  Card, 
  Text, 
  Button, 
  ActivityIndicator, 
  TextInput, 
  SegmentedButtons, 
  useTheme,
  Surface,
  IconButton,
  Chip,
  Divider,
  Avatar,
  FAB,
  Dialog,
  Portal,
  List
} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from "../components/config";

const { width, height } = Dimensions.get('window');

// Updated constants with pink-based color palette and valid icon names
const URGENCY_CONFIG = {
  low: {
    color: '#FFB1CC',
    backgroundColor: '#FFF0F5',
    textColor: '#FF8AB7',
    icon: 'information',
    gradient: ['#FFD1E3', '#FFB1CC']
  },
  medium: {
    color: '#FF8AB7',
    backgroundColor: '#FFE4EF',
    textColor: '#D6336C',
    icon: 'alert',
    gradient: ['#FFB1CC', '#FF8AB7']
  },
  high: {
    color: '#D6336C',
    backgroundColor: '#FFF0F5',
    textColor: '#A61E4D',
    icon: 'alert-circle',
    gradient: ['#FF8AB7', '#D6336C']
  }
};

export default function EmergencyScreen() {
  const theme = useTheme();
  
  // State management
  const [alerts, setAlerts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [error, setError] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [currentTab, setCurrentTab] = useState('alerts');
  
  // Contact management state
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone_number: '',
    email: '',
    relationship: ''
  });
  const [savingContact, setSavingContact] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);

  // API helper function
  const getAuthHeaders = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      return { Authorization: `Bearer ${token}` };
    } catch (error) {
      throw new Error('Authentication failed');
    }
  };

  // Fetch alerts with improved error handling
  const fetchAlerts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/emergency/alerts`, { 
        headers,
        timeout: 10000
      });
      
      if (response.data && Array.isArray(response.data.alerts)) {
        setAlerts(response.data.alerts);
        // Animate in the content
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      } else {
        throw new Error('Invalid response format');
      }
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load alerts';
      setError(errorMessage);
      
      Toast.show({ 
        type: 'error', 
        text1: 'Error', 
        text2: errorMessage,
        position: 'top'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fadeAnim]);

  // Fetch emergency contacts
  const fetchContacts = useCallback(async (isRefresh = false) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_BASE_URL}/emergency/contacts`, { 
        headers,
        timeout: 10000
      });
      
      if (response.data && Array.isArray(response.data.contacts)) {
        setContacts(response.data.contacts);
      } else {
        throw new Error('Invalid response format');
      }
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load contacts';
      
      if (!isRefresh) {
        Toast.show({ 
          type: 'error', 
          text1: 'Error', 
          text2: errorMessage,
          position: 'top'
        });
      }
    }
  }, []);

  // Resolve alert with confirmation
  const resolveAlert = async (id, alertMessage) => {
    try {
      const headers = await getAuthHeaders();
      
      await axios.patch(
        `${API_BASE_URL}/emergency/alerts/${id}/resolve`, 
        {}, 
        { 
          headers,
          timeout: 5000
        }
      );
      
      Toast.show({ 
        type: 'success', 
        text1: 'Alert Resolved', 
        text2: `"${alertMessage.substring(0, 30)}..." has been resolved`,
        position: 'top'
      });
      
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === id ? { ...alert, resolved: true, resolved_at: new Date().toISOString() } : alert
        )
      );
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to resolve alert';
      Toast.show({ 
        type: 'error', 
        text1: 'Resolution Failed', 
        text2: errorMessage,
        position: 'top'
      });
    }
  };

  // Send emergency with validation
  const sendEmergency = async () => {
    if (!message.trim()) {
      return Toast.show({ 
        type: 'error', 
        text1: 'Message Required', 
        text2: 'Please enter an emergency message',
        position: 'top'
      });
    }

    if (message.trim().length < 10) {
      return Toast.show({ 
        type: 'error', 
        text1: 'Message Too Short', 
        text2: 'Please provide more details (at least 10 characters)',
        position: 'top'
      });
    }

    setSending(true);
    
    try {
      const headers = await getAuthHeaders();
      
      await axios.post(
        `${API_BASE_URL}/emergency/contact`, 
        { 
          message: message.trim(), 
          urgency,
          timestamp: new Date().toISOString()
        }, 
        { 
          headers,
          timeout: 10000
        }
      );
      
      Toast.show({ 
        type: 'success', 
        text1: 'Emergency Alert Sent', 
        text2: 'Your contacts have been notified successfully',
        position: 'top'
      });
      
      setMessage('');
      setTimeout(() => fetchAlerts(), 1000);
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to send emergency alert';
      Toast.show({ 
        type: 'error', 
        text1: 'Send Failed', 
        text2: errorMessage,
        position: 'top'
      });
    } finally {
      setSending(false);
    }
  };

  // Contact management functions
  const openContactModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setContactForm({
        name: contact.name || '',
        phone_number: contact.phone_number || '',
        email: contact.email || '',
        relationship: contact.relationship || ''
      });
    } else {
      setEditingContact(null);
      setContactForm({
        name: '',
        phone_number: '',
        email: '',
        relationship: ''
      });
    }
    setContactModalVisible(true);
  };

  const saveContact = async () => {
    if (!contactForm.name.trim() || !contactForm.phone_number.trim()) {
      return Toast.show({ 
        type: 'error', 
        text1: 'Required Fields Missing', 
        text2: 'Please enter name and phone number',
        position: 'top'
      });
    }

    setSavingContact(true);
    
    try {
      const headers = await getAuthHeaders();
      
      if (editingContact) {
        // Update existing contact
        await axios.put(
          `${API_BASE_URL}/emergency/contacts/${editingContact.id}`,
          contactForm,
          { headers }
        );
        
        Toast.show({ 
          type: 'success', 
          text1: 'Contact Updated', 
          text2: 'Emergency contact has been updated successfully',
          position: 'top'
        });
      } else {
        // Create new contact
        await axios.post(
          `${API_BASE_URL}/emergency/contacts`,
          contactForm,
          { headers }
        );
        
        Toast.show({ 
          type: 'success', 
          text1: 'Contact Added', 
          text2: 'New emergency contact has been added',
          position: 'top'
        });
      }
      
      setContactModalVisible(false);
      fetchContacts();
      
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to save contact';
      Toast.show({ 
        type: 'error', 
        text1: 'Save Failed', 
        text2: errorMessage,
        position: 'top'
      });
    } finally {
      setSavingContact(false);
    }
  };

  const deleteContact = async (contactId) => {
    try {
      const headers = await getAuthHeaders();
      
      await axios.delete(
        `${API_BASE_URL}/emergency/contacts/${contactId}`,
        { headers }
      );
      
      Toast.show({ 
        type: 'success', 
        text1: 'Contact Deleted', 
        text2: 'Emergency contact has been removed',
        position: 'top'
      });
      
      setDeleteDialogVisible(false);
      setContactToDelete(null);
      fetchContacts();
      
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to delete contact';
      Toast.show({ 
        type: 'error', 
        text1: 'Delete Failed', 
        text2: errorMessage,
        position: 'top'
      });
    }
  };

  // Call contact function
  const callContact = (phoneNumber, contactName) => {
    Alert.alert(
      'Call Emergency Contact',
      `Do you want to call ${contactName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            const phoneUrl = `tel:${phoneNumber}`;
            Linking.canOpenURL(phoneUrl).then(supported => {
              if (supported) {
                Linking.openURL(phoneUrl);
              } else {
                Toast.show({ 
                  type: 'error', 
                  text1: 'Call Failed', 
                  text2: 'Unable to make phone calls on this device',
                  position: 'top'
                });
              }
            });
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
    } catch {
      return 'Invalid date';
    }
  };

  const onRefresh = useCallback(() => {
    if (currentTab === 'alerts') {
      fetchAlerts(true);
    } else {
      fetchContacts(true);
    }
  }, [fetchAlerts, fetchContacts, currentTab]);

  useEffect(() => {
    fetchAlerts();
    fetchContacts();
  }, [fetchAlerts, fetchContacts]);

  // Enhanced alert item with modern design
  const renderAlertItem = ({ item, index }) => {
    const urgencyConfig = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.medium;
    
    return (
      <Animated.View style={{ opacity: fadeAnim, marginBottom: 16 }}>
        <Card 
          mode="elevated"
          elevation={3}
          style={{
            borderLeftWidth: 5,
            borderLeftColor: urgencyConfig.color,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Card.Content style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}>
                <Avatar.Icon 
                  size={44} 
                  icon={urgencyConfig.icon}
                  style={{ 
                    backgroundColor: urgencyConfig.backgroundColor,
                    marginRight: 16
                  }}
                  color={urgencyConfig.color}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 4, lineHeight: 20 }} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatDate(item.triggered_at)}
                  </Text>
                </View>
              </View>
              
              <Chip 
                mode="flat"
                style={{ 
                  backgroundColor: urgencyConfig.backgroundColor,
                  borderColor: urgencyConfig.color,
                  borderWidth: 1.5
                }}
                textStyle={{ 
                  color: urgencyConfig.textColor, 
                  fontSize: 12, 
                  fontWeight: '700' 
                }}
                compact
              >
                {item.urgency.toUpperCase()}
              </Chip>
            </View>
            
            {item.resolved ? (
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Chip 
                    mode="flat"
                    style={{ backgroundColor: '#E8F5E8', borderColor: '#4CAF50', borderWidth: 1.5 }}
                    textStyle={{ color: '#2E7D32', fontSize: 12, fontWeight: '700' }}
                    icon="check-circle"
                    compact
                  >
                    RESOLVED
                  </Chip>
                  {item.resolved_at && (
                    <Text variant="bodySmall" style={{ marginLeft: 12, color: theme.colors.onSurfaceVariant }}>
                      {formatDate(item.resolved_at)}
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 20 }}>
                <Button
                  mode="contained"
                  onPress={() => resolveAlert(item.id, item.message)}
                  style={{ 
                    borderRadius: 14,
                    backgroundColor: '#FF8AB7',
                    elevation: 2
                  }}
                  contentStyle={{ height: 48 }}
                  icon="check-circle"
                  labelStyle={{ fontSize: 16, fontWeight: '600' }}
                >
                  Mark as Resolved
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>
      </Animated.View>
    );
  };

  // Render emergency contact item
  const renderContactItem = ({ item }) => (
    <Card 
      style={{ marginBottom: 12, borderRadius: 14, backgroundColor: '#FFFFFF' }} 
      mode="elevated" 
      elevation={2}
    >
      <Card.Content style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <Avatar.Icon 
              size={44} 
              icon="account" 
              style={{ backgroundColor: '#FFF0F5' }}
              color="#FF8AB7"
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 2 }}>
                {item.name}
              </Text>
              {item.relationship && (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 1 }}>
                  {item.relationship}
                </Text>
              )}
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '500' }}>
                {item.phone_number}
              </Text>
              {item.email && (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.email}
                </Text>
              )}
            </View>
          </View>
          
          <View style={{ flexDirection: 'row' }}>
            <IconButton
              icon="phone"
              size={22}
              onPress={() => callContact(item.phone_number, item.name)}
              style={{ backgroundColor: '#E8F5E8', marginRight: 6 }}
              iconColor="#4CAF50"
            />
            <IconButton
              icon="pencil"
              size={22}
              onPress={() => openContactModal(item)}
              style={{ backgroundColor: '#FFF0F5', marginRight: 6 }}
              iconColor="#FF8AB7"
            />
            <IconButton
              icon="delete"
              size={22}
              onPress={() => {
                setContactToDelete(item);
                setDeleteDialogVisible(true);
              }}
              style={{ backgroundColor: '#FFEBEE' }}
              iconColor="#F44336"
            />
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF0F5' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF0F5" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <ActivityIndicator size="large" color="#FF8AB7" />
          <Text variant="titleMedium" style={{ marginTop: 16, textAlign: 'center', fontWeight: '500' }}>
            Loading emergency center...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF0F5' }}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8AB7" />
      
      {/* Modern Header with Gradient */}
      <View style={{ height: 100 }}>
        <LinearGradient
          colors={['#FF8AB7', '#FFB1CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          <View 
            style={{ 
              flex: 1, 
              justifyContent: 'flex-end', 
              paddingHorizontal: 24, 
              paddingBottom: 16,
              paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0 
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar.Icon 
                size={36} 
                icon="shield-check" 
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                color="white"
              />
              <Text variant="headlineMedium" style={{ color: 'white', marginLeft: 12, fontWeight: '700' }}>
                Emergency Center
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Tab Navigation */}
      <View style={{ paddingHorizontal: 16, marginTop: -16, marginBottom: 16 }}>
        <SegmentedButtons
          value={currentTab}
          onValueChange={setCurrentTab}
          buttons={[
            { 
              value: 'alerts', 
              label: 'Alerts',
              icon: 'alert-circle'
            },
            { 
              value: 'contacts', 
              label: 'Contacts',
              icon: 'account-group'
            }
          ]}
          style={{ backgroundColor: 'white', borderRadius: 14, elevation: 4 }}
        />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {currentTab === 'alerts' ? (
          <>
            {/* Emergency Trigger Card */}
            <Card 
              style={{ marginBottom: 24, borderRadius: 20, overflow: 'hidden' }}
              mode="elevated" 
              elevation={8}
            >
              <LinearGradient
                colors={['#FFF0F5', '#FFFFFF']}
                style={{ padding: 24 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <Avatar.Icon 
                    size={40} 
                    icon="alert-circle" 
                    style={{ backgroundColor: URGENCY_CONFIG.high.backgroundColor }}
                    color={URGENCY_CONFIG.high.color}
                  />
                  <Text variant="titleLarge" style={{ marginLeft: 12, fontWeight: '700' }}>
                    Trigger Emergency
                  </Text>
                </View>
                
                <TextInput
                  label="Emergency Message"
                  mode="outlined"
                  value={message}
                  onChangeText={setMessage}
                  style={{ marginBottom: 16, backgroundColor: 'white' }}
                  multiline
                  numberOfLines={3}
                  placeholder="Describe your emergency situation in detail..."
                  right={<TextInput.Affix text={`${message.length}/500`} />}
                  maxLength={500}
                  outlineStyle={{ borderRadius: 14, borderColor: '#FF8AB7', borderWidth: 2 }}
                  activeOutlineColor="#FF8AB7"
                />
                
                <Text variant="titleSmall" style={{ marginBottom: 12, fontWeight: '600' }}>
                  Select Urgency Level
                </Text>
                
                <SegmentedButtons
                  value={urgency}
                  onValueChange={setUrgency}
                  buttons={[
                    { 
                      value: 'low', 
                      label: 'Low',
                      icon: 'information'
                    },
                    { 
                      value: 'medium', 
                      label: 'Medium',
                      icon: 'alert'
                    },
                    { 
                      value: 'high', 
                      label: 'High',
                      icon: 'alert-circle'
                    }
                  ]}
                  style={{ marginBottom: 24, borderRadius: 14 }}
                />
                
                <Button
                  mode="contained"
                  onPress={sendEmergency}
                  loading={sending}
                  disabled={sending || !message.trim()}
                  style={{ 
                    borderRadius: 16,
                    height: 56,
                    justifyContent: 'center',
                    elevation: 4
                  }}
                  contentStyle={{ height: 56 }}
                  icon={sending ? undefined : "send"}
                  buttonColor={URGENCY_CONFIG.high.color}
                  labelStyle={{ fontSize: 16, fontWeight: '600' }}
                >
                  {sending ? 'Sending Alert...' : 'Send Emergency Alert'}
                </Button>
              </LinearGradient>
            </Card>

            {/* Alerts List */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text variant="titleLarge" style={{ fontWeight: '700' }}>
                    Recent Alerts
                  </Text>
                  <Chip 
                    compact 
                    style={{ marginLeft: 12, backgroundColor: '#FFE4EF' }}
                    textStyle={{ color: '#FF8AB7', fontWeight: '700' }}
                  >
                    {alerts.length}
                  </Chip>
                </View>
                <IconButton
                  icon="refresh"
                  size={24}
                  onPress={() => fetchAlerts()}
                  disabled={loading || refreshing}
                  style={{ backgroundColor: '#FFF0F5' }}
                />
              </View>

              <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <FlatList
                  data={alerts}
                  keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                  renderItem={renderAlertItem}
                  refreshControl={
                    <RefreshControl 
                      refreshing={refreshing} 
                      onRefresh={onRefresh}
                      colors={['#FF8AB7']}
                      tintColor="#FF8AB7"
                    />
                  }
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <Card 
                      style={{ paddingVertical: 48, paddingHorizontal: 32, alignItems: 'center', borderRadius: 20 }}
                      mode="elevated" 
                      elevation={2}
                    >
                      <Avatar.Icon 
                        size={72} 
                        icon="check-circle" 
                        style={{ backgroundColor: '#FFF0F5' }}
                        color="#FF8AB7"
                      />
                      <Text variant="titleLarge" style={{ marginTop: 16, marginBottom: 8, textAlign: 'center', fontWeight: '600' }}>
                        All Clear
                      </Text>
                      <Text 
                        variant="bodyLarge" 
                        style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, lineHeight: 24 }}
                      >
                        No emergency alerts at this time.{'\n'}Stay safe!
                      </Text>
                    </Card>
                  }
                  contentContainerStyle={
                    alerts.length === 0 
                      ? { flex: 1, justifyContent: 'center' } 
                      : { paddingBottom: 24 }
                  }
                />
              </Animated.View>
            </View>
          </>
        ) : (
          /* Contacts Tab */
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="titleLarge" style={{ fontWeight: '700' }}>
                  Emergency Contacts
                </Text>
                <Chip 
                  compact 
                  style={{ marginLeft: 12, backgroundColor: '#FFE4EF' }}
                  textStyle={{ color: '#FF8AB7', fontWeight: '700' }}
                >
                  {contacts.length}
                </Chip>
              </View>
              <IconButton
                icon="refresh"
                size={24}
                onPress={() => fetchContacts()}
                style={{ backgroundColor: '#FFF0F5' }}
              />
            </View>

            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              renderItem={renderContactItem}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  colors={['#FF8AB7']}
                  tintColor="#FF8AB7"
                />
              }
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Card 
                  style={{ paddingVertical: 48, paddingHorizontal: 32, alignItems: 'center', borderRadius: 20 }}
                  mode="elevated" 
                  elevation={2}
                >
                  <Avatar.Icon 
                    size={72} 
                    icon="account-plus" 
                    style={{ backgroundColor: '#FFF0F5' }}
                    color="#FF8AB7"
                  />
                  <Text variant="titleLarge" style={{ marginTop: 16, marginBottom: 8, textAlign: 'center', fontWeight: '600' }}>
                    No Emergency Contacts
                  </Text>
                  <Text 
                    variant="bodyLarge" 
                    style={{ 
                      textAlign: 'center', 
                      color: theme.colors.onSurfaceVariant, 
                      marginBottom: 16,
                      lineHeight: 24 
                    }}
                  >
                    Add trusted contacts who will be notified during emergencies
                  </Text>
                  <Button
                    mode="contained"
                    onPress={() => openContactModal()}
                    icon="plus"
                    buttonColor="#FF8AB7"
                    style={{ borderRadius: 14 }}
                    contentStyle={{ height: 48 }}
                    labelStyle={{ fontSize: 16, fontWeight: '600' }}
                  >
                    Add First Contact
                  </Button>
                </Card>
              }
              contentContainerStyle={
                contacts.length === 0 
                  ? { flex: 1, justifyContent: 'center' } 
                  : { paddingBottom: 100 }
              }
            />
          </View>
        )}
      </View>

      {/* Floating Action Button for adding contacts */}
      {currentTab === 'contacts' && contacts.length > 0 && (
        <FAB
          icon="plus"
          style={{
            position: 'absolute',
            margin: 16,
            right: 0,
            bottom: 0,
            backgroundColor: '#FF8AB7'
          }}
          onPress={() => openContactModal()}
        />
      )}

      {/* Contact Modal - Fixed to be half screen height with proper padding */}
      <Portal>
        <Modal
          visible={contactModalVisible}
          onDismiss={() => setContactModalVisible(false)}
          contentContainerStyle={{
            backgroundColor: 'white',
            marginHorizontal: 20,
            marginVertical: height * 0.25, // Centers the modal vertically
            height: height * 0.5, // Half screen height
            borderRadius: 20,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
          }}
        >
          <View style={{ flex: 1, padding: 24 }}>
            {/* Modal Header */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: 24,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#F0F0F0'
            }}>
              <Avatar.Icon 
                size={40} 
                icon={editingContact ? "account-edit" : "account-plus"}
                style={{ backgroundColor: '#FFF0F5', marginRight: 12 }}
                color="#FF8AB7"
              />
              <Text variant="headlineSmall" style={{ fontWeight: '700', flex: 1 }}>
                {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setContactModalVisible(false)}
                style={{ backgroundColor: '#F5F5F5' }}
              />
            </View>
            
            {/* Scrollable Form Content */}
            <ScrollView 
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Name Field */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ 
                  marginBottom: 8, 
                  fontSize: 14, 
                  fontWeight: '600', 
                  color: '#666' 
                }}>
                  Full Name *
                </Text>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: '#FAFAFA', 
                  borderWidth: 2,
                  borderColor: '#FFE4EF',
                  borderRadius: 12,
                  height: 56,
                  paddingHorizontal: 16,
                  elevation: 1
                }}>
                  <Ionicons name="person-outline" size={20} color="#EC4899" />
                  <TextInput
                    style={{ 
                      flex: 1, 
                      marginLeft: 12,
                      fontSize: 16,
                      color: '#333',
                      backgroundColor: 'transparent'
                    }}
                    placeholder="Enter full name"
                    placeholderTextColor="#A0A0A0"
                    value={contactForm.name}
                    onChangeText={(text) => setContactForm({...contactForm, name: text})}
                    autoCapitalize="words"
                    underlineColorAndroid="transparent"
                  />
                </View>
              </View>

              {/* Phone Number Field */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ 
                  marginBottom: 8, 
                  fontSize: 14, 
                  fontWeight: '600', 
                  color: '#666' 
                }}>
                  Phone Number *
                </Text>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: '#FAFAFA', 
                  borderWidth: 2,
                  borderColor: '#FFE4EF',
                  borderRadius: 12,
                  height: 56,
                  paddingHorizontal: 16,
                  elevation: 1
                }}>
                  <Ionicons name="call-outline" size={20} color="#EC4899" />
                  <TextInput
                    style={{ 
                      flex: 1, 
                      marginLeft: 12,
                      fontSize: 16,
                      color: '#333',
                      backgroundColor: 'transparent'
                    }}
                    placeholder="Enter phone number"
                    placeholderTextColor="#A0A0A0"
                    keyboardType="phone-pad"
                    value={contactForm.phone_number}
                    onChangeText={(text) => setContactForm({...contactForm, phone_number: text})}
                    underlineColorAndroid="transparent"
                  />
                </View>
              </View>

              {/* Email Field */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ 
                  marginBottom: 8, 
                  fontSize: 14, 
                  fontWeight: '600', 
                  color: '#666' 
                }}>
                  Email Address
                </Text>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: '#FAFAFA', 
                  borderWidth: 2,
                  borderColor: '#FFE4EF',
                  borderRadius: 12,
                  height: 56,
                  paddingHorizontal: 16,
                  elevation: 1
                }}>
                  <Ionicons name="mail-outline" size={20} color="#EC4899" />
                  <TextInput
                    style={{ 
                      flex: 1, 
                      marginLeft: 12,
                      fontSize: 16,
                      color: '#333',
                      backgroundColor: 'transparent'
                    }}
                    placeholder="Enter email address"
                    placeholderTextColor="#A0A0A0"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={contactForm.email}
                    onChangeText={(text) => setContactForm({...contactForm, email: text})}
                    underlineColorAndroid="transparent"
                  />
                </View>
              </View>

              {/* Relationship Field */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ 
                  marginBottom: 8, 
                  fontSize: 14, 
                  fontWeight: '600', 
                  color: '#666' 
                }}>
                  Relationship
                </Text>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: '#FAFAFA', 
                  borderWidth: 2,
                  borderColor: '#FFE4EF',
                  borderRadius: 12,
                  height: 56,
                  paddingHorizontal: 16,
                  elevation: 1
                }}>
                  <Ionicons name="heart-outline" size={20} color="#EC4899" />
                  <TextInput
                    style={{ 
                      flex: 1, 
                      marginLeft: 12,
                      fontSize: 16,
                      color: '#333',
                      backgroundColor: 'transparent'
                    }}
                    placeholder="e.g., Spouse, Parent, Doctor, Friend"
                    placeholderTextColor="#A0A0A0"
                    value={contactForm.relationship}
                    onChangeText={(text) => setContactForm({...contactForm, relationship: text})}
                    autoCapitalize="words"
                    underlineColorAndroid="transparent"
                  />
                </View>
              </View>
              
              <Text 
                variant="bodySmall" 
                style={{ 
                  color: theme.colors.onSurfaceVariant, 
                  marginBottom: 20, 
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}
              >
                * Required fields
              </Text>
            </ScrollView>
            
            {/* Action Buttons */}
            <View style={{ 
              flexDirection: 'row', 
              gap: 12,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: '#F0F0F0'
            }}>
              <Button
                mode="outlined"
                onPress={() => setContactModalVisible(false)}
                style={{ 
                  flex: 1, 
                  borderColor: '#FF8AB7', 
                  borderRadius: 14,
                  borderWidth: 2 
                }}
                contentStyle={{ height: 48 }}
                textColor="#FF8AB7"
                labelStyle={{ fontSize: 16, fontWeight: '600' }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={saveContact}
                loading={savingContact}
                disabled={savingContact}
                style={{ 
                  flex: 1,
                  borderRadius: 14 
                }}
                contentStyle={{ height: 48 }}
                buttonColor="#FF8AB7"
                labelStyle={{ fontSize: 16, fontWeight: '600' }}
              >
                {savingContact ? 'Saving...' : (editingContact ? 'Update' : 'Save')}
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog 
          visible={deleteDialogVisible} 
          onDismiss={() => setDeleteDialogVisible(false)}
          style={{ borderRadius: 16 }}
        >
          <Dialog.Icon icon="alert-circle" color="#F44336" size={32} />
          <Dialog.Title style={{ textAlign: 'center', fontWeight: '700' }}>
            Delete Emergency Contact
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ textAlign: 'center', fontSize: 16, lineHeight: 24 }}>
              Are you sure you want to delete{' '}
              <Text style={{ fontWeight: '600' }}>{contactToDelete?.name}</Text>? 
              {'\n\n'}This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'center', paddingTop: 16 }}>
            <Button 
              onPress={() => setDeleteDialogVisible(false)}
              style={{ marginRight: 12, borderRadius: 12 }}
              textColor="#666"
              labelStyle={{ fontSize: 16 }}
            >
              Cancel
            </Button>
            <Button 
              onPress={() => deleteContact(contactToDelete?.id)}
              mode="contained"
              buttonColor="#F44336"
              style={{ borderRadius: 12 }}
              labelStyle={{ fontSize: 16, fontWeight: '600' }}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Toast />
    </SafeAreaView>
  );
}