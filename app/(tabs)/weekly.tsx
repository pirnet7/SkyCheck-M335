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
    <SafeAreaView>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View>
        <Text>Wochenvorhersage!</Text>
        {location ? (
          <View >
            <Ionicons name="location" size={16} color="#007AFF" />
            <Text >{location}</Text>
          </View>
        ) : null}
      </View>
      
      {loading && !refreshing ? (
        <View>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Wetterdaten werden geladen...</Text>
        </View>
      ) : (
        <ScrollView 
        
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {weeklyWeather ? (
            <>
              {weeklyWeather.map((day, index) => (
                <View key={index} >
                  <View >
                    <Text >{day.dayOfWeek}</Text>
                    <Text >{formatDate(day.date)}</Text>
                  </View>
                  
                  <View >
                    <View >
                      <Ionicons name={getWeatherIcon(day.precipitation, day.tempMax)} size={40} color="#007AFF" />
                    </View>
                    
                    <View >
                      <View >
                        <Ionicons name="arrow-up" size={16} color="#FF9500" />
                        <Text>{day.tempMax} °C</Text>
                      </View>
                      <View>
                        <Ionicons name="arrow-down" size={16} color="#5856D6" />
                        <Text >{day.tempMin} °C</Text>
                      </View>
                    </View>
                    
                    <View>
                      <View>
                        <Ionicons name="water" size={16} color="#007AFF" />
                        <Text>{day.precipitation}%</Text>
                      </View>
                      <View>
                        <Ionicons name="trending-up-outline" size={16} color="#34C759" />
                        <Text>{day.windSpeed} km/h</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              {lastUpdated && (
                <View>
                  <Ionicons name="time-outline" size={16} color="#999" />
                  <Text>
                    Zuletzt aktualisiert: {formatLastUpdated()}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View >
              <Ionicons name="cloud-offline-outline" size={60} color="#999" />
              <Text>Keine Wetterdaten verfügbar</Text>
              <TouchableOpacity 
                
                onPress={fetchWeeklyWeather}
              >
                <Text >Aktualisieren</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}