import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import styles from '../app/styles/HomeScreen.styles';


const LoadingIndicator: React.FC = () => (
  <View style={styles.loaderContainer}>
    <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
    <Text style={styles.loaderText}>Wetterdaten werden geladen...</Text>
  </View>
);

export default LoadingIndicator;
