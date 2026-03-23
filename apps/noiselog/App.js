/**
 * App.js — NoiseLog: Sound Evidence Logger
 * 
 * Main entry point with bottom tab navigation.
 * Supports light and dark mode (automatic based on system preference).
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import MeterScreen from './src/screens/MeterScreen';
import IncidentsScreen from './src/screens/IncidentsScreen';
import ReportScreen from './src/screens/ReportScreen';
import { getTheme } from './src/theme';

const Tab = createBottomTabNavigator();

// Navigation theme adapters
import { Platform } from 'react-native';

const navFontConfig = {
  regular: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', fontWeight: '400' },
  medium: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium', fontWeight: '500' },
  bold: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', fontWeight: '700' },
  heavy: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', fontWeight: '900' },
};

const NavLightTheme = {
  ...DefaultTheme,
  fonts: navFontConfig,
  colors: {
    ...DefaultTheme.colors,
    primary: '#EF6C00',
    background: '#FAFAFA',
    card: '#FFFFFF',
    text: '#212121',
    border: '#E0E0E0',
  },
};

const NavDarkTheme = {
  ...DarkTheme,
  fonts: navFontConfig,
  colors: {
    ...DarkTheme.colors,
    primary: '#FF9800',
    background: '#121212',
    card: '#1E1E1E',
    text: '#EEEEEE',
    border: '#333333',
  },
};

/**
 * Get tab bar icon (emoji-based for simplicity, no vector icons dependency issues)
 */
function getTabIcon(route, focused) {
  const icons = {
    Meter: focused ? '🎤' : '🎙️',
    Incidents: focused ? '📋' : '📝',
    Report: focused ? '📊' : '📄',
  };
  return icons[route] || '📌';
}

export default function App() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#121212' : '#EF6C00'}
      />
      <NavigationContainer theme={isDark ? NavDarkTheme : NavLightTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused }) => {
              const icon = getTabIcon(route.name, focused);
              return (
                <React.Fragment>
                  {/* Using Text for emoji icons — works everywhere */}
                  <StatusBar hidden={false} />
                  {React.createElement(
                    require('react-native').Text,
                    { style: { fontSize: 22 } },
                    icon
                  )}
                </React.Fragment>
              );
            },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.tabBarInactive,
            tabBarStyle: {
              backgroundColor: theme.colors.tabBar,
              borderTopColor: theme.colors.border,
              height: 64,
              paddingBottom: 8,
              paddingTop: 4,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
            headerStyle: {
              backgroundColor: isDark ? '#1E1E1E' : '#EF6C00',
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: '700',
            },
          })}
        >
          <Tab.Screen
            name="Meter"
            component={MeterScreen}
            options={{
              title: '🎤 Sound Meter',
              headerTitle: 'NoiseLog',
            }}
          />
          <Tab.Screen
            name="Incidents"
            component={IncidentsScreen}
            options={{
              title: '📋 Incidents',
              headerTitle: 'Incident History',
            }}
          />
          <Tab.Screen
            name="Report"
            component={ReportScreen}
            options={{
              title: '📊 Report',
              headerTitle: 'Generate Report',
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}
