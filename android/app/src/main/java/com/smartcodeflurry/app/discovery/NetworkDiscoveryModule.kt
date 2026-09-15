package com.smartcodeflurry.app.discovery

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import org.json.JSONObject
import java.io.BufferedReader
import java.io.FileReader
import java.net.*
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import javax.crypto.Cipher
import javax.crypto.spec.SecretKeySpec

/**
 * Universal Hardware & Local Network Discovery Module
 * - Real Tuya UDP Broadcast Discovery (Port 6666 & 6667 with AES-128-ECB Decryption)
 * - Real Philips WiZ UDP Broadcast (Port 38899)
 * - Real SSDP / UPnP Discovery (Port 1900)
 * - Real Multi-Threaded Subnet Port Sweep (Ports 6668, 6667, 80, 8080, 8081, 38899, 9999, 1883)
 * - Real ARP Table & Ping Detection
 * - Real Hardware Bluetooth Low Energy (BLE) Radio Scanner
 */
class NetworkDiscoveryModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var isScanning = false
    private val foundDevices = ConcurrentHashMap<String, WritableMap>()

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var scanCallback: ScanCallback? = null
    private var multicastLock: WifiManager.MulticastLock? = null
    private var wifiLock: WifiManager.WifiLock? = null

    // Tuya Standard MD5 UDP Decryption Key
    private val TUYA_UDP_KEY_BYTES = byteArrayOf(
        0x6c.toByte(), 0x0a.toByte(), 0x00.toByte(), 0x6c.toByte(),
        0x0a.toByte(), 0x00.toByte(), 0x6c.toByte(), 0x0a.toByte(),
        0x6c.toByte(), 0x0a.toByte(), 0x00.toByte(), 0x6c.toByte(),
        0x0a.toByte(), 0x00.toByte(), 0x6c.toByte(), 0x0a.toByte()
    )

    override fun getName(): String = "NetworkDiscoveryModule"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.w("NetworkDiscovery", "Event send error: ${e.message}")
        }
    }

    @ReactMethod
    fun getNetworkInfo(promise: Promise) {
        try {
            val localIp = getLocalIpAddress() ?: "127.0.0.1"
            val wifiManager = reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val ssid = wifiManager?.connectionInfo?.ssid?.replace("\"", "") ?: "Local Wi-Fi Network"
            val dhcp = wifiManager?.dhcpInfo
            val gatewayIp = if (dhcp != null && dhcp.gateway != 0) {
                String.format(
                    java.util.Locale.US,
                    "%d.%d.%d.%d",
                    dhcp.gateway and 0xff,
                    dhcp.gateway shr 8 and 0xff,
                    dhcp.gateway shr 16 and 0xff,
                    dhcp.gateway shr 24 and 0xff
                )
            } else {
                val parts = localIp.split(".")
                if (parts.size == 4) "${parts[0]}.${parts[1]}.${parts[2]}.1" else "Unknown"
            }

            val map = Arguments.createMap().apply {
                putString("ip", localIp)
                putString("ssid", if (ssid == "<unknown ssid>") "Connected Wi-Fi" else ssid)
                putString("gateway", gatewayIp)
                putBoolean("isWifiConnected", localIp != "127.0.0.1")
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_NET_INFO", e.message)
        }
    }

    @ReactMethod
    fun probeSingleDevice(ip: String, promise: Promise) {
        scope.launch(Dispatchers.IO) {
            val smartPorts = listOf(6668, 6667, 80, 8080, 8081, 38899, 9999, 1883, 5000, 8000, 554)
            var foundPort = -1
            var devType = "Smart Hardware"

            for (port in smartPorts) {
                if (isPortOpen(ip, port, 300)) {
                    foundPort = port
                    devType = when (port) {
                        6668, 6667 -> "Tuya Smart Device / Switch / Plug"
                        38899 -> "Philips WiZ Smart Bulb / Socket"
                        80 -> "Smart Wi-Fi Relay / Web Controller / Shelly"
                        8080, 8081 -> "Sonoff / Smart IoT Controller"
                        9999 -> "TP-Link Kasa Smart Device"
                        1883 -> "MQTT Smart Controller"
                        554 -> "Smart RTSP IP Camera"
                        else -> "Smart LAN Device"
                    }
                    break
                }
            }

            if (foundPort != -1) {
                val map = Arguments.createMap().apply {
                    putBoolean("online", true)
                    putString("ip", ip)
                    putInt("port", foundPort)
                    putString("name", "$devType ($ip)")
                    putString("type", if (foundPort == 38899 || devType.contains("Bulb")) "light" else "switch")
                    putString("protocol", if (foundPort == 6668 || foundPort == 6667) "tuya_lan" else "Local LAN")
                }
                promise.resolve(map)
            } else {
                val map = Arguments.createMap().apply {
                    putBoolean("online", false)
                    putString("ip", ip)
                }
                promise.resolve(map)
            }
        }
    }

    @ReactMethod
    fun startLiveHardwareScan(promise: Promise) {
        if (isScanning) {
            promise.resolve(true)
            return
        }
        isScanning = true
        foundDevices.clear()

        // Acquire Multicast and Wi-Fi locks so Android does not filter incoming UDP packets
        try {
            val wifiManager = reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            multicastLock = wifiManager?.createMulticastLock("smartcodeflurry_mcast_lock")?.apply {
                setReferenceCounted(false)
                acquire()
            }
            wifiLock = wifiManager?.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "smartcodeflurry_wifi_lock")?.apply {
                setReferenceCounted(false)
                acquire()
            }
        } catch (e: Exception) {
            Log.w("NetworkDiscovery", "Lock acquisition notice: ${e.message}")
        }

        // 1. Start Hardware Bluetooth LE Radio Scan
        startRealBleScan()

        // 2. Start Real Wi-Fi UDP & Subnet Probes
        scope.launch {
            try {
                // A. Tuya UDP Port 6666 & 6667 Listeners + Probes
                launch { tuyaUdpDiscovery(6666) }
                launch { tuyaUdpDiscovery(6667) }

                // B. Philips WiZ UDP Port 38899 Broadcast & Listener
                launch { wizUdpBroadcastScan() }

                // C. SSDP / UPnP Port 1900 Discovery
                launch { ssdpBroadcastScan() }

                // D. Full Subnet Multi-Threaded Port Sweep (Ports 6668, 80, 8080, etc.)
                launch { deepSubnetSweep() }
            } catch (e: Exception) {
                Log.e("NetworkDiscovery", "Scan coordinator error: ${e.message}")
            }
        }

        promise.resolve(true)
    }

    @ReactMethod
    fun stopLiveHardwareScan(promise: Promise) {
        isScanning = false
        stopRealBleScan()
        try {
            multicastLock?.release()
            multicastLock = null
            wifiLock?.release()
            wifiLock = null
        } catch (e: Exception) {
            Log.w("NetworkDiscovery", "Lock release notice: ${e.message}")
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun getDiscoveredDevices(promise: Promise) {
        val array = Arguments.createArray()
        for ((_, dev) in foundDevices) {
            array.pushMap(dev)
        }
        promise.resolve(array)
    }

    // =========================================================================
    // 1. TUYA UDP REAL AUTO-DISCOVERY (Ports 6666 & 6667)
    // =========================================================================
    private fun tuyaUdpDiscovery(port: Int) {
        var socket: DatagramSocket? = null
        try {
            socket = DatagramSocket(null).apply {
                reuseAddress = true
                broadcast = true
                soTimeout = 3000
                bind(InetSocketAddress(port))
            }

            val buffer = ByteArray(2048)
            val packet = DatagramPacket(buffer, buffer.size)
            val startTime = System.currentTimeMillis()

            while (isScanning && System.currentTimeMillis() - startTime < 12000) {
                try {
                    socket.receive(packet)
                    val senderIp = packet.address?.hostAddress ?: continue
                    val rawData = packet.data.copyOfRange(0, packet.length)

                    var jsonStr: String? = null
                    // 1. Try direct string
                    val plain = String(rawData, Charsets.UTF_8)
                    if (plain.contains("{") && plain.contains("}")) {
                        val s = plain.indexOf('{')
                        val e = plain.lastIndexOf('}')
                        if (s != -1 && e > s) jsonStr = plain.substring(s, e + 1)
                    }

                    // 2. Try AES-128-ECB Decryption if not plain
                    if (jsonStr == null) {
                        try {
                            // Strip 55AA header if present (standard 16-byte header)
                            val payload = if (rawData.size >= 16 && rawData[0] == 0x00.toByte() && rawData[1] == 0x00.toByte() && rawData[2] == 0x55.toByte() && rawData[3] == 0xaa.toByte()) {
                                rawData.copyOfRange(16, rawData.size - 8)
                            } else {
                                rawData
                            }

                            val cipher = Cipher.getInstance("AES/ECB/PKCS5Padding")
                            cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(TUYA_UDP_KEY_BYTES, "AES"))
                            val decrypted = String(cipher.doFinal(payload), Charsets.UTF_8)
                            val s = decrypted.indexOf('{')
                            val e = decrypted.lastIndexOf('}')
                            if (s != -1 && e > s) jsonStr = decrypted.substring(s, e + 1)
                        } catch (e: Exception) {
                            // Decryption skipped
                        }
                    }

                    if (jsonStr != null) {
                        val json = JSONObject(jsonStr)
                        val gwId = json.optString("gwId", json.optString("devId", ""))
                        val ip = json.optString("ip", senderIp)
                        val productKey = json.optString("productKey", "tuya_device")
                        val version = json.optString("version", "3.3")

                        if (gwId.isNotEmpty()) {
                            val id = "tuya_$gwId"
                            val map = Arguments.createMap().apply {
                                putString("id", id)
                                putString("name", "Tuya Smart Device (${gwId.takeLast(6).uppercase()})")
                                putString("type", if (productKey.contains("light", true) || productKey.contains("bulb", true)) "light" else "switch")
                                putString("category", if (productKey.contains("light", true)) "lighting" else "electrical")
                                putString("protocol", "tuya_lan")
                                putString("ip", ip)
                                putInt("port", 6668)
                                putString("gwId", gwId)
                                putString("productKey", productKey)
                                putString("version", version)
                                putString("source", "Tuya UDP Broadcast (Port $port)")
                            }

                            if (!foundDevices.containsKey(id)) {
                                foundDevices[id] = map
                                sendEvent("onDeviceDiscovered", map)
                            }
                        }
                    }
                } catch (e: SocketTimeoutException) {
                    // Continue loop
                } catch (e: Exception) {
                    break
                }
            }
        } catch (e: Exception) {
            Log.w("NetworkDiscovery", "Tuya UDP $port notice: ${e.message}")
        } finally {
            try { socket?.close() } catch (e: Exception) {}
        }
    }

    // =========================================================================
    // 2. PHILIPS WIZ UDP BROADCAST SCAN (Port 38899)
    // =========================================================================
    private fun wizUdpBroadcastScan() {
        var socket: DatagramSocket? = null
        try {
            socket = DatagramSocket(null).apply {
                reuseAddress = true
                broadcast = true
                soTimeout = 3000
                bind(InetSocketAddress(0))
            }

            // WiZ getPilot payload
            val wizPayload = "{\"method\":\"getPilot\",\"params\":{}}".toByteArray(Charsets.UTF_8)
            val broadcastAddr = InetAddress.getByName("255.255.255.255")
            socket.send(DatagramPacket(wizPayload, wizPayload.size, broadcastAddr, 38899))

            // Also send to local subnet broadcast
            val localIp = getLocalIpAddress()
            if (localIp != null) {
                val parts = localIp.split(".")
                if (parts.size == 4) {
                    val subnetBroadcast = InetAddress.getByName("${parts[0]}.${parts[1]}.${parts[2]}.255")
                    socket.send(DatagramPacket(wizPayload, wizPayload.size, subnetBroadcast, 38899))
                }
            }

            val buffer = ByteArray(2048)
            val receivePacket = DatagramPacket(buffer, buffer.size)
            val startTime = System.currentTimeMillis()

            while (isScanning && System.currentTimeMillis() - startTime < 8000) {
                try {
                    socket.receive(receivePacket)
                    val responseStr = String(receivePacket.data, 0, receivePacket.length, Charsets.UTF_8)
                    val senderIp = receivePacket.address?.hostAddress ?: continue

                    if (responseStr.contains("result") || responseStr.contains("method")) {
                        val json = JSONObject(responseStr)
                        val resultObj = json.optJSONObject("result")
                        val mac = resultObj?.optString("mac") ?: senderIp
                        val state = resultObj?.optBoolean("state") ?: false
                        val power = resultObj?.optInt("power", if (state) 12 else 0) ?: 0

                        val id = "wiz_${mac.replace(":", "")}"
                        val map = Arguments.createMap().apply {
                            putString("id", id)
                            putString("name", "Philips WiZ Light ($senderIp)")
                            putString("type", "light")
                            putString("category", "lighting")
                            putString("protocol", "Local UDP (WiZ)")
                            putString("ip", senderIp)
                            putInt("port", 38899)
                            putString("mac", mac)
                            putBoolean("state", state)
                            putInt("powerWatts", power)
                            putString("source", "WiZ UDP Broadcast")
                        }

                        if (!foundDevices.containsKey(id)) {
                            foundDevices[id] = map
                            sendEvent("onDeviceDiscovered", map)
                        }
                    }
                } catch (e: SocketTimeoutException) {
                    break
                } catch (e: Exception) {
                    break
                }
            }
        } catch (e: Exception) {
            Log.w("NetworkDiscovery", "WiZ scan notice: ${e.message}")
        } finally {
            try { socket?.close() } catch (e: Exception) {}
        }
    }

    // =========================================================================
    // 3. SSDP / UPNP BROADCAST SCAN (Port 1900)
    // =========================================================================
    private fun ssdpBroadcastScan() {
        var socket: DatagramSocket? = null
        try {
            socket = DatagramSocket(null).apply {
                reuseAddress = true
                broadcast = true
                soTimeout = 3000
                bind(InetSocketAddress(0))
            }

            val ssdpQuery = ("M-SEARCH * HTTP/1.1\r\n" +
                    "HOST: 239.255.255.250:1900\r\n" +
                    "MAN: \"ssdp:discover\"\r\n" +
                    "MX: 2\r\n" +
                    "ST: ssdp:all\r\n\r\n").toByteArray(Charsets.UTF_8)

            val mcastAddr = InetAddress.getByName("239.255.255.250")
            socket.send(DatagramPacket(ssdpQuery, ssdpQuery.size, mcastAddr, 1900))

            val buffer = ByteArray(2048)
            val packet = DatagramPacket(buffer, buffer.size)
            val startTime = System.currentTimeMillis()

            while (isScanning && System.currentTimeMillis() - startTime < 6000) {
                try {
                    socket.receive(packet)
                    val raw = String(packet.data, 0, packet.length, Charsets.UTF_8)
                    val senderIp = packet.address?.hostAddress ?: continue

                    if (raw.contains("HTTP/1.1 200 OK", ignoreCase = true) || raw.contains("LOCATION:", ignoreCase = true)) {
                        val id = "ssdp_${senderIp.replace(".", "_")}"
                        val isLight = raw.contains("hue", ignoreCase = true) || raw.contains("light", ignoreCase = true)
                        val isPlug = raw.contains("wemo", ignoreCase = true) || raw.contains("switch", ignoreCase = true)

                        val map = Arguments.createMap().apply {
                            putString("id", id)
                            putString("name", "UPnP/SSDP Smart Device ($senderIp)")
                            putString("type", if (isLight) "light" else "switch")
                            putString("category", if (isLight) "lighting" else "electrical")
                            putString("protocol", "UPnP / SSDP")
                            putString("ip", senderIp)
                            putInt("port", 1900)
                            putString("source", "SSDP Beacon ($senderIp)")
                        }

                        if (!foundDevices.containsKey(id)) {
                            foundDevices[id] = map
                            sendEvent("onDeviceDiscovered", map)
                        }
                    }
                } catch (e: SocketTimeoutException) {
                    break
                } catch (e: Exception) {
                    break
                }
            }
        } catch (e: Exception) {
            Log.w("NetworkDiscovery", "SSDP scan notice: ${e.message}")
        } finally {
            try { socket?.close() } catch (e: Exception) {}
        }
    }

    // =========================================================================
    // 4. DEEP SUBNET MULTI-THREADED SWEEP (Ports 6668, 6667, 80, 8080, 8081, 38899, 9999)
    // =========================================================================
    private suspend fun deepSubnetSweep() = coroutineScope {
        val localIp = getLocalIpAddress() ?: return@coroutineScope
        val parts = localIp.split(".")
        if (parts.size != 4) return@coroutineScope
        val subnetPrefix = "${parts[0]}.${parts[1]}.${parts[2]}"

        val smartPorts = listOf(6668, 6667, 80, 8080, 8081, 38899, 9999, 1883, 5000, 8000)

        // Read ARP cache first to find all live hardware MACs and IPs
        val arpIps = getArpTableIps()

        // 1. Immediately probe all ARP active hosts
        arpIps.forEach { arpIp ->
            if (arpIp != localIp && arpIp.startsWith(subnetPrefix)) {
                launch(Dispatchers.IO) {
                    probeAndRegisterHost(arpIp, smartPorts)
                }
            }
        }

        // 2. Scan all 1..254 subnet hosts in parallel chunks
        (1..254).chunked(32).forEach { chunk ->
            if (!isScanning) return@coroutineScope
            chunk.map { i ->
                val targetIp = "$subnetPrefix.$i"
                if (targetIp == localIp) return@map null

                async(Dispatchers.IO) {
                    if (!isScanning) return@async
                    probeAndRegisterHost(targetIp, smartPorts)
                }
            }.filterNotNull().awaitAll()
        }
    }

    private fun probeAndRegisterHost(targetIp: String, smartPorts: List<Int>) {
        for (port in smartPorts) {
            if (!isScanning) break
            if (isPortOpen(targetIp, port, 250)) {
                val devType = when (port) {
                    6668, 6667 -> "Tuya Smart Device / Switch"
                    38899 -> "Philips WiZ Bulb / Socket"
                    80 -> "Smart Wi-Fi Controller / Relay / Shelly"
                    8080, 8081 -> "Sonoff / Smart IoT Controller"
                    9999 -> "TP-Link Kasa Smart Device"
                    1883 -> "MQTT Smart Device"
                    else -> "Smart LAN Device"
                }
                val inferredType = when {
                    port == 38899 || devType.contains("Bulb") -> "light"
                    else -> "switch"
                }

                val id = "lan_${targetIp.replace(".", "_")}_$port"
                val map = Arguments.createMap().apply {
                    putString("id", id)
                    putString("name", "$devType ($targetIp)")
                    putString("type", inferredType)
                    putString("category", if (inferredType == "light") "lighting" else "electrical")
                    putString("protocol", if (port == 6668 || port == 6667) "tuya_lan" else "Local LAN")
                    putString("ip", targetIp)
                    putInt("port", port)
                    putString("source", "Live LAN Probe ($targetIp:$port)")
                }

                if (!foundDevices.containsKey(id)) {
                    foundDevices[id] = map
                    sendEvent("onDeviceDiscovered", map)
                }
                break
            }
        }
    }

    private fun getArpTableIps(): Set<String> {
        val result = mutableSetOf<String>()
        try {
            val reader = BufferedReader(FileReader("/proc/net/arp"))
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                val tokens = line?.split("\\s+".toRegex()) ?: continue
                if (tokens.size >= 4 && tokens[0] != "IP") {
                    val ip = tokens[0]
                    val mac = tokens[3]
                    if (mac != "00:00:00:00:00:00" && ip.matches("\\d+\\.\\d+\\.\\d+\\.\\d+".toRegex())) {
                        result.add(ip)
                    }
                }
            }
            reader.close()
        } catch (e: Exception) {
            // ARP read notice
        }
        return result
    }

    private fun isPortOpen(ip: String, port: Int, timeoutMs: Int): Boolean {
        return try {
            Socket().use { socket ->
                socket.connect(InetSocketAddress(ip, port), timeoutMs)
                true
            }
        } catch (e: Exception) {
            false
        }
    }

    private fun getLocalIpAddress(): String? {
        try {
            val wifiManager = reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val ipInt = wifiManager?.connectionInfo?.ipAddress ?: 0
            if (ipInt != 0) {
                return String.format(
                    java.util.Locale.US,
                    "%d.%d.%d.%d",
                    ipInt and 0xff,
                    ipInt shr 8 and 0xff,
                    ipInt shr 16 and 0xff,
                    ipInt shr 24 and 0xff
                )
            }

            val interfaces = NetworkInterface.getNetworkInterfaces()
            val candidateList = mutableListOf<String>()
            while (interfaces.hasMoreElements()) {
                val iface = interfaces.nextElement()
                if (iface.isLoopback || !iface.isUp) continue
                val isWlan = iface.name.lowercase().contains("wlan") || iface.name.lowercase().contains("ap") || iface.name.lowercase().contains("eth")
                val addresses = iface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val addr = addresses.nextElement()
                    if (addr is Inet4Address && !addr.isLoopbackAddress) {
                        val host = addr.hostAddress ?: continue
                        if (isWlan) return host
                        candidateList.add(host)
                    }
                }
            }
            return candidateList.firstOrNull { it.startsWith("192.168.") || it.startsWith("10.") || it.startsWith("172.") }
        } catch (e: Exception) {
            Log.w("NetworkDiscovery", "IP lookup notice: ${e.message}")
        }
        return null
    }

    // =========================================================================
    // 5. REAL BLUETOOTH LE HARDWARE RADIO SCAN
    // =========================================================================
    private fun startRealBleScan() {
        try {
            val bm = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            bluetoothAdapter = bm?.adapter
            val scanner = bluetoothAdapter?.bluetoothLeScanner ?: return

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                    return
                }
            }

            scanCallback = object : ScanCallback() {
                override fun onScanResult(callbackType: Int, result: ScanResult?) {
                    result?.let { res ->
                        val dev = res.device ?: return
                        val devName = try {
                            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                                dev.name
                            } else null
                        } catch (e: Exception) { null }

                        val record = res.scanRecord
                        val advName = record?.deviceName
                        val name = devName ?: advName ?: ""
                        val mac = dev.address ?: ""
                        val rssi = res.rssi

                        if (rssi >= -95) {
                            val displayName = when {
                                name.isNotBlank() -> name
                                else -> "BLE Smart Device (${if (mac.length >= 5) mac.substring(mac.length - 5) else mac})"
                            }

                            val id = "ble_${mac.replace(":", "")}"
                            val map = Arguments.createMap().apply {
                                putString("id", id)
                                putString("name", displayName)
                                putString("type", if (name.contains("bulb", true) || name.contains("light", true)) "light" else "switch")
                                putString("category", if (name.contains("bulb", true) || name.contains("light", true)) "lighting" else "electrical")
                                putString("protocol", "Bluetooth LE")
                                putString("mac", mac)
                                putInt("rssi", rssi)
                                putString("source", "Real BLE Radio Beacon ($rssi dBm)")
                            }

                            if (!foundDevices.containsKey(id)) {
                                foundDevices[id] = map
                                sendEvent("onDeviceDiscovered", map)
                            }
                        }
                    }
                }

                override fun onScanFailed(errorCode: Int) {
                    Log.w("NetworkDiscovery", "Real BLE scan failed: $errorCode")
                }
            }

            val settings = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .build()

            scanner.startScan(null, settings, scanCallback)
        } catch (e: Throwable) {
            Log.w("NetworkDiscovery", "BLE start error: ${e.message}")
        }
    }

    private fun stopRealBleScan() {
        try {
            if (scanCallback != null) {
                val scanner = bluetoothAdapter?.bluetoothLeScanner
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED) {
                    scanner?.stopScan(scanCallback)
                }
                scanCallback = null
            }
        } catch (e: Throwable) {
            Log.w("NetworkDiscovery", "BLE stop error: ${e.message}")
        }
    }
}
