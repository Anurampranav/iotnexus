import React from 'react';
import { Tabs } from 'expo-router';
import { GlassTabBar } from '@components/navigation/GlassTabBar';
import { Colors } from '@design/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="devices" />
      <Tabs.Screen name="automations" />
      <Tabs.Screen name="water" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
