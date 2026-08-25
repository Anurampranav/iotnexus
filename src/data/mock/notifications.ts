import type { AppNotification } from '@models/notification';

export const mockNotifications: AppNotification[] = [
  {
    id: 'notif-001',
    title: 'Tank level is low',
    body: '18% remaining. Please turn on the pump.',
    severity: 'warning',
    read: false,
    createdAt: new Date(Date.now() - 120000).toISOString(),
    deviceId: 'dev-tank-sensor',
    actionRoute: '/water',
  },
  {
    id: 'notif-002',
    title: 'Soil moisture is low',
    body: 'Zone A: 24% moisture detected.',
    severity: 'warning',
    read: false,
    createdAt: new Date(Date.now() - 900000).toISOString(),
    deviceId: 'dev-soil-sensor',
    actionRoute: '/(tabs)/water',
  },
  {
    id: 'notif-003',
    title: 'Irrigation pump turned on',
    body: 'Automation: Smart Irrigation triggered.',
    severity: 'info',
    read: true,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    deviceId: 'dev-irrigation-pump',
    automationId: 'auto-smart-irrigation',
  },
  {
    id: 'notif-004',
    title: 'Tank pump turned off',
    body: 'Manual control by user.',
    severity: 'info',
    read: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    deviceId: 'dev-tank-pump',
  },
];
