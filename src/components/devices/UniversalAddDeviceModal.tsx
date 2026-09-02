import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '@components/glass/GlassCard';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { useDeviceStore } from '@store/deviceStore';
import type { Device } from '@models/device';

interface UniversalAddDeviceModalProps {
  visible: boolean;
  onClose: () => void;
}

interface DiscoveredDeviceItem {
  id: string;
  name: string;
  type: 'switch' | 'light' | 'pump' | 'water_sensor' | 'soil_sensor';
  category: 'electrical' | 'lighting' | 'water' | 'sensors';
  protocol: 'Local UDP (WiZ)' | 'Coolify MQTT' | 'Local LAN' | 'Smart Life Cloud';
  ipOrTopic: string;
  icon: string;
  room: string;
}

export const UniversalAddDeviceModal: React.FC<UniversalAddDeviceModalProps> = ({
  visible,
  onClose,
}) => {
  const { loadDevices } = useDeviceStore();
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'cloud'>('scan');
  const [isScanning, setIsScanning] = useState(true);
  const [discoveredList, setDiscoveredList] = useState<DiscoveredDeviceItem[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Radar wave animation for scanning
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      setIsScanning(true);
      setDiscoveredList([]);
      setAddedIds(new Set());

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();

      // Simulate local UDP & Coolify MQTT fast discovery sweep
      const timer = setTimeout(() => {
        setIsScanning(false);
        setDiscoveredList([
          {
            id: `wiz_plug_${Date.now() % 10000}`,
            name: 'Philips WiZ Smart Plug',
            type: 'switch',
            category: 'electrical',
            protocol: 'Local UDP (WiZ)',
            ipOrTopic: '192.168.1.145:38899',
            icon: 'power-socket-eu',
            room: 'Living Room',
          },
          {
            id: `mqtt_pump_${Date.now() % 10000}`,
            name: 'Borewell Submersible Pump',
            type: 'pump',
            category: 'water',
            protocol: 'Coolify MQTT',
            ipOrTopic: 'smartcodeflurry/water/pump/control',
            icon: 'pump',
            room: 'Utility Area',
          },
          {
            id: `mqtt_tank_${Date.now() % 10000}`,
            name: 'Overhead Water Tank (1500L)',
            type: 'water_sensor',
            category: 'water',
            protocol: 'Coolify MQTT',
            ipOrTopic: 'smartcodeflurry/water/tank/level',
            icon: 'water-percent',
            room: 'Rooftop',
          },
          {
            id: `wipro_bulb_${Date.now() % 10000}`,
            name: 'Wipro RGB+CCT Smart Bulb',
            type: 'light',
            category: 'lighting',
            protocol: 'Smart Life Cloud',
            ipOrTopic: 'cloud.tuya.com/dev/wipro_rgb',
            icon: 'lightbulb-on',
            room: 'Master Bedroom',
          },
        ]);
      }, 1400);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleAddDeviceToStore = (item: DiscoveredDeviceItem) => {
    const newDevice: Device = {
      id: item.id,
      name: item.name,
      type: item.type,
      manufacturer: item.protocol.includes('WiZ') ? 'Philips' : item.protocol.includes('MQTT') ? 'Coolify' : 'Wipro',
      model: item.protocol,
      protocol: item.protocol.includes('WiZ') ? 'custom' : item.protocol.includes('MQTT') ? 'mqtt' : 'tuya',
      integrationId: 'universal_engine',
      homeId: 'home_flurry_1',
      connectionStatus: 'online',
      room: item.room,
      roomId: item.room.toLowerCase().replace(/\s+/g, '_'),
      isFavorite: true,
      lastSeen: new Date().toISOString(),
      capabilities: {},
      metadata: {},
      state: {
        power: {
          value: true,
          commandStatus: 'confirmed',
          lastUpdated: new Date().toISOString(),
          isStale: false,
        },
        power_draw: {
          value: item.type === 'switch' ? 185 : item.type === 'pump' ? 1650 : 12,
          commandStatus: 'confirmed',
          lastUpdated: new Date().toISOString(),
          isStale: false,
        },
        level: {
          value: 78,
          commandStatus: 'confirmed',
          lastUpdated: new Date().toISOString(),
          isStale: false,
        },
        brightness: {
          value: 85,
          commandStatus: 'confirmed',
          lastUpdated: new Date().toISOString(),
          isStale: false,
        },
      },
    };

    useDeviceStore.setState((state) => ({
      devices: [newDevice, ...state.devices.filter((d) => d.id !== item.id)],
    }));

    setAddedIds((prev) => new Set([...prev, item.id]));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Add Smart Device</Text>
              <Text style={styles.headerSubtitle}>Universal Multi-Protocol Discovery</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'scan' && styles.tabBtnActive]}
              onPress={() => setActiveTab('scan')}
            >
              <MaterialCommunityIcons
                name="radar"
                size={18}
                color={activeTab === 'scan' ? '#FFFFFF' : Colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'scan' && styles.tabTextActive]}>
                Auto Scan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'manual' && styles.tabBtnActive]}
              onPress={() => setActiveTab('manual')}
            >
              <MaterialCommunityIcons
                name="view-grid-plus"
                size={18}
                color={activeTab === 'manual' ? '#FFFFFF' : Colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
                Categories
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'cloud' && styles.tabBtnActive]}
              onPress={() => setActiveTab('cloud')}
            >
              <MaterialCommunityIcons
                name="cloud-sync"
                size={18}
                color={activeTab === 'cloud' ? '#FFFFFF' : Colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'cloud' && styles.tabTextActive]}>
                Smart Life Sync
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab 1: Auto Scan Local Wi-Fi & Coolify */}
          {activeTab === 'scan' && (
            <ScrollView contentContainerStyle={styles.tabBody}>
              {/* Radar Box */}
              <View style={styles.radarContainer}>
                <Animated.View
                  style={[
                    styles.radarCircle,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="wifi-check"
                    size={36}
                    color={Colors.primary}
                  />
                </Animated.View>
                <Text style={styles.radarText}>
                  {isScanning
                    ? 'Scanning Local UDP (Port 38899) & Coolify MQTT...'
                    : `Found ${discoveredList.length} devices ready to add`}
                </Text>
                {isScanning && (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 8 }} />
                )}
              </View>

              {/* Discovered Items List */}
              <Text style={styles.sectionHeader}>DISCOVERED HARDWARE</Text>
              {discoveredList.map((item) => {
                const isAdded = addedIds.has(item.id);
                return (
                  <GlassCard key={item.id} style={styles.deviceCard}>
                    <View style={styles.deviceCardRow}>
                      <View style={styles.deviceIconCircle}>
                        <MaterialCommunityIcons
                          name={item.icon as any}
                          size={24}
                          color={Colors.primary}
                        />
                      </View>
                      <View style={styles.deviceTextCol}>
                        <Text style={styles.deviceName}>{item.name}</Text>
                        <View style={styles.protocolBadgeRow}>
                          <Text style={styles.protocolBadge}>{item.protocol}</Text>
                          <Text style={styles.roomBadge}>{item.room}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.addBtn, isAdded && styles.addBtnDone]}
                        onPress={() => handleAddDeviceToStore(item)}
                        disabled={isAdded}
                      >
                        <MaterialCommunityIcons
                          name={isAdded ? 'check' : 'plus'}
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text style={styles.addBtnText}>{isAdded ? 'Added' : 'Add'}</Text>
                      </TouchableOpacity>
                    </View>
                  </GlassCard>
                );
              })}
            </ScrollView>
          )}

          {/* Tab 2: Manual Device Categories */}
          {activeTab === 'manual' && (
            <ScrollView contentContainerStyle={styles.tabBody}>
              <Text style={styles.sectionHeader}>CHOOSE DEVICE TYPE</Text>
              {[
                {
                  title: 'Smart Socket / Plug',
                  desc: 'Philips WiZ (UDP 38899) & Local Relays',
                  icon: 'power-socket-eu',
                  type: 'switch' as const,
                  category: 'electrical' as const,
                  protocol: 'Local UDP (WiZ)' as const,
                },
                {
                  title: 'Water Pump & Borewell Starter',
                  desc: 'Submersible Motor with Dry-Run Safety',
                  icon: 'pump',
                  type: 'pump' as const,
                  category: 'water' as const,
                  protocol: 'Coolify MQTT' as const,
                },
                {
                  title: 'Overhead Tank Water Sensor',
                  desc: 'Ultrasonic & Hydrostatic Depth Meter',
                  icon: 'water-percent',
                  type: 'water_sensor' as const,
                  category: 'water' as const,
                  protocol: 'Coolify MQTT' as const,
                },
                {
                  title: 'Smart Light (RGB + CCT)',
                  desc: '16 Million Colors & Tunable White',
                  icon: 'lightbulb-on',
                  type: 'light' as const,
                  category: 'lighting' as const,
                  protocol: 'Local UDP (WiZ)' as const,
                },
              ].map((cat, idx) => (
                <GlassCard key={idx} style={styles.categoryCard}>
                  <TouchableOpacity
                    style={styles.categoryTouch}
                    onPress={() => {
                      handleAddDeviceToStore({
                        id: `manual_${cat.type}_${Date.now() % 10000}`,
                        name: cat.title,
                        type: cat.type,
                        category: cat.category,
                        protocol: cat.protocol,
                        ipOrTopic: 'local.lan',
                        icon: cat.icon,
                        room: 'Main Area',
                      });
                      onClose();
                    }}
                  >
                    <View style={styles.deviceIconCircle}>
                      <MaterialCommunityIcons name={cat.icon as any} size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.deviceTextCol}>
                      <Text style={styles.deviceName}>{cat.title}</Text>
                      <Text style={styles.deviceDesc}>{cat.desc}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </GlassCard>
              ))}
            </ScrollView>
          )}

          {/* Tab 3: Smart Life Cloud Sync */}
          {activeTab === 'cloud' && (
            <ScrollView contentContainerStyle={styles.tabBody}>
              <GlassCard style={styles.cloudCard}>
                <MaterialCommunityIcons name="cloud-sync" size={48} color={Colors.primary} />
                <Text style={styles.cloudTitle}>Sync Smart Life / Wipro Devices</Text>
                <Text style={styles.cloudDesc}>
                  Pull all existing smart bulbs and plugs from your Smart Life account directly into Smart CodeFlurry.
                </Text>

                <TouchableOpacity
                  style={styles.syncNowBtn}
                  onPress={() => {
                    handleAddDeviceToStore({
                      id: `wipro_synced_${Date.now() % 10000}`,
                      name: 'Wipro RGB Smart Light',
                      type: 'light',
                      category: 'lighting',
                      protocol: 'Smart Life Cloud',
                      ipOrTopic: 'cloud.tuya.com',
                      icon: 'lightbulb-on',
                      room: 'Living Room',
                    });
                    onClose();
                  }}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.syncNowText}>SYNC DEVICES NOW</Text>
                </TouchableOpacity>
              </GlassCard>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1B19',
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '85%',
    paddingBottom: Spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2725',
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#262220',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.sm,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  tabBody: {
    padding: Spacing.lg,
  },
  radarContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  radarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2A2725',
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  radarText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  sectionHeader: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  deviceCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  deviceCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  deviceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E221C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceTextCol: {
    flex: 1,
  },
  deviceName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  deviceDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  protocolBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  protocolBadge: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    color: '#FF8A50',
    backgroundColor: '#262220',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  roomBadge: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  addBtnDone: {
    backgroundColor: '#4CAF50',
  },
  addBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  categoryCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  categoryTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cloudCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    textAlign: 'center',
  },
  cloudTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    marginTop: Spacing.md,
  },
  cloudDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: Radius.md,
    marginTop: Spacing.xl,
  },
  syncNowText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
