/**
 * Coolify EMQX MQTT Protocol Service
 * Handles direct, low-latency telemetry and commands for Borewell Motors, Overhead Tanks,
 * Sump Sensors, and Agricultural Drip Lines through your self-hosted Coolify server.
 */

export interface WaterTelemetry {
  tankLevelPercent: number;      // 0 - 100%
  tankDepthCm: number;           // Depth in cm
  tankLiters: number;            // Current volume in liters
  sumpLevelPercent: number;      // 0 - 100%
  sumpLiters: number;            // Sump volume
  pumpState: boolean;            // true = Running, false = Stopped
  pumpCurrentAmps: number;       // Motor load in Amperes (e.g. 6.8 A)
  pumpPowerWatts: number;        // Motor power (e.g. 1500 W)
  inflowLpm: number;             // Liters per minute
  dryRunDetected: boolean;       // Safety interlock
  lastUpdated: string;
}

export interface MqttServerConfig {
  host: string;
  port: number;
  useSsl: boolean;
  username?: string;
  password?: string;
  clientId: string;
}

export class MqttCoolifyService {
  private static config: MqttServerConfig = {
    host: '127.0.0.1',
    port: 8083,
    useSsl: false,
    clientId: `scf_app_${Date.now() % 100000}`,
  };

  /**
   * Topic definitions following Smart CodeFlurry standards
   */
  static readonly TOPICS = {
    TANK_TELEMETRY: 'smartcodeflurry/water/tank/level',
    SUMP_TELEMETRY: 'smartcodeflurry/water/sump/level',
    PUMP_STATUS: 'smartcodeflurry/water/pump/status',
    PUMP_COMMAND: 'smartcodeflurry/water/pump/control',
    SOIL_TELEMETRY: 'smartcodeflurry/agri/soil/telemetry',
    SAFETY_ALERT: 'smartcodeflurry/water/safety/alert',
  };

  /**
   * Set Coolify Server connection settings
   */
  static configure(config: Partial<MqttServerConfig>) {
    this.config = { ...this.config, ...config };
  }

  static getConfig(): MqttServerConfig {
    return this.config;
  }

  /**
   * Generates command payload to start or stop the Borewell/Tank pump
   */
  static createPumpCommandPayload(action: 'START' | 'STOP', autoStopMinutes: number = 30): string {
    return JSON.stringify({
      command: action,
      auto_stop_mins: autoStopMinutes,
      timestamp: new Date().toISOString(),
      source: 'smartcodeflurry_mobile',
      safety_check: true,
    });
  }

  /**
   * Formats raw MQTT telemetry payload into typed WaterTelemetry
   */
  static parseWaterTelemetry(payload: string): Partial<WaterTelemetry> | null {
    try {
      const data = JSON.parse(payload);
      return {
        tankLevelPercent: data.tank_level_percent ?? data.level ?? 75,
        tankDepthCm: data.tank_depth_cm ?? 150,
        tankLiters: data.tank_liters ?? 1200,
        sumpLevelPercent: data.sump_level_percent ?? 82,
        sumpLiters: data.sump_liters ?? 2500,
        pumpState: data.pump_running ?? data.state === 'ON',
        pumpCurrentAmps: data.current_amps ?? (data.pump_running ? 7.2 : 0),
        pumpPowerWatts: data.power_watts ?? (data.pump_running ? 1650 : 0),
        inflowLpm: data.inflow_lpm ?? (data.pump_running ? 28 : 0),
        dryRunDetected: data.dry_run_alert ?? false,
        lastUpdated: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }
}
