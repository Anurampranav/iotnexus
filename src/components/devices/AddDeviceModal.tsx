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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '@components/glass/GlassCard';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { useDeviceStore } from '@store/deviceStore';
import { deviceApiClient } from '../../services/api/DeviceApiClient';
import type { PendingDevice } from '@models/pending';

interface AddDeviceModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ visible, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [pendingDevices, setPendingDevices] = useState<PendingDevice[]>([]);
  const [adoptingId, setAdoptingId] = useState<string | null>(null);

  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      loadPendingDevices();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [visible]);

  const loadPendingDevices = async () => {
    setIsScanning(true);
    try {
      const list = await deviceApiClient.fetchPendingDevices();
      setPendingDevices(list);
    } catch (e) {
      console.warn('Failed to fetch pending devices:', e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAdoptDevice = async (pending: PendingDevice) => {
    setAdoptingId(pending.id);
    try {
      const adopted = await deviceApiClient.confirmPendingDevice(pending.id, {
        name: pending.name,
        homeId: 'home_flurry_1',
        room: pending.type === 'pump' ? 'Utility Area' : pending.type === 'water_sensor' ? 'Rooftop' : 'Living Room',
        isFavorite: true,
      });

      if (adopted) {
        useDeviceStore.setState((state) => ({
          devices: [adopted, ...state.devices.filter((d) => d.id !== adopted.id)],
        }));
        Alert.alert('Device Added', `${adopted.name} is now connected and ready to use!`);
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Adoption Error', err?.message || 'Failed to adopt device.');
    } finally {
      setAdoptingId(null);
    }
  };

  const getDeviceIcon = (item: PendingDevice) => {
    if (item.type === 'light') return 'lightbulb-on';
    if (item.type === 'pump') return 'pump';
    if (item.type === 'water_sensor') return 'water-percent';
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
              <Text style={styles.headerSubtitle}>Auto-Discovered Hardware on your Network</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {/* Radar Pulse Hero */}
            <View style={styles.radarContainer}>
              <Animated.View style={[styles.radarCircle, { transform: [{ scale: pulseAnim }] }]}>
                <MaterialCommunityIcons name="radar" size={36} color={Colors.primary} />
              </Animated.View>
              <Text style={styles.radarText}>
                {isScanning
                  ? 'Listening for new devices on your Wi-Fi router...'
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
                <Text style={styles.sectionHeader}>DISCOVERED HARDWARE</Text>
                {pendingDevices.map((item) => {
                  const isAdopting = adoptingId === item.id;
                  return (
                    <GlassCard key={item.id} style={styles.deviceCard}>
                      <View style={styles.deviceCardRow}>
                        <View style={styles.deviceIconCircle}>
                          <MaterialCommunityIcons
                            name={getDeviceIcon(item) as any}
                            size={24}
                            color={Colors.primary}
                          />
                        </View>
                        <View style={styles.deviceTextCol}>
                          <Text style={styles.deviceName}>{item.name}</Text>
                          <Text style={styles.deviceMeta}>
                            {item.manufacturer} • {item.protocol.toUpperCase()}
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
                    1. Ensure your ESP32, ESPHome, or Smart Plug is powered ON.{'\n'}
                    2. If provisioning for the first time, connect to its setup AP Wi-Fi.{'\n'}
                    3. Once on your router, it will appear here automatically!
                  </Text>
                  <TouchableOpacity style={styles.rescanBtn} onPress={loadPendingDevices}>
                    <MaterialCommunityIcons name="refresh" size={18} color="#FFFFFF" />
                    <Text style={styles.rescanBtnText}>REFRESH DISCOVERY</Text>
                  </TouchableOpacity>
                </View>
              )
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
  body: {
    padding: Spacing.lg,
  },
  radarContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  radarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
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
    paddingHorizontal: Spacing.md,
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
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.md,
  },
  addBtnDisabled: {
    opacity: 0.6,
  },
  addBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptyDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
  },
  rescanBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
