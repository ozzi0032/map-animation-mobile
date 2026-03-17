import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BG } from '../../src/constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name: IoniconsName;
  activeName: IoniconsName;
  color: string;
  focused: boolean;
  size?: number;
  isCreate?: boolean;
}

function TabIcon({ name, activeName, color, focused, size = 22, isCreate }: TabIconProps) {
  if (isCreate) {
    return (
      <View style={[styles.createIconWrap, focused && styles.createIconWrapActive]}>
        <Ionicons
          name={focused ? activeName : name}
          size={20}
          color={focused ? Colors.white : Colors.textSecondary}
        />
      </View>
    );
  }

  return (
    <View style={styles.iconWrap}>
      <Ionicons name={focused ? activeName : name} size={size} color={color} />
      {focused && <View style={[styles.activeDot, { backgroundColor: color }]} />}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="create"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="create"
        options={{
          tabBarLabel: 'Create',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="flash-outline"
              activeName="flash"
              color={color}
              focused={focused}
              isCreate
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Templates',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="grid-outline" activeName="grid" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          tabBarLabel: 'Projects',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="film-outline" activeName="film" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          tabBarLabel: 'Queue',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="list-outline" activeName="list" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="person-outline"
              activeName="person"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(7,9,19,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    height: Platform.OS === 'ios' ? 80 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    elevation: 0,
  },
  tabItem: {
    paddingTop: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: -2,
  },
  iconWrap: {
    alignItems: 'center',
    width: 36,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  createIconWrap: {
    width: 38,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  createIconWrapActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.50,
    shadowRadius: 8,
    elevation: 6,
  },
});
