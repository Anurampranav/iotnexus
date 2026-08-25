import type { Device, DeviceType } from '@models/device';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function getDeviceIcon(type: DeviceType): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (type) {
    case 'pump':
      return 'pump';
    case 'light':
      return 'lightbulb-outline';
    case 'water_sensor':
      return 'water-percent';
    case 'soil_sensor':
      return 'sprout-outline';
    case 'temperature_sensor':
      return 'thermometer';
    case 'motion_sensor':
      return 'motion-sensor';
    case 'climate':
      return 'thermostat';
    default:
      return 'help-circle-outline';
  }
}

export interface DevicePrimaryValue {
  label: string;
  value: string | number | null;
  unit?: string;
}

export function getDevicePrimaryValue(device: Device): DevicePrimaryValue {
  switch (device.type) {
    case 'water_sensor': {
      const levelCap = device.state['level'];
      return {
        label: 'Level',
        value: levelCap ? (levelCap.value as number) : null,
        unit: '%',
      };
    }
    case 'soil_sensor': {
      const moistureCap = device.state['moisture'];
      return {
        label: 'Moisture',
        value: moistureCap ? (moistureCap.value as number) : null,
        unit: '%',
      };
    }
    case 'temperature_sensor': {
      const tempCap = device.state['temperature'];
      return {
        label: 'Temperature',
        value: tempCap ? (tempCap.value as number) : null,
        unit: '°C',
      };
    }
    case 'pump': {
      const powerCap = device.state['power'];
      return {
        label: 'Power',
        value: powerCap ? (powerCap.value ? 'ON' : 'OFF') : 'UNKNOWN',
      };
    }
    case 'light': {
      const powerCap = device.state['power'];
      return {
        label: 'Power',
        value: powerCap ? (powerCap.value ? 'ON' : 'OFF') : 'UNKNOWN',
      };
    }
    default:
      return {
        label: 'Status',
        value: null,
      };
  }
}
