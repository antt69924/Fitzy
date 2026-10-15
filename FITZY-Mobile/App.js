import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './src/store';
import { hydrateSession } from './src/store/slices/authSlice';
import { hydrateCart } from './src/store/slices/cartSlice';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/constants/theme';

function Bootstrap() {
  const dispatch = useDispatch(); const hydrated = useSelector(state => state.auth.hydrated);
  const role = useSelector(state => state.auth.user?.role);
  useEffect(() => { dispatch(hydrateSession()); dispatch(hydrateCart()); }, [dispatch]);
  if (!hydrated) return <View style={{ flex: 1, backgroundColor: theme.colors.paper, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={theme.colors.ink} /></View>;
  return <NavigationContainer key={role === 'admin' ? 'admin-navigation' : 'store-navigation'} theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.colors.paper, card: theme.colors.paper, text: theme.colors.ink, primary: theme.colors.ink } }}><StatusBar barStyle="dark-content" backgroundColor={theme.colors.paper} /><AppNavigator /></NavigationContainer>;
}

export default function App() { return <Provider store={store}><Bootstrap /></Provider>; }
