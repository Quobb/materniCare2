import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import AnimatedLottieView from "lottie-react-native";
import { useNavigation } from "@react-navigation/native";
import { useRouter, useLocalSearchParams } from 'expo-router';
import "../../global.css";
export default function MaternicareLandingPage() {
  const navigation = useNavigation();
  const waveAnimation = useRef(new Animated.Value(0)).current;
  const dotAnimation = useRef(new Animated.Value(0)).current;
  const heartPulse = useRef(new Animated.Value(1)).current;
   const router = useRouter();
    const params = useLocalSearchParams();

  useEffect(() => {
    // Wave animation for text
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnimation, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Heart pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartPulse, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(heartPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Dot bounce animation
    Animated.loop(
      Animated.sequence(
        [...Array(10).keys()].map((i) =>
          Animated.timing(dotAnimation, {
            toValue: i,
            duration: 100,
            useNativeDriver: true,
          })
        )
      )
    ).start();

    // Navigate after 5 seconds
    const timer = setTimeout(() => {
       router.replace("./intro");
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Wave translation style
  const waveTransform = {
    transform: [
      {
        translateY: waveAnimation.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, -10, 0],
        }),
      },
    ],
  };

  // Heart pulse style
  const heartPulseStyle = {
    transform: [{ scale: heartPulse }],
  };

  return (
    <View className="items-center justify-center flex-1 px-6 bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Lottie Loader - Pregnancy/Baby themed */}
      <AnimatedLottieView
        source={require("../../assets/animation/pregnancy.json")}
        autoPlay
        loop
        style={{ width: 300, height: 350 }}
      />

      {/* Animated Heart Icon */}
      <Animated.Text
        style={[heartPulseStyle, { fontSize: 40, marginBottom: 10 }]}
        className="text-pink-500"
      >
        💕
      </Animated.Text>

      {/* Animated App Name */}
      <View className="items-center mb-2">
        <Animated.Text
          style={waveTransform}
          className="text-4xl font-extrabold text-pink-600"
        >
          Maternic
          <Animated.Text style={[waveTransform, { color: "#8B5CF6" }]}>
            a
          </Animated.Text>
          re
        </Animated.Text>
      
      </View>

      {/* Tagline */}
      <Text className="mb-2 text-lg font-medium text-center text-gray-600">
        Your Pregnancy Journey Partner
      </Text>

      {/* Bouncing Dots Loading Indicator */}
      <View className="flex-row mt-4 space-x-1">
        {[...Array(8)].map((_, i) => (
          <Animated.Text
            key={i}
            className="text-xl font-bold text-pink-500"
            style={{
              opacity: dotAnimation.interpolate({
                inputRange: [i - 1, i, i + 1],
                outputRange: [0.3, 1, 0.3],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  scale: dotAnimation.interpolate({
                    inputRange: [i - 1, i, i + 1],
                    outputRange: [0.8, 1.3, 0.8],
                    extrapolate: "clamp",
                  }),
                },
              ],
            }}
          >
            ●
          </Animated.Text>
        ))}
      </View>

      {/* Loading Text */}
      <Text className="mt-6 text-sm font-medium text-gray-500">
        Preparing your care dashboard...
      </Text>

      {/* Version Info */}
      <Text className="absolute text-xs text-gray-400 bottom-8">
        Version 3.0.1 • Trusted by mothers worldwide
      </Text>
    </View>
  );
}