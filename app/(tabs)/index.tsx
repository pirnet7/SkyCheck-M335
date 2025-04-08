import { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  TextInput, 
  View, 
  Alert, 
  TouchableOpacity, 
  Text, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/HomeScreen.styles';

const API_URL = 'https://api.open-meteo.com/v1/forecast';
const STORAGE_KEY_WEATHER = 'weather_data';
const STORAGE_KEY_LOCATION = 'location_name';
const STORAGE_KEY_TIMESTAMP = 'weather_timestamp';

export default function HomeScreen() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    loadSavedData();
  }, []);

  useEffect(() => {
    if (!isInitialLoad && weather) {
      saveData();
    }
  }, [weather, location]);

  const loadSavedData = async () => {
    try {
      const weatherJson = await AsyncStorage.getItem(STORAGE_KEY_WEATHER);
      const savedLocation = await AsyncStorage.getItem(STORAGE_KEY_LOCATION);
      const timestampStr = await AsyncStorage.getItem(STORAGE_KEY_TIMESTAMP);
      
      if (weatherJson && savedLocation) {
        const weatherData = JSON.parse(weatherJson);
        setWeather(weatherData);
        setLocation(savedLocation);
        
        if (timestampStr) {
          const timestamp = parseInt(timestampStr);
          setLastUpdated(new Date(timestamp));
        }
      }
      
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Fehler beim Laden der gespeicherten Daten:', error);
      setIsInitialLoad(false);
    }
  };

  const saveData = async () => {
    try {
      const timestamp = new Date().getTime();
      await AsyncStorage.setItem(STORAGE_KEY_WEATHER, JSON.stringify(weather));
      await AsyncStorage.setItem(STORAGE_KEY_LOCATION, location);
      await AsyncStorage.setItem(STORAGE_KEY_TIMESTAMP, timestamp.toString());
      setLastUpdated(new Date(timestamp));
    } catch (error) {
      console.error('Fehler beim Speichern der Daten:', error);
    }
  };

  const getLocationAndWeather = async () => {
    setLoading(true);
  
    let { status } = await Location.getForegroundPermissionsAsync();
  
    if (status !== 'granted') {
      let { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (newStatus !== 'granted') {
        Alert.alert('Fehler', 'Zugriff auf Standort wurde verweigert. Bitte in den Einstellungen erlauben.');
        setLoading(false);
        return;
      }
    }
  
    let locationData = await Location.getCurrentPositionAsync({});
    let { latitude, longitude } = locationData.coords;
  
    try {
      let geoData = await Location.reverseGeocodeAsync({ latitude, longitude });
  
      if (geoData && geoData.length > 0) {
        const address = geoData[0];
        setLocation(address.city || address.region || `${address.street}, ${address.postalCode}`);
      } else {
        setLocation(`Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`);
      }
    } catch (error) {
      setLocation(`Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`);
    }
  
    fetch(`${API_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true`)
      .then((response) => response.json())
      .then((data) => {
        setWeather({
          temp: data.current_weather.temperature,
          wind: data.current_weather.windspeed,
          feels_like: data.current_weather?.apparent_temperature || 'N/A',
          lastUpdated: new Date().toISOString()
        });
      })
      .catch(() => Alert.alert('Fehler', 'Wetterdaten konnten nicht geladen werden'))
      .finally(() => setLoading(false));
  };

  const searchLocation = async () => {
    if (!manualLocation.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Ort ein');
      return;
    }

    setLoading(true);
    try {
      const geocoded = await Location.geocodeAsync(manualLocation);
      
      if (geocoded.length === 0) {
        Alert.alert('Fehler', 'Ort nicht gefunden');
        setLoading(false);
        return;
      }

      const { latitude, longitude } = geocoded[0];
      setLocation(manualLocation);

      fetch(`${API_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true`)
        .then((response) => response.json())
        .then((data) => {
          setWeather({
            temp: data.current_weather.temperature,
            wind: data.current_weather.windspeed,
            feels_like: data.current_weather?.apparent_temperature || 'N/A',
            lastUpdated: new Date().toISOString()
          });
        })
        .catch((error) => Alert.alert('Fehler', 'Wetterdaten konnten nicht geladen werden'));
    } catch (error) {
      Alert.alert('Fehler', 'Konnte Ortsinformationen nicht abrufen');
    } finally {
      setLoading(false);
    }
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    return lastUpdated.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Funktion zur Wetterempfehlung
  const getWeatherRecommendation = () => {
    if (!weather) return '';
    
    if (weather.temp <= 5) return 'Heute eine dicke Jacke mitnehmen, es ist sehr kalt.';
    if (weather.temp > 5 && weather.temp <= 15) return 'Heute einen Pullover oder leichte Jacke anziehen.';
    if (weather.temp > 15 && weather.temp <= 25) return 'Heute ein T-Shirt reicht, es ist angenehm warm.';
    if (weather.temp > 25 && weather.temp <= 30) return 'Heute Sonnencreme auftragen, es wird heiß!';
    if (weather.temp > 30) return 'Achtung: Es ist sehr heiß! Viel Wasser trinken und Sonne meiden.';
    return 'Kein spezieller Tipp für heute.';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}
      >
        {/* Input and Location Button */}
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
            style={[styles.iconButton, {marginLeft: 8}]}
            activeOpacity={0.7}
          >
            <Ionicons name="location-sharp" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            <Text style={styles.loaderText}>Wetterdaten werden geladen...</Text>
          </View>
        )}

        {/* Weather Display */}
        {weather && (
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
        )}

        {/* Weather Recommendations */}
        {weather && (
          <View style={styles.weatherRecommendation}>
            <Text style={styles.recommendationText}>{getWeatherRecommendation()}</Text>
          </View>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
