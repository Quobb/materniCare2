
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  FlatList, 
  RefreshControl,
  StatusBar,
  Platform,
  SafeAreaView,
  Modal,
  ScrollView
} from 'react-native';
import { 
  Card, 
  Text, 
  Button, 
  ActivityIndicator, 
  TextInput, 
  useTheme,
  Surface,
  IconButton,
  Chip,
  Divider,
  FAB,
  Searchbar,
  Avatar,
  Menu
} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from "../../components/config";

// Updated status colors with pink-based palette
const STATUS_CONFIG = {
  approved: { color: '#FFB1CC', backgroundColor: '#FFF0F5', textColor: '#FF8AB7' },
  rejected: { color: '#D6336C', backgroundColor: '#FFE4EF', textColor: '#A61E4D' },
  pending: { color: '#FF8AB7', backgroundColor: '#FFD1E3', textColor: '#D6336C' }
};

export default function ForumScreen() {
  const theme = useTheme();
  
  // State management
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [authToken, setAuthToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [initialized, setInitialized] = useState(false);
  
  // Form states
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');
  const [newComment, setNewComment] = useState('');
  const [creating, setCreating] = useState(false);
  const [commenting, setCommenting] = useState(false);
  
  // Pagination
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Initialize app data
  const initializeAppData = useCallback(async () => {
    try {
      console.log('Initializing app data...');
      
      // Get stored data from AsyncStorage
      const [storedToken, storedUserData, storedUserRole] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('user_data'),
        AsyncStorage.getItem('user_role')
      ]);

      if (!storedToken) {
        console.warn('No authentication token found');
        setInitialized(true);
        Toast.show({ 
          type: 'error', 
          text1: 'Authentication Error', 
          text2: 'Please log in again',
          position: 'top'
        });
        return;
      }

      setAuthToken(storedToken);
      
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);
        setUserRole(parsedUserData.role || storedUserRole || 'user');
      } else {
        setUserRole(storedUserRole || 'user');
      }

      setInitialized(true);
      console.log('App data initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize app data:', error);
      setInitialized(true);
      Toast.show({ 
        type: 'error', 
        text1: 'Initialization Error', 
        text2: 'Failed to load user data',
        position: 'top'
      });
    }
  }, []);

  // API helper function
  const getAuthHeaders = useCallback(() => {
    if (!authToken) {
      throw new Error('No authentication token available');
    }
    return { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };
  }, [authToken]);

  // Fetch posts with better error handling
  const fetchPosts = useCallback(async (isRefresh = false, searchTerm = '') => {
    if (!initialized || !authToken) {
      console.log('Not ready to fetch posts:', { initialized, hasToken: !!authToken });
      return;
    }

    try {
      console.log('Fetching posts...', { isRefresh, searchTerm, offset });
      
      if (isRefresh) {
        setRefreshing(true);
        setOffset(0);
        setHasMore(true);
      } else if (offset === 0 && posts.length === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const headers = getAuthHeaders();
      const currentOffset = isRefresh ? 0 : offset;
      
      const response = await axios.get(`${API_BASE_URL}/forum/posts`, {
        headers,
        params: {
          limit: 10,
          offset: currentOffset,
          search: searchTerm || undefined
        },
        timeout: 15000
      });
      
      console.log('Posts response status:', response.status);
      
      if (response.data && Array.isArray(response.data.posts)) {
        const newPosts = response.data.posts;
        
        if (isRefresh) {
          setPosts(newPosts);
          setOffset(newPosts.length);
        } else {
          setPosts(prev => [...prev, ...newPosts]);
          setOffset(prev => prev + newPosts.length);
        }
        
        // Check if there are more posts to load
        setHasMore(newPosts.length === 10);
        
        console.log(`Loaded ${newPosts.length} posts, hasMore: ${newPosts.length === 10}`);
      } else {
        console.warn('Invalid response format:', response.data);
        setPosts([]);
        setHasMore(false);
      }
      
    } catch (err) {
      console.error('Error fetching posts:', err);
      
      let errorMessage = 'Failed to load posts';
      
      if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again';
        await AsyncStorage.multiRemove(['auth_token', 'user_data', 'user_session']);
        setAuthToken(null);
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied. Check your permissions';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later';
      } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        errorMessage = 'Network error. Check your connection';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please try again';
      }
      
      Toast.show({ 
        type: 'error', 
        text1: 'Error Loading Posts', 
        text2: errorMessage,
        position: 'top'
      });
      
      if (!isRefresh && posts.length === 0) {
        setPosts([]);
        setHasMore(false);
      }
      
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [authToken, offset, posts.length, initialized, getAuthHeaders]);

  // Search posts with debouncing
  const searchPosts = useCallback(async (query) => {
    setSearchQuery(query);
    setOffset(0);
    setPosts([]);
    setHasMore(true);
    
    if (searchPosts.timeoutId) {
      clearTimeout(searchPosts.timeoutId);
    }
    
    searchPosts.timeoutId = setTimeout(() => {
      fetchPosts(true, query);
    }, 500);
  }, [fetchPosts]);

  // Create new post
  const createPost = async () => {
    if (!newPostTitle.trim() || !newPostBody.trim()) {
      return Toast.show({ 
        type: 'error', 
        text1: 'Required Fields', 
        text2: 'Please fill in both title and body',
        position: 'top'
      });
    }

    if (!authToken) {
      return Toast.show({ 
        type: 'error', 
        text1: 'Authentication Error', 
        text2: 'Please log in again',
        position: 'top'
      });
    }

    setCreating(true);
    
    try {
      const headers = getAuthHeaders();
      
      const response = await axios.post(
        `${API_BASE_URL}/forum/posts`, 
        { 
          title: newPostTitle.trim(), 
          body: newPostBody.trim()
        }, 
        { headers, timeout: 10000 }
      );
      
      Toast.show({ 
        type: 'success', 
        text1: 'Post Created', 
        text2: 'Your post has been created successfully',
        position: 'top'
      });
      
      setNewPostTitle('');
      setNewPostBody('');
      setShowCreatePost(false);
      
      await fetchPosts(true, searchQuery);
      
    } catch (err) {
      console.error('Error creating post:', err);
      
      let errorMessage = 'Failed to create post';
      if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      Toast.show({ 
        type: 'error', 
        text1: 'Creation Failed', 
        text2: errorMessage,
        position: 'top'
      });
    } finally {
      setCreating(false);
    }
  };

  // Get post details with comments
  const getPostDetails = async (postId) => {
    if (!authToken) {
      return Toast.show({ 
        type: 'error', 
        text1: 'Authentication Error', 
        text2: 'Please log in again',
        position: 'top'
      });
    }

    try {
      const headers = getAuthHeaders();
      
      const response = await axios.get(
        `${API_BASE_URL}/forum/posts/${postId}`, 
        { headers, timeout: 10000 }
      );
      
      if (response.data && response.data.post) {
        setSelectedPost(response.data.post);
        setShowPostDetail(true);
      }
      
    } catch (err) {
      console.error('Error fetching post details:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load post details';
      Toast.show({ 
        type: 'error', 
        text1: 'Error', 
        text2: errorMessage,
        position: 'top'
      });
    }
  };

  // Add comment
  const addComment = async () => {
    if (!newComment.trim()) {
      return Toast.show({ 
        type: 'error', 
        text1: 'Required', 
        text2: 'Please enter a comment',
        position: 'top'
      });
    }

    if (!authToken || !selectedPost) {
      return Toast.show({ 
        type: 'error', 
        text1: 'Error', 
        text2: 'Unable to add comment',
        position: 'top'
      });
    }

    setCommenting(true);
    
    try {
      const headers = getAuthHeaders();
      
      const response = await axios.post(
        `${API_BASE_URL}/forum/posts/${selectedPost.id}/comments`, 
        { body: newComment.trim() }, 
        { headers, timeout: 10000 }
      );
      
      if (response.data && response.data.comment) {
        setSelectedPost(prev => ({
          ...prev,
          comments: [...(prev.comments || []), response.data.comment]
        }));
      }
      
      setNewComment('');
      
      Toast.show({ 
        type: 'success', 
        text1: 'Comment Added', 
        text2: 'Your comment has been posted',
        position: 'top'
      });
      
    } catch (err) {
      console.error('Error adding comment:', err);
      const errorMessage = err.response?.data?.message || 'Failed to add comment';
      Toast.show({ 
        type: 'error', 
        text1: 'Comment Failed', 
        text2: errorMessage,
        position: 'top'
      });
    } finally {
      setCommenting(false);
    }
  };

  // Moderate post (admin/doctor only)
  const moderatePost = async (postId, status) => {
    if (!authToken) return;

    try {
      const headers = getAuthHeaders();
      
      await axios.patch(
        `${API_BASE_URL}/forum/posts/${postId}/moderate`, 
        { status }, 
        { headers, timeout: 10000 }
      );
      
      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, status } : post
      ));
      
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(prev => ({ ...prev, status }));
      }
      
      Toast.show({ 
        type: 'success', 
        text1: 'Post Moderated', 
        text2: `Post status changed to ${status}`,
        position: 'top'
      });
      
    } catch (err) {
      console.error('Error moderating post:', err);
      const errorMessage = err.response?.data?.message || 'Failed to moderate post';
      Toast.show({ 
        type: 'error', 
        text1: 'Moderation Failed', 
        text2: errorMessage,
        position: 'top'
      });
    }
  };

  // Delete post (admin/doctor only)
  const deletePost = async (postId) => {
    if (!authToken) return;

    try {
      const headers = getAuthHeaders();
      
      await axios.delete(
        `${API_BASE_URL}/forum/posts/${postId}`, 
        { headers, timeout: 10000 }
      );
      
      setPosts(prev => prev.filter(post => post.id !== postId));
      
      if (selectedPost && selectedPost.id === postId) {
        setShowPostDetail(false);
        setSelectedPost(null);
      }
      
      Toast.show({ 
        type: 'success', 
        text1: 'Post Deleted', 
        text2: 'Post has been removed successfully',
        position: 'top'
      });
      
    } catch (err) {
      console.error('Error deleting post:', err);
      const errorMessage = err.response?.data?.message || 'Failed to delete post';
      Toast.show({ 
        type: 'error', 
        text1: 'Deletion Failed', 
        text2: errorMessage,
        position: 'top'
      });
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(() => {
    fetchPosts(true, searchQuery);
  }, [fetchPosts, searchQuery]);

  // Load more posts
  const loadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore && !refreshing) {
      console.log('Loading more posts...');
      fetchPosts(false, searchQuery);
    }
  }, [hasMore, loading, loadingMore, refreshing, fetchPosts, searchQuery]);

  // Initialize app on mount
  useEffect(() => {
    initializeAppData();
  }, [initializeAppData]);

  // Fetch posts when initialized and authToken is available
  useEffect(() => {
    if (initialized && authToken && posts.length === 0 && !loading) {
      console.log('Auto-fetching initial posts');
      fetchPosts(true);
    }
  }, [initialized, authToken, posts.length, loading]);

  // Moderation menu component
  const ModerationMenu = ({ post, onModerate, onDelete }) => {
    const [visible, setVisible] = useState(false);
    
    return (
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <IconButton
            icon="dots-vertical"
            size={16}
            onPress={() => setVisible(true)}
            iconColor="#FF8AB7"
          />
        }
      >
        <Menu.Item onPress={() => { onModerate(post.id, 'approved'); setVisible(false); }} title="Approve" />
        <Menu.Item onPress={() => { onModerate(post.id, 'rejected'); setVisible(false); }} title="Reject" />
        <Menu.Item onPress={() => { onModerate(post.id, 'pending'); setVisible(false); }} title="Pending" />
        <Divider />
        <Menu.Item onPress={() => { onDelete(post.id); setVisible(false); }} title="Delete" titleStyle={{ color: '#D6336C' }} />
      </Menu>
    );
  };

  // Render post item
  const renderPostItem = ({ item }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const canModerate = ['admin', 'doctor'].includes(userRole);
    
    return (
      <Surface className="mx-4 mb-4 rounded-xl overflow-hidden" elevation={2}>
        <View className="p-4">
          {/* Post Header */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
              <Text variant="titleMedium" className="font-bold mb-1" numberOfLines={2}>
                {item.title}
              </Text>
              <View className="flex-row items-center">
                <Avatar.Text 
                  size={24} 
                  label={item.user?.full_name?.charAt(0) || 'U'} 
                  className="mr-2"
                  style={{ backgroundColor: '#FF8AB7', color: 'white' }}
                />
                <Text variant="bodySmall" className="text-gray-600 flex-1">
                  By {item.user?.full_name || 'Unknown'} • {formatDate(item.created_at)}
                </Text>
              </View>
            </View>
            
            <View className="flex-row items-center">
              <Chip 
                style={{ backgroundColor: statusConfig.backgroundColor }}
                textStyle={{ color: statusConfig.textColor, fontSize: 10 }}
                compact
                className="ml-2"
              >
                {item.status?.toUpperCase() || 'PENDING'}
              </Chip>
              
              {canModerate && (
                <ModerationMenu 
                  post={item}
                  onModerate={moderatePost}
                  onDelete={deletePost}
                />
              )}
            </View>
          </View>
          
          {/* Post Preview */}
          <Text variant="bodyMedium" className="text-gray-700 mb-3" numberOfLines={3}>
            {item.body}
          </Text>
          
          {/* Post Stats & Actions */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <Ionicons name="chatbubble-outline" size={16} color="#FF8AB7" />
              <Text variant="bodySmall" className="ml-1 text-gray-600">
                {item.comments?.[0]?.count || item.comments?.length || 0} comments
              </Text>
            </View>
            
            <Button 
              mode="outlined" 
              compact
              onPress={() => getPostDetails(item.id)}
              className="rounded-lg"
              textColor="#FF8AB7"
              style={{ borderColor: '#FF8AB7' }}
            >
              Read More
            </Button>
          </View>
        </View>
      </Surface>
    );
  };

  // Show loading only for initial load when not initialized
  if (!initialized) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFF0F5" />
        <View className="flex-1 justify-center items-center p-5">
          <ActivityIndicator size="large" color="#FF8AB7" />
          <Text className="mt-4 text-center">Initializing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show auth error state
  if (initialized && !authToken) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFF0F5" />
        <View className="flex-1 justify-center items-center p-5">
          <Ionicons name="lock-closed-outline" size={48} color="#FF8AB7" />
          <Text variant="titleMedium" className="mt-4 mb-2 text-center">Authentication Required</Text>
          <Text variant="bodyMedium" className="text-center text-gray-600">
            Please log in to access the forum
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFF0F5" />
      
      {/* Header */}
      <Surface className="pb-4" elevation={4} style={{ backgroundColor: '#FF8AB7' }}>
        <LinearGradient
          colors={['#FF8AB7', '#FFB1CC']}
          className="pt-12 pb-4"
        >
          <View className="px-4">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Ionicons name="people" size={24} color="white" />
                <Text variant="headlineSmall" className="text-white ml-2 font-bold">
                  Community Forum
                </Text>
              </View>
              
              {['admin', 'doctor'].includes(userRole) && (
                <Chip 
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  textStyle={{ color: 'white', fontSize: 10 }}
                  compact
                >
                  MODERATOR
                </Chip>
              )}
            </View>
            
            <Searchbar
              placeholder="Search posts..."
              onChangeText={searchPosts}
              value={searchQuery}
              className="bg-white rounded-xl"
              iconColor="#FF8AB7"
            />
          </View>
        </LinearGradient>
      </Surface>

      {/* Posts List */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderPostItem}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#FF8AB7']}
            tintColor="#FF8AB7"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          !loading && (
            <Surface className="mx-4 py-10 px-8 rounded-xl items-center" elevation={1}>
              <Ionicons name="chatbubbles-outline" size={48} color="#FF8AB7" />
              <Text variant="titleMedium" className="mt-4 mb-2 text-center">
                {authToken ? 'No posts found' : 'Please log in'}
              </Text>
              <Text variant="bodyMedium" className="text-center text-gray-600">
                {searchQuery ? 'Try adjusting your search terms' : 
                 authToken ? 'Be the first to start a discussion!' : 'Login required to view posts'}
              </Text>
            </Surface>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#FF8AB7" />
              <Text variant="bodySmall" className="mt-2 text-gray-600">Loading more posts...</Text>
            </View>
          ) : null
        }
      />

      {/* Create Post FAB */}
      {authToken && (
        <FAB
          icon="plus"
          className="absolute bottom-4 right-4"
          onPress={() => setShowCreatePost(true)}
          style={{ backgroundColor: '#FF8AB7' }}
        />
      )}

      {/* Create Post Modal */}
      <Modal
        visible={showCreatePost}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreatePost(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Button onPress={() => setShowCreatePost(false)} textColor="#FF8AB7">Cancel</Button>
            <Text variant="titleMedium" className="font-bold">New Post</Text>
            <Button 
              mode="contained" 
              onPress={createPost}
              loading={creating}
              disabled={creating || !newPostTitle.trim() || !newPostBody.trim()}
              compact
              buttonColor="#FF8AB7"
            >
              Post
            </Button>
          </View>
          
          <ScrollView className="flex-1 p-4">
            <TextInput
              label="Post Title"
              mode="outlined"
              value={newPostTitle}
              onChangeText={setNewPostTitle}
              className="mb-4"
              placeholder="What's your question or topic?"
              maxLength={200}
              right={<TextInput.Affix text={`${newPostTitle.length}/200`} />}
              style={{ backgroundColor: 'white' }}
              outlineStyle={{ borderColor: '#FF8AB7' }}
              activeOutlineColor="#FF8AB7"
            />
            
            <TextInput
              label="Post Content"
              mode="outlined"
              value={newPostBody}
              onChangeText={setNewPostBody}
              multiline
              numberOfLines={8}
              placeholder="Share your thoughts, ask questions, or start a discussion..."
              maxLength={2000}
              right={<TextInput.Affix text={`${newPostBody.length}/2000`} />}
              style={{ backgroundColor: 'white' }}
              outlineStyle={{ borderColor: '#FF8AB7' }}
              activeOutlineColor="#FF8AB7"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Post Detail Modal */}
      <Modal
        visible={showPostDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPostDetail(false)}
      >
        {selectedPost && (
          <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Button onPress={() => setShowPostDetail(false)} textColor="#FF8AB7">Back</Button>
              <Text variant="titleMedium" className="font-bold">Post Details</Text>
              <View style={{ width: 60 }} />
            </View>
            
            <ScrollView className="flex-1">
              {/* Post Content */}
              <View className="p-4 border-b border-gray-100">
                <Text variant="headlineSmall" className="font-bold mb-2">
                  {selectedPost.title}
                </Text>
                
                <View className="flex-row items-center mb-3">
                  <Avatar.Text 
                    size={32} 
                    label={selectedPost.user?.full_name?.charAt(0) || 'U'} 
                    className="mr-3"
                    style={{ backgroundColor: '#FF8AB7', color: 'white' }}
                  />
                  <View>
                    <Text variant="bodyMedium" className="font-medium">
                      {selectedPost.user?.full_name || 'Unknown User'}
                    </Text>
                    <Text variant="bodySmall" className="text-gray-600">
                      {formatDate(selectedPost.created_at)}
                    </Text>
                  </View>
                </View>
                
                <Text variant="bodyLarge" className="text-gray-800 leading-6">
                  {selectedPost.body}
                </Text>
              </View>
              
              {/* Comments Section */}
              <View className="p-4">
                <Text variant="titleMedium" className="font-bold mb-4">
                  Comments ({selectedPost.comments?.length || 0})
                </Text>
                
                {selectedPost.comments?.map((comment) => (
                  <View key={comment.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <View className="flex-row items-center mb-2">
                      <Avatar.Text 
                        size={24} 
                        label={comment.user?.full_name?.charAt(0) || 'U'} 
                        className="mr-2"
                        style={{ backgroundColor: '#FF8AB7', color: 'white' }}
                      />
                      <Text variant="bodySmall" className="font-medium">
                        {comment.user?.full_name || 'Unknown User'}
                      </Text>
                      <Text variant="bodySmall" className="text-gray-500 ml-2">
                        • {formatDate(comment.created_at)}
                      </Text>
                    </View>
                    <Text variant="bodyMedium" className="text-gray-700">
                      {comment.body}
                    </Text>
                  </View>
                ))}
                
                {selectedPost.comments?.length === 0 && (
                  <Text variant="bodyMedium" className="text-center text-gray-500 py-8">
                    No comments yet. Be the first to comment!
                  </Text>
                )}
              </View>
            </ScrollView>
            
            {/* Comment Input */}
            <View className="p-4 border-t border-gray-200">
              <View className="flex-row items-end">
                <TextInput
                  mode="outlined"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  className="flex-1 mr-2"
                  maxLength={500}
                  style={{ backgroundColor: 'white' }}
                  outlineStyle={{ borderColor: '#FF8AB7' }}
                  activeOutlineColor="#FF8AB7"
                />
                <Button
                  mode="contained"
                  onPress={addComment}
                  loading={commenting}
                  disabled={commenting || !newComment.trim()}
                  icon="send"
                  compact
                  buttonColor="#FF8AB7"
                >
                  Post
                </Button>
              </View>
            </View>
          </SafeAreaView>
        )}
      </Modal>

      <Toast />
    </SafeAreaView>
  );
}