import React from 'react';
import CalendarScreen from '../src/screens/CalendarScreen';
import { useNavigation } from '@react-navigation/native';

export default function Calendar() {
  const navigation = useNavigation();
  return <CalendarScreen navigation={navigation} />;
}
