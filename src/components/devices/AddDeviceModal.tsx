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
  Alert,
  NativeModules,
  NativeEventEmitter,
  TextInput,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '@components/glass/GlassCard';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { useDeviceStore } from '@store/deviceStore';
import { deviceApiClient } from '@services/api/DeviceApiClient';
import type { PendingDevice } from '@models/pending';
import type { Device, DeviceType, DeviceProtocol } from '@models/device';

interface AddDeviceModalProps {
  visible: boolean;
  onClose: () => void;
}

interface NetworkInfo {
  ip: string;
  ssid: string;
  gateway: string;
  isWifiConnected: boolean;
}

const normalizeHardwareProtocol = (raw?: string): DeviceProtocol => {
  if (!raw) return 'tuya_lan';
  const lc = raw.toLowerCase();
  if (lc.includes('tuya') || lc.includes('lan')) return 'tuya_lan';
  if (lc.includes('ble') || lc.includes('bluetooth')) return 'ble';
  if (lc.includes('mqtt')) return 'mqtt';
  if (lc.includes('matter')) return 'matter';
  if (lc.includes('zigbee')) return 'zigbee';
  return 'custom';
};

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [pendingDevices, setPendingDevices] = useState<PendingDevice[]>([]);
  const [adoptingId, setAdoptingId] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  // Manual Add Form States
  const [manualName, setManualName] = useState('');
  const [manualIp, setManualIp] = useState('');
  const [manualType, setManualType] = useState<DeviceType>('switch');
  const [manualRoom, setManualRoom] = useState('Utility Area');
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<string | null>(null);

  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    let eventSubscription: any = null;

    if (visible) {
      requestAndroidPermissions().then(() => {
        fetchNetworkDiagnostics();
        startFullDiscovery();
      });

      // Start Radar Animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();

      // Listen to Real Phone Hardware Scan Events (BLE + Wi-Fi Subnet)
      if (NativeModules.NetworkDiscoveryModule) {
        try {
          const emitter = new NativeEventEmitter(NativeModules.NetworkDiscoveryModule);
          eventSubscription = emitter.addListener('onDeviceDiscovered', (hardware: any) => {
            const newPending: PendingDevice = {
              id: hardware.id || `lan_${hardware.ip?.replace(/\./g, '_') || Date.now()}`,
              name: hardware.name || `Smart Device (${hardware.ip})`,
              type: hardware.type || 'switch',
              manufacturer: hardware.protocol === 'tuya_lan' ? 'Tuya Smart Hardware' : 'Smart LAN Hardware',
              protocol: normalizeHardwareProtocol(hardware.protocol),
              integrationId: 'tuya_local_driver',
              ip: hardware.ip,
              discoveredAt: new Date().toISOString(),
              capabilities: {
                power: { name: 'power', label: 'Power Relay', type: 'boolean', writable: true },
                voltage: { name: 'voltage', label: 'Voltage', type: 'float', unit: 'V', writable: false },
                power_draw: { name: 'power_draw', label: 'Power Draw', type: 'float', unit: 'W', writable: false },
              },
              initialState: {
                power: { value: hardware.state ?? false, commandStatus: 'confirmed', lastUpdated: new Date().toISOString(), isStale: false },
                voltage: { value: 230, commandStatus: 'confirmed', lastUpdated: new Date().toISOString(), isStale: false },
                power_draw: { value: hardware.powerWatts ?? 0, commandStatus: 'confirmed', lastUpdated: new Date().toISOString(), isStale: false },
              },
              metadata: {
                source: hardware.source || 'Phone Hardware Scanner',
                ip: hardware.ip,
              },
            };

            setPendingDevices((prev) => {
              if (prev.some((d) => d.id === newPending.id || (d.ip && d.ip === newPending.ip))) {
                return prev;
              }
              return [newPending, ...prev];
            });
          });

          NativeModules.NetworkDiscoveryModule.startLiveHardwareScan();
        } catch (e) {
          console.warn('[AddDeviceModal] Native scanner init notice:', e);
        }
      }
    }

    return () => {
      if (eventSubscription) eventSubscription.remove();
      if (NativeModules.NetworkDiscoveryModule) {
        try {
          NativeModules.NetworkDiscoveryModule.stopLiveHardwareScan();
        } catch {}
      }
    };
  }, [visible]);

  const requestAndroidPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions: any[] = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ];
        if (Platform.Version >= 31) {
          permissions.push(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
          );
        }
        if (Platform.Version >= 33) {
          permissions.push('android.permission.NEARBY_WIFI_DEVICES');
        }
        await PermissionsAndroid.requestMultiple(permissions);
      } catch (e) {
        console.warn('Permission request notice:', e);
      }
    }
  };

  const fetchNetworkDiagnostics = async () => {
    if (NativeModules.NetworkDiscoveryModule?.getNetworkInfo) {
      try {
        const info = await NativeModules.NetworkDiscoveryModule.getNetworkInfo();
        setNetworkInfo(info);
      } catch (e) {
        console.warn('Network info error:', e);
      }
    }
  };

  const startFullDiscovery = async () => {
    setIsScanning(true);
    try {
      // 1. Fetch from Backend if available
      const list = await deviceApiClient.fetchPendingDevices();
      if (list && list.length > 0) {
        setPendingDevices((prev) => {
          const combined = [...list];
          prev.forEach((p) => {
            if (!combined.some((c) => c.id === p.id)) combined.push(p);
          });
          return combined;
        });
      }

      // 2. Trigger native phone hardware radio scan (Tuya UDP, WiZ, SSDP, Subnet & BLE)
      if (NativeModules.NetworkDiscoveryModule) {
        NativeModules.NetworkDiscoveryModule.startLiveHardwareScan();
      }
    } catch (e) {
      console.warn('[AddDeviceModal] Discovery fetch notice:', e);
    } finally {
      setTimeout(() => setIsScanning(false), 12000);
    }
  };

  const handleTestProbe = async () => {
    const trimmedIp = manualIp.trim();
    if (!trimmedIp) {
      Alert.alert('IP Required', 'Please enter your smart device IP address (e.g. 192.168.1.150).');
      return;
    }

    setIsProbing(true);
    setProbeResult(null);
    try {
      if (NativeModules.NetworkDiscoveryModule?.probeSingleDevice) {
        const res = await NativeModules.NetworkDiscoveryModule.probeSingleDevice(trimmedIp);
        if (res?.online) {
          setProbeResult(`✔ Found: ${res.name} (Port ${res.port})`);
          if (!manualName) setManualName(res.name);
          if (res.type) setManualType(res.type);
        } else {
          setProbeResult(`⚠️ No response at ${trimmedIp}. Check if device is powered ON.`);
        }
      } else {
        setProbeResult(`Ready to add ${trimmedIp}`);
      }
    } catch (e: any) {
      setProbeResult(`Probe error: ${e.message}`);
    } finally {
      setIsProbing(false);
    }
  };

  const handleAdoptDevice = async (pending: PendingDevice) => {
    setAdoptingId(pending.id);
    try {
      let adopted: Device | null = null;
      try {
        adopted = await deviceApiClient.confirmPendingDevice(pending.id, {
          name: pending.name,
          homeId: 'home_flurry_1',
          room: pending.type === 'pump' ? 'Utility Area' : pending.type === 'water_sensor' ? 'Rooftop' : 'Living Room',
          isFavorite: true,
        });
      } catch (e) {
        console.warn('Backend adoption sync skipped, creating locally:', e);
      }

      // Fallback local creation if standalone
      if (!adopted) {
        adopted = {
          id: pending.id,
          name: pending.name,
          type: pending.type,
          manufacturer: pending.manufacturer,
          protocol: pending.protocol,
          integrationId: pending.integrationId,
          capabilities: pending.capabilities,
          state: pending.initialState,
          connectionStatus: 'online',
          homeId: 'home_flurry_1',
          room: pending.type === 'pump' ? 'Utility Area' : 'Living Room',
          isFavorite: true,
          metadata: pending.metadata,
        };
      }

      useDeviceStore.setState((state) => ({
        devices: [adopted!, ...state.devices.filter((d) => d.id !== adopted!.id)],
      }));

      Alert.alert('Device Added', `${adopted.name} is now connected and ready to control!`);
      onClose();
    } catch (err: any) {
      Alert.alert('Adoption Note', err?.message || 'Failed to add device.');
    } finally {
      setAdoptingId(null);
    }
  };

  const handleManualAdd = () => {
    const trimmedName = manualName.trim() || `Smart ${manualType.toUpperCase()}`;
    const trimmedIp = manualIp.trim();

    const newDevice: Device = {
      id: `dev_${manualType}_${Date.now().toString().slice(-6)}`,
      name: trimmedName,
      type: manualType,
      manufacturer: 'Smart Hardware',
      protocol: 'tuya_lan',
      integrationId: 'tuya_local_driver',
      capabilities: {
        power: { name: 'power', label: 'Power', type: 'boolean', writable: true },
        voltage: { name: 'voltage', label: 'Line Voltage', type: 'float', unit: 'V', writable: false },
        power_draw: { name: 'power_draw', label: 'Power Draw', type: 'float', unit: 'W', writable: false },
      },
      state: {
        power: { value: false, commandStatus: 'confirmed', lastUpdated: new Date().toISOString(), isStale: false },
        voltage: { value: 230, commandStatus: 'confirmed', lastUpdated: new Date().toISOString(), isStale: false },
        power_draw: { value: 0, commandStatus: 'confirmed', lastUpdated: new Date().toISOString(), isStale: false },
      },
      connectionStatus: 'online',
      homeId: 'home_flurry_1',
      room: manualRoom,
      isFavorite: true,
      metadata: {
        ip: trimmedIp || undefined,
        manualSetup: true,
      },
    };

    useDeviceStore.setState((state) => ({
      devices: [newDevice, ...state.devices.filter((d) => d.id !== newDevice.id)],
    }));

    Alert.alert('Device Connected', `${newDevice.name} added to ${manualRoom}!`);
    setManualName('');
    setManualIp('');
    setProbeResult(null);
    onClose();
  };

  const getDeviceIcon = (type: string) => {
    if (type === 'light') return 'lightbulb-on';
    if (type === 'pump') return 'pump';
    if (type === 'water_sensor') return 'water-percent';
    return 'power-socket-eu';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Add Device</Text>
              <Text style={styles.headerSubtitle}>Discover or Connect Smart Hardware</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Wi-Fi Diagnostic Banner */}
          {networkInfo && (
            <View style={styles.netInfoBanner}>
              <MaterialCommunityIcons
                name={networkInfo.isWifiConnected ? 'wifi-check' : 'wifi-off'}
                size={16}
                color={networkInfo.isWifiConnected ? Colors.success : Colors.warning}
              />
              <Text style={styles.netInfoText}>
                Wi-Fi: <Text style={styles.netInfoHighlight}>{networkInfo.ssid}</Text> ({networkInfo.ip})
              </Text>
            </View>
          )}

          {/* Mode Switcher Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'scan' && styles.tabBtnActive]}
              onPress={() => setActiveTab('scan')}
            >
              <MaterialCommunityIcons
                name="radar"
                size={18}
                color={activeTab === 'scan' ? Colors.primary : Colors.textMuted}
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
                name="plus-circle-outline"
                size={18}
                color={activeTab === 'manual' ? Colors.primary : Colors.textMuted}
              />
              <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
                Direct / Manual Add
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {activeTab === 'scan' ? (
              <>
                {/* Radar Pulse Hero */}
                <View style={styles.radarContainer}>
                  <Animated.View style={[styles.radarCircle, { transform: [{ scale: pulseAnim }] }]}>
                    <MaterialCommunityIcons name="radar" size={36} color={Colors.primary} />
                  </Animated.View>
                  <Text style={styles.radarText}>
                    {isScanning
                      ? `Scanning subnet ${networkInfo?.ip?.split('.').slice(0, 3).join('.') || '192.168.x'}.x & Bluetooth...`
                      : pendingDevices.length > 0
                      ? `Found ${pendingDevices.length} discovered device(s) ready to add`
                      : 'No unassigned devices broadcasting on network.'}
                  </Text>
                  {isScanning && (
                    <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 8 }} />
                  )}
                </View>

                {/* Pending Devices List */}
                {pendingDevices.length > 0 ? (
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={styles.sectionHeader}>DISCOVERED HARDWARE ({pendingDevices.length})</Text>
                      <TouchableOpacity
                        onPress={startFullDiscovery}
                        disabled={isScanning}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
                      >
                        <MaterialCommunityIcons name="refresh" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                        <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '700' }}>{isScanning ? 'Scanning...' : 'Rescan'}</Text>
                      </TouchableOpacity>
                    </View>
                    {pendingDevices.map((item) => {
                      const isAdopting = adoptingId === item.id;
                      return (
                        <GlassCard key={item.id} style={styles.deviceCard}>
                          <View style={styles.deviceCardRow}>
                            <View style={styles.deviceIconCircle}>
                              <MaterialCommunityIcons
                                name={getDeviceIcon(item.type) as any}
                                size={24}
                                color={Colors.primary}
                              />
                            </View>
                            <View style={styles.deviceTextCol}>
                              <Text style={styles.deviceName}>{item.name}</Text>
                              <Text style={styles.deviceMeta}>
                                {item.manufacturer} {item.ip ? `• ${item.ip}` : ''}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[styles.addBtn, isAdopting && styles.addBtnDisabled]}
                              onPress={() => handleAdoptDevice(item)}
                              disabled={isAdopting}
                            >
                              {isAdopting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <>
                                  <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                                  <Text style={styles.addBtnText}>Add</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </GlassCard>
                      );
                    })}
                  </View>
                ) : (
                  !isScanning && (
                    <View style={styles.emptyBox}>
                      <MaterialCommunityIcons name="router-wireless" size={40} color={Colors.textMuted} />
                      <Text style={styles.emptyTitle}>Looking for new hardware...</Text>
                      <Text style={styles.emptyDesc}>
                        1. Ensure your Smart Plug, Water Pump Relay, or Bulb is powered ON.{'\n'}
                        2. Ensure phone is on the same 2.4GHz Wi-Fi network.{'\n'}
                        3. You can also tap "Direct / Manual Add" above to connect instantly!
                      </Text>
                      <TouchableOpacity style={styles.rescanBtn} onPress={startFullDiscovery}>
                        <MaterialCommunityIcons name="refresh" size={18} color="#FFFFFF" />
                        <Text style={styles.rescanBtnText}>RESCAN NETWORK</Text>
                      </TouchableOpacity>
                    </View>
                  )
                )}
              </>
            ) : (
              /* Manual / Direct Add Form */
              <View style={styles.manualForm}>
                <Text style={styles.formLabel}>Device Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Borewell Water Pump, 16A Smart Plug"
                  placeholderTextColor={Colors.textMuted}
                  value={manualName}
                  onChangeText={setManualName}
                />

                <Text style={styles.formLabel}>Device IP Address (from Wi-Fi router)</Text>
                <View style={styles.ipRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="e.g. 192.168.1.150"
                    placeholderTextColor={Colors.textMuted}
                    value={manualIp}
                    onChangeText={setManualIp}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={[styles.probeBtn, isProbing && styles.addBtnDisabled]}
                    onPress={handleTestProbe}
                    disabled={isProbing}
                  >
                    {isProbing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.probeBtnText}>TEST</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {probeResult && (
                  <Text style={[styles.probeResultText, probeResult.startsWith('✔') ? styles.probeSuccess : styles.probeWarn]}>
                    {probeResult}
                  </Text>
                )}

                <Text style={styles.formLabel}>Device Type</Text>
                <View style={styles.typeSelectorRow}>
                  {[
                    { type: 'switch', label: 'Smart Plug', icon: 'power-socket-eu' },
                    { type: 'pump', label: 'Water Pump', icon: 'pump' },
                    { type: 'light', label: 'Light Bulb', icon: 'lightbulb-on' },
                    { type: 'water_sensor', label: 'Water Sensor', icon: 'water-percent' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.type}
                      style={[
                        styles.typeOption,
                        manualType === item.type && styles.typeOptionActive,
                      ]}
                      onPress={() => setManualType(item.type as DeviceType)}
                    >
                      <MaterialCommunityIcons
                        name={item.icon as any}
                        size={20}
                        color={manualType === item.type ? Colors.primary : Colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.typeOptionText,
                          manualType === item.type && styles.typeOptionTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.formLabel}>Assigned Room</Text>
                <View style={styles.roomSelectorRow}>
                  {['Utility Area', 'Living Room', 'Kitchen', 'Rooftop'].map((room) => (
                    <TouchableOpacity
                      key={room}
                      style={[
                        styles.roomOption,
                        manualRoom === room && styles.roomOptionActive,
                      ]}
                      onPress={() => setManualRoom(room)}
                    >
                      <Text
                        style={[
                          styles.roomOptionText,
                          manualRoom === room && styles.roomOptionTextActive,
                        ]}
                      >
                        {room}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.saveManualBtn} onPress={handleManualAdd}>
                  <MaterialCommunityIcons name="check-bold" size={20} color="#FFFFFF" />
                  <Text style={styles.saveManualBtnText}>ADD TO MY HOME</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
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
    maxHeight: '90%',
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
  netInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#262220',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#332F2C',
  },
  netInfoText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  netInfoHighlight: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: '#2A2725',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(230, 92, 43, 0.15)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tabText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  body: {
    padding: Spacing.lg,
  },
  radarContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  radarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2A2725',
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  radarText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  sectionHeader: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  deviceCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  deviceCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(230, 92, 43, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  deviceTextCol: {
    flex: 1,
  },
  deviceName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  deviceMeta: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  addBtnDisabled: {
    opacity: 0.6,
  },
  addBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  rescanBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  manualForm: {
    paddingVertical: Spacing.sm,
  },
  formLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#2A2725',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: '#383431',
  },
  ipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  probeBtn: {
    backgroundColor: '#383431',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  probeBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  probeResultText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    marginTop: 6,
  },
  probeSuccess: {
    color: Colors.success,
  },
  probeWarn: {
    color: Colors.warning,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#2A2725',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#383431',
  },
  typeOptionActive: {
    backgroundColor: 'rgba(230, 92, 43, 0.15)',
    borderColor: Colors.primary,
  },
  typeOptionText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  typeOptionTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  roomSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  roomOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#2A2725',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#383431',
  },
  roomOptionActive: {
    backgroundColor: 'rgba(230, 92, 43, 0.15)',
    borderColor: Colors.primary,
  },
  roomOptionText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  roomOptionTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  saveManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    marginTop: Spacing.xl,
  },
  saveManualBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
