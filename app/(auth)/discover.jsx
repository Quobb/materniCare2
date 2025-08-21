import React from "react";
import { View, Text, Image, TouchableOpacity, SafeAreaView, Dimensions } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { Ionicons } from '@expo/vector-icons';
import "../../global.css";
const { width } = Dimensions.get("window");
import { router } from 'expo-router';

const carouselData = [
  {
    image: require("../../assets/animation/Pregnancy stages-bro.png"),
    title: "Track Your Journey",
    description: "Monitor your pregnancy week by week"
  },
  {
    image: require("../../assets/animation/Gynecology consultation-amico.png"),
    title: "Expert Care",
    description: "Connect with healthcare professionals"
  },
  {
    image: require("../../assets/animation/Baby birth-cuate.png"),
    title: "Baby Development",
    description: "Watch your baby grow with 3D visuals"
  },
  {
    image: require("../../assets/animation/Motherhood-cuate.png"),
    title: "Prenatal Care",
    description: "Personalized care plans and reminders"
  },
  {
    image: require("../../assets/animation/eating vegan food-amico.png"),
    title: "Wellness Tips",
    description: "Nutrition and exercise guidance"
  },
  {
    image: require("../../assets/animation/Hospital family visit-rafiki.png"),
    title: "Community Support",
    description: "Connect with other expecting mothers"
  }
];

export default function MaternicareDiscoverScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header Section */}
      <View className="items-center px-6 pt-8 pb-4">
        <View className="flex-row items-center mb-2">
          <Ionicons name="heart" size={32} color="#EC4899" />
          <Text className="ml-2 text-2xl font-bold text-pink-600">
            MaterniCare
          </Text>
        </View>
        <Text className="text-sm text-center text-gray-600">
          Your Complete Pregnancy Care Companion
        </Text>
      </View>

      {/* Content Section */}
      <View className="items-center justify-center flex-1 px-4">
        <Text className="mb-6 text-3xl font-bold text-center text-pink-600">
          Discover Your Journey
        </Text>

        <Carousel
          width={width - 40}
          height={320}
          data={carouselData}
          scrollAnimationDuration={600}
          renderItem={({ item }) => (
            <View className="p-6 mx-2 bg-white shadow-lg rounded-3xl">
              <Image
                source={item.image}
                resizeMode="contain"
                className="w-full h-48 mb-4"
              />
              <Text className="mb-2 text-xl font-bold text-center text-gray-800">
                {item.title}
              </Text>
              <Text className="text-base leading-relaxed text-center text-gray-600">
                {item.description}
              </Text>
            </View>
          )}
          style={{ borderRadius: 20 }}
          loop
          autoPlay
          autoPlayInterval={4000}
        />

        <View className="px-6 mt-8">
          <View className="p-4 mb-4 bg-pink-100 rounded-2xl">
            <View className="flex-row items-center justify-center mb-2">
              <Ionicons name="shield-checkmark" size={20} color="#BE185D" />
              <Text className="ml-2 font-bold text-pink-800">
                Trusted Healthcare Platform
              </Text>
            </View>
            <Text className="text-sm text-center text-pink-700">
              Clinically validated tools and expert-approved content for your peace of mind
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View className="px-6 pb-8">
        <View className="flex-row justify-between gap-4 mb-4">
          <TouchableOpacity
            className="items-center justify-center flex-1 bg-pink-600 shadow-sm h-14 rounded-2xl"
            onPress={() => router.push("./signin")}
          >
            <Text className="text-lg font-bold text-white">Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="items-center justify-center flex-1 bg-white border-2 border-pink-200 shadow-sm h-14 rounded-2xl"
            onPress={() => router.push("./signup")}
          >
            <Text className="text-lg font-bold text-pink-600">Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Additional Features Preview */}
        <View className="flex-row justify-center mt-4 space-x-8">
          <View className="items-center">
            <View className="p-3 mb-2 bg-purple-100 rounded-full">
              <Ionicons name="calendar" size={24} color="#8B5CF6" />
            </View>
            <Text className="text-xs font-medium text-gray-600">Appointments</Text>
          </View>
          
          <View className="items-center">
            <View className="p-3 mb-2 bg-green-100 rounded-full">
              <Ionicons name="fitness" size={24} color="#10B981" />
            </View>
            <Text className="text-xs font-medium text-gray-600">Wellness</Text>
          </View>
          
          <View className="items-center">
            <View className="p-3 mb-2 bg-blue-100 rounded-full">
              <Ionicons name="chatbubbles" size={24} color="#3B82F6" />
            </View>
            <Text className="text-xs font-medium text-gray-600">Support</Text>
          </View>
          
          <View className="items-center">
            <View className="p-3 mb-2 bg-orange-100 rounded-full">
              <Ionicons name="library" size={24} color="#F59E0B" />
            </View>
            <Text className="text-xs font-medium text-gray-600">Resources</Text>
          </View>
        </View>

        {/* Version/Trust Info */}
        <Text className="mt-6 text-xs text-center text-gray-400">
          Developed with certified healthcare professionals • HIPAA Compliant
        </Text>
      </View>
    </SafeAreaView>
  );
}