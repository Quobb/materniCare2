import React, { useState } from 'react';
import { View, Text } from 'react-native';
import CountryPicker from 'react-native-country-picker-modal';

const CountryCodePicker = ({ onSelect }) => {
  const [countryCode, setCountryCode] = useState('GH'); // Default: United States
  const [callingCode, setCallingCode] = useState('233');

  const handleSelect = (country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
    if (onSelect) {
      onSelect({
        countryCode: country.cca2,
        callingCode: country.callingCode[0],
        countryName: country.name,
      });
    }
  };

  return (
    <View className="flex-row items-center bg-gray-100 px-3 py-2 rounded-xl">
      <CountryPicker
        countryCode={countryCode}
        withFilter
        withFlag
        withCallingCode
        withEmoji
        onSelect={handleSelect}
        containerButtonStyle={{ marginRight: 8 }}
      />
      <Text className="text-base font-semibold text-cname">+{callingCode}</Text>
    </View>
  );
};

export default CountryCodePicker;
