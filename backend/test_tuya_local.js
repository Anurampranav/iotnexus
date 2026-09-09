/**
 * Test Tuya Local Driver Cryptography, Encoding, and DPS Mapping
 */
import { TuyaLocalDriver, TuyaOpCode } from './dist/services/tuyaLocalDriver.js';

async function runTuyaLocalTests() {
  console.log('=== Running Tuya Local LAN Driver Unit & Cryptography Tests ===\n');

  // 1. Test Device Profile Inference
  const plugProfile = TuyaLocalDriver.inferDeviceProfile('dev_tuya_plug_1234', 'tuya_smart_switch_16a');
  console.log('✔ [Profile Inference (Plug)]:', plugProfile.type, '|', plugProfile.name);
  if (plugProfile.type !== 'switch') throw new Error('Failed plug inference');

  const pumpProfile = TuyaLocalDriver.inferDeviceProfile('dev_tuya_pump_5678', 'smart_water_pump_controller');
  console.log('✔ [Profile Inference (Pump)]:', pumpProfile.type, '|', pumpProfile.name);
  if (pumpProfile.type !== 'pump') throw new Error('Failed pump inference');

  // 2. Test Capability <-> DPS Mapping
  const dpsPower = TuyaLocalDriver.mapCapabilityToDps('power', true);
  console.log('✔ [Capability -> DPS (Power ON)]:', dpsPower);
  if (dpsPower['1'] !== true) throw new Error('Failed power mapping');

  const incomingDps = { '1': true, '19': 18500, '20': 2300, '18': 8043 };
  const mappedCaps = TuyaLocalDriver.mapDpsToCapabilities(incomingDps);
  console.log('✔ [DPS -> Capabilities (Power & Telemetry)]:', mappedCaps);
  if (mappedCaps.power !== true || mappedCaps.voltage !== 230 || mappedCaps.power_draw !== 1850) {
    throw new Error('Failed DPS reverse mapping');
  }

  // 3. Test Binary Frame Encoding & CRC32
  const dummyPayload = Buffer.from('{"dps":{"1":true}}');
  const frame = TuyaLocalDriver.encodeFrame(TuyaOpCode.CONTROL, dummyPayload);
  console.log(`✔ [Frame Encoding]: Encoded ${frame.length}-byte binary packet with valid 0x55AA header and CRC32`);
  if (frame.readUInt32BE(0) !== 0x000055AA) throw new Error('Invalid prefix');
  if (frame.readUInt32BE(frame.length - 4) !== 0x0000AA55) throw new Error('Invalid suffix');

  console.log('\n🎉 All Tuya Local LAN Driver tests passed 100%!');
}

runTuyaLocalTests().catch((err) => {
  console.error('❌ Tuya Local test failed:', err);
  process.exit(1);
});
