import React from 'react';
import { Text, View } from 'react-native';
import styles from '../app/styles/HomeScreen.styles';


interface WeatherRecommendationProps {
  weather: {
    temp: number;
  };
}

const WeatherRecommendation: React.FC<WeatherRecommendationProps> = ({ weather }) => {
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
    <View style={styles.weatherRecommendation}>
      <Text style={styles.recommendationText}>{getWeatherRecommendation()}</Text>
    </View>
  );
};

export default WeatherRecommendation;
