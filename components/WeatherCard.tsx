import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import styles from '../app/styles/HomeScreen.styles';


interface WeatherCardProps {
  location: string;
  weather: {
    temp: number;
    wind: number;
  };
  lastUpdated: Date | null;
  formatLastUpdated: () => string;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ location, weather, lastUpdated, formatLastUpdated }) => (
  <View style={styles.weatherCard}>
    <Text style={styles.weatherTitle}>Wetterbericht</Text>
    <View style={styles.weatherRow}>
      <Ionicons name="location" size={20} color="#007AFF" />
      <Text style={styles.weatherText}>{location}</Text>
    </View>
    <View style={styles.weatherRow}>
      <Ionicons name="thermometer-outline" size={20} color="#FF9500" />
      <Text style={styles.weatherText}>{weather.temp}°C</Text>
    </View>
    <View style={styles.weatherRow}>
      <Ionicons name="trending-up-outline" size={20} color="#34C759" />
      <Text style={styles.weatherText}>{weather.wind} km/h</Text>
    </View>
    {lastUpdated && (
      <View style={styles.lastUpdatedContainer}>
        <Ionicons name="time-outline" size={16} color="#999" />
        <Text style={styles.lastUpdatedText}>
          Zuletzt aktualisiert: {formatLastUpdated()}
        </Text>
      </View>
    )}
  </View>
);

export default WeatherCard;
