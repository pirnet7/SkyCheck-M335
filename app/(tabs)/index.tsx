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

  // Lädt gespeicherte Daten beim App-Start
  useEffect(() => {
    loadSavedData();
  }, []);

  // Speichert Daten bei Änderungen
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
  
    // Standort abrufen
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
      // Geocode the location name to get coordinates
      const geocoded = await Location.geocodeAsync(manualLocation);
      
      if (geocoded.length === 0) {
        Alert.alert('Fehler', 'Ort nicht gefunden');
        setLoading(false);
        return;
      }

      const { latitude, longitude } = geocoded[0];
      setLocation(manualLocation);

      // Get weather data for the coordinates
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

  // Formatiert das Datum für die Anzeige
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
              <Text style={styles.weatherText}>Temperatur: {weather.temp}°C</Text>
            </View>
            <View style={styles.weatherRow}>
              <Ionicons name="trending-up-outline" size={20} color="#34C759" />
              <Text style={styles.weatherText}>Wind: {weather.wind} km/h</Text>
            </View>
            <View style={styles.weatherRow}>
              <Ionicons name="body-outline" size={20} color="#5856D6" />
              <Text style={styles.weatherText}>Gefühlte Temp: {weather.feels_like}°C</Text>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: '#f7f9fc',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: 'white',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  loaderContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  loader: {
    marginBottom: 10,
  },
  loaderText: {
    color: '#666',
    fontSize: 16,
  },
  weatherCard: {
    marginTop: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  weatherTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  weatherText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
    flexShrink: 1,
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 5,
  }
});