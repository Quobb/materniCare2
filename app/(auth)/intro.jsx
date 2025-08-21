import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Dimensions, Image, ScrollView } from "react-native";
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
const { width, height } = Dimensions.get('window');

export default function MaternicareIntroScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const animationRefs = [useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    // Start animation for current page
    if (animationRefs[currentPage].current?.play) {
      animationRefs[currentPage].current.play();
    }
  }, [currentPage]);

  const pages = [
    {
      id: 0,
      title: "Pregnancy Tracking",
      subtitle: "Your journey, beautifully tracked",
      description: "Monitor your baby's growth week by week with personalized insights, appointments, and milestone celebrations throughout your pregnancy.",
      animationSource: require('../../assets/animation/Pregnancy stages-bro.png'),
      fallbackIcon: "heart",
      backgroundColor: "bg-pink-50",
      primaryColor: "#EC4899",
      secondaryColor: "#F472B6",
      features: [
        "👶 Weekly baby development",
        "📅 Appointment reminders", 
        "📊 Health tracking",
        "🎉 Milestone celebrations"
      ]
    },
    {
      id: 1,
      title: "Expert Care Team",
      subtitle: "Connect with healthcare professionals",
      description: "Access certified midwives, doctors, and lactation consultants. Get personalized advice and support whenever you need it.",
      animationSource: require('../../assets/animation/Gynecology consultation-cuate.png'),
      fallbackIcon: "medical",
      backgroundColor: "bg-purple-50",
      primaryColor: "#8B5CF6",
      secondaryColor: "#A78BFA",
      features: [
        "👩‍⚕️ 24/7 expert consultation",
        "💬 Live chat support",
        "📞 Emergency helpline",
        "🏥 Hospital network access"
      ]
    },
    {
      id: 2,
      title: "Wellness & Nutrition",
      subtitle: "Healthy mom, healthy baby",
      description: "Personalized meal plans, exercise routines, and wellness tips designed specifically for each trimester of your pregnancy.",
      animationSource: require('../../assets/animation/eating vegan food-amico.png'),
      fallbackIcon: "nutrition",
      backgroundColor: "bg-green-50",
      primaryColor: "#10B981",
      secondaryColor: "#34D399",
      features: [
        "🥗 Trimester meal plans",
        "🏃‍♀️ Safe exercise routines",
        "💊 Supplement tracking",
        "🧘‍♀️ Meditation & relaxation"
      ]
    }
  ];

  const currentPageData = pages[currentPage];

  // Fixed animation component that handles PNG images properly
  const AnimationOrIcon = ({ source, animationRef, fallbackIcon, color }) => {
    const useImage = true; // Set to true to use PNG images
    const useLottie = false; // Set to true when you have proper Lottie JSON files
    
    if (useLottie) {
      return (
        <LottieView
          ref={animationRef}
          source={source} // This should be a .json file for Lottie
          style={{ width: 250, height: 250 }}
          autoPlay
          loop
        />
      );
    } else if (useImage) {
      return (
        <View className="items-center justify-center">
          <Image
            source={source}
            style={{ 
              width: 200, 
              height: 200,
              resizeMode: 'contain'
            }}
          />
        </View>
      );
    } else {
      // Fallback to icon
      return (
        <View 
          className="items-center justify-center rounded-full"
          style={{ 
            width: 200, 
            height: 200, 
            backgroundColor: color + '20' 
          }}
        >
          <Ionicons name={fallbackIcon} size={80} color={color} />
        </View>
      );
    }
  };

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      // Last page - go to main app
      router.push("discover");
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const skipToApp = () => {
    router.push("discover");
  };

  return (
    <ScrollView className={`flex-1 ${currentPageData.backgroundColor}`}>
      {/* Header with Skip Button and Logo */}
      <View className="flex-row items-center justify-between px-6 pt-12">
        <TouchableOpacity onPress={prevPage} className={currentPage === 0 ? "opacity-0" : ""}>
          <Ionicons name="chevron-back" size={24} color={currentPageData.primaryColor} />
        </TouchableOpacity>
        
        {/* App Logo/Title */}
        <View className="flex-row items-center">
          <Ionicons name="heart" size={20} color={currentPageData.primaryColor} />
          <Text 
            className="ml-1 text-lg font-bold"
            style={{ color: currentPageData.primaryColor }}
          >
            Maternicare 
          </Text>
        </View>
        
        <TouchableOpacity onPress={skipToApp}>
          <Text style={{ color: currentPageData.primaryColor }} className="font-medium">
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Page Indicators */}
      <View className="flex-row justify-center mt-6 space-x-2">
        {pages.map((_, index) => (
          <View
            key={index}
            className={`h-2 rounded-full ${
              index === currentPage ? 'w-8' : 'w-2'
            }`}
            style={{
              backgroundColor: index === currentPage 
                ? currentPageData.primaryColor 
                : currentPageData.primaryColor + '30'
            }}
          />
        ))}
      </View>

      {/* Main Content */}
      <View className="items-center justify-center flex-1 px-6">
        {/* Animation */}
        <View className="items-center mb-8">
          <AnimationOrIcon
            source={currentPageData.animationSource}
            animationRef={animationRefs[currentPage]}
            fallbackIcon={currentPageData.fallbackIcon}
            color={currentPageData.primaryColor}
          />
        </View>

        {/* Title & Description */}
        <View className="items-center mb-8">
          <Text className="mb-2 text-3xl font-bold text-center text-gray-800">
            {currentPageData.title}
          </Text>
          <Text 
            className="mb-4 text-lg font-medium text-center"
            style={{ color: currentPageData.primaryColor }}
          >
            {currentPageData.subtitle}
          </Text>
          <Text className="px-4 text-base leading-6 text-center text-gray-600">
            {currentPageData.description}
          </Text>
        </View>

        {/* Features List */}
        <View className="w-full max-w-sm">
          {currentPageData.features.map((feature, index) => (
            <View key={index} className="flex-row items-center px-2 mb-3">
              <Text className="text-base text-gray-700">{feature}</Text>
            </View> 
          ))}
        </View>
      </View>

      {/* Bottom Navigation */}
      <View className="px-6 pb-8">
        {/* Special CTA for last page */}
        {currentPage === pages.length - 1 && (
          <View className="p-4 mb-4 bg-pink-100 rounded-2xl">
            <View className="flex-row items-center justify-center mb-2">
              <Ionicons name="shield-checkmark" size={20} color="#BE185D" />
              <Text className="ml-2 font-bold text-pink-800">
                Trusted by 100,000+ Mothers!
              </Text>
            </View>
            <Text className="text-sm text-center text-pink-700">
              Join our community of empowered mothers on their pregnancy journey
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={nextPage}
          className="w-full py-4 shadow-lg rounded-2xl"
          style={{
            backgroundColor: currentPageData.primaryColor,
            shadowColor: currentPageData.primaryColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Text className="text-xl font-bold text-center text-white">
            {currentPage === pages.length - 1 ? "Start Your Journey!" : "Continue"}
          </Text>
          {currentPage === pages.length - 1 && (
            <Text className="mt-1 text-sm text-center text-white opacity-90">
              Track • Connect • Thrive
            </Text>
          )}
        </TouchableOpacity>

        {/* Additional info for first page */}
        {currentPage === 0 && (
          <Text className="mt-4 text-xs text-center text-gray-500">
            Your privacy and data security are our top priority
          </Text>
        )}
      </View>
    </ScrollView>
  );
}