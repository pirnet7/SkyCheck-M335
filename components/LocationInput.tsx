import React from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../app/styles/HomeScreen.styles';

interface LocationInputProps {
  manualLocation: string;
  setManualLocation: (location: string) => void;
  searchLocation: () => void;
  getLocationAndWeather: () => void;
}

const LocationInput: React.FC<LocationInputProps> = ({ manualLocation, setManualLocation, searchLocation, getLocationAndWeather }) => (
  <View style={styles.inputContainer}>
    <TextInput 
      style={styles.input} 
      placeholder="Ort eingeben..." 
      placeholderTextColor="#999"
      value={manualLocation}
      onChangeText={setManualLocation}
      onSubmitEditing={searchLocation}
    />
    <TouchableOpacity 
      onPress={searchLocation} 
      style={styles.iconButton}
      activeOpacity={0.7}
    >
      <Ionicons name="search" size={24} color="white" />
    </TouchableOpacity>
    <TouchableOpacity 
      onPress={getLocationAndWeather} 
      style={[styles.iconButton, { marginLeft: 8 }]}
      activeOpacity={0.7}
    >
      <Ionicons name="location-sharp" size={24} color="white" />
    </TouchableOpacity>
  </View>
);

export default LocationInput;
