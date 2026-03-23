import React from 'react';
import { StatusBar, Platform, View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import TimerScreen from './src/screens/TimerScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createMaterialTopTabNavigator();
const BG = '#1C2529';
const AMBER = '#FFB300';
const GREY = '#607D8B';

const fontConfig = {
  regular: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', fontWeight: '400' },
  medium: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium', fontWeight: '500' },
  bold: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', fontWeight: '700' },
  heavy: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', fontWeight: '900' },
};

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>;
}

function AppContent() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <Tab.Navigator
        initialRouteName="Timer"
        screenOptions={{
          tabBarStyle: { backgroundColor: BG, elevation: 0, height: 44 },
          tabBarIndicatorStyle: { backgroundColor: AMBER, height: 2 },
          tabBarShowLabel: false,
          swipeEnabled: true,
        }}
      >
        <Tab.Screen name="Timer" component={TimerScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⏱" focused={focused} /> }} />
        <Tab.Screen name="Stats" component={StatsScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }} />
        <Tab.Screen name="Settings" component={SettingsScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }} />
      </Tab.Navigator>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={{ dark: true, fonts: fontConfig,
          colors: { primary: AMBER, background: BG, card: BG, text: '#ECEFF1', border: BG, notification: AMBER } }}>
        <AppContent />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
});
