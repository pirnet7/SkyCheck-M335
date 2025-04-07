import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
 
const API_URL = 'https://api.open-meteo.com/v1/forecast';
const STORAGE_KEY_WEEKLY_WEATHER = 'weekly_weather_data';
const STORAGE_KEY_LOCATION = 'location_name';
const STORAGE_KEY_WEEKLY_TIMESTAMP = 'weekly_weather_timestamp';
 
export default function WeeklyWeatherScreen() {
  const [weeklyWeather, setWeeklyWeather] = useState(null);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
 
  // Lädt gespeicherte Daten beim Komponenten-Mount
  useEffect(() => {
    loadSavedData();
  }, []);
 
  const loadSavedData = async () => {
    try {
      const weatherJson = await AsyncStorage.getItem(STORAGE_KEY_WEEKLY_WEATHER);
      const savedLocation = await AsyncStorage.getItem(STORAGE_KEY_LOCATION);
      const timestampStr = await AsyncStorage.getItem(STORAGE_KEY_WEEKLY_TIMESTAMP);
     
      if (weatherJson && savedLocation) {
        setWeeklyWeather(JSON.parse(weatherJson));
        setLocation(savedLocation);
       
        if (timestampStr) {
          setLastUpdated(new Date(parseInt(timestampStr)));
        }
      } else {
        // Wenn keine Daten gespeichert sind, lade neue Daten
        fetchWeeklyWeather();
      }
    } catch (error) {
      console.error('Fehler beim Laden der gespeicherten Daten:', error);
    }
  };
 
  const saveData = async (weatherData) => {
    try {
      const timestamp = new Date().getTime();
     
      await AsyncStorage.setItem(STORAGE_KEY_WEEKLY_WEATHER, JSON.stringify(weatherData));
      await AsyncStorage.setItem(STORAGE_KEY_WEEKLY_TIMESTAMP, timestamp.toString());
     
      setLastUpdated(new Date(timestamp));
    } catch (error) {
      console.error('Fehler beim Speichern der Daten:', error);
    }
  };
 
  const fetchWeeklyWeather = async () => {
    setLoading(true);
    try {
      // Lade gespeicherte Location-Daten
      const savedLocation = await AsyncStorage.getItem(STORAGE_KEY_LOCATION);
     
      if (!savedLocation) {
        console.log('Keine gespeicherte Location gefunden');
        setLoading(false);
        return;
      }
     
      setLocation(savedLocation);
     
      // Koordinaten für den Standort abrufen
      const geocoded = await getCoordinatesForLocation(savedLocation);
      if (!geocoded) {
        setLoading(false);
        return;
      }
     
      const { latitude, longitude } = geocoded;
     
      // Wöchentliche Wetterdaten abrufen
      const response = await fetch(
        `${API_URL}?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max&timezone=auto&forecast_days=7`
      );
     
      const data = await response.json();
     
      if (data && data.daily) {
        const processedData = processWeatherData(data);
        setWeeklyWeather(processedData);
        saveData(processedData);
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Wetterdaten:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
 
  const getCoordinatesForLocation = async (locationName) => {
    try {
      const geocodeModule = require('expo-location');
      const geocoded = await geocodeModule.geocodeAsync(locationName);
     
      if (geocoded.length === 0) {
        console.log('Ort nicht gefunden');
        return null;
      }
     
      return {
        latitude: geocoded[0].latitude,
        longitude: geocoded[0].longitude
      };
    } catch (error) {
      console.error('Fehler beim Geocoding:', error);
      return null;
    }
  };
 
  const processWeatherData = (data) => {
    return data.daily.time.map((date, index) => {
      return {
        date: date,
        dayOfWeek: formatDayOfWeek(new Date(date)),
        tempMax: data.daily.temperature_2m_max[index],
        tempMin: data.daily.temperature_2m_min[index],
        precipitation: data.daily.precipitation_probability_max[index],
        windSpeed: data.daily.windspeed_10m_max[index]
      };
    });
  };
 
  const formatDayOfWeek = (date) => {
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    return days[date.getDay()];
  };
 
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit'
    });
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
 
  const getWeatherIcon = (precipitation, tempMax) => {
    if (precipitation > 50) {
      return "rainy";
    } else if (precipitation > 20) {
      return "partly-sunny";
    } else if (tempMax > 25) {
      return "sunny";
    } else {
      return "cloudy";
    }
  };
 
  const onRefresh = () => {
    setRefreshing(true);
    fetchWeeklyWeather();
  };
 
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
     
      <View style={styles.header}>
        <Text style={styles.title}>Wochenvorhersage</Text>
        {location ? (
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color="#007AFF" />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        ) : null}
      </View>
     
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          <Text style={styles.loaderText}>Wetterdaten werden geladen...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {weeklyWeather ? (
            <>
              {weeklyWeather.map((day, index) => (
                <View key={index} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayName}>{day.dayOfWeek}</Text>
                    <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
                  </View>
                 
                  <View style={styles.weatherDetails}>
                    <View style={styles.iconContainer}>
                      <Ionicons name={getWeatherIcon(day.precipitation, day.tempMax)} size={40} color="#007AFF" />
                    </View>
                   
                    <View style={styles.tempContainer}>
                      <View style={styles.tempRow}>
                        <Ionicons name="arrow-up" size={16} color="#FF9500" />
                        <Text style={styles.tempText}>{day.tempMax} °C</Text>
                      </View>
                      <View style={styles.tempRow}>
                        <Ionicons name="arrow-down" size={16} color="#5856D6" />
                        <Text style={styles.tempText}>{day.tempMin} °C</Text>
                      </View>
                    </View>
                   
                    <View style={styles.otherDetailsContainer}>
                      <View style={styles.detailRow}>
                        <Ionicons name="water" size={16} color="#007AFF" />
                        <Text style={styles.detailText}>{day.precipitation}%</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="trending-up-outline" size={16} color="#34C759" />
                        <Text style={styles.detailText}>{day.windSpeed} km/h</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
 
              {lastUpdated && (
                <View style={styles.lastUpdatedContainer}>
                  <Ionicons name="time-outline" size={16} color="#999" />
                  <Text style={styles.lastUpdatedText}>
                    Zuletzt aktualisiert: {formatLastUpdated()}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="cloud-offline-outline" size={60} color="#999" />
              <Text style={styles.noDataText}>Keine Wetterdaten verfügbar</Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={fetchWeeklyWeather}
              >
                <Text style={styles.refreshButtonText}>Aktualisieren</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginBottom: 10,
  },
  loaderText: {
    color: '#666',
    fontSize: 16,
  },
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dayDate: {
    fontSize: 16,
    color: '#666',
  },
  weatherDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    flex: 1,
    alignItems: 'center',
  },
  tempContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  tempText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 5,
  },
  otherDetailsContainer: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 5,
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
    paddingTop: 10,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 5,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  noDataText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  }
});