import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '../../src/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Templates',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🗺️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarLabel: 'Create',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>✨</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          tabBarLabel: 'Projects',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📁</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          tabBarLabel: 'Queue',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>⏳</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
