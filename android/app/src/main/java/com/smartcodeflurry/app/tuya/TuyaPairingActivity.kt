package com.smartcodeflurry.app.tuya

import android.Manifest
import android.animation.ValueAnimator
import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.*
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.animation.LinearInterpolator
import android.widget.*
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.thingclips.smart.android.ble.api.BleScanResponse
import com.thingclips.smart.android.ble.api.ScanDeviceBean
import com.thingclips.smart.android.ble.api.ScanType
import com.thingclips.smart.home.sdk.ThingHomeSdk
import com.thingclips.smart.home.sdk.bean.HomeBean
import com.thingclips.smart.home.sdk.builder.ActivatorBuilder
import com.thingclips.smart.home.sdk.callback.IThingGetHomeListCallback
import com.thingclips.smart.home.sdk.callback.IThingHomeResultCallback
import com.thingclips.smart.sdk.api.IThingActivator
import com.thingclips.smart.sdk.api.IThingActivatorGetToken
import com.thingclips.smart.sdk.api.IThingSmartActivatorListener
import com.thingclips.smart.sdk.bean.DeviceBean
import com.thingclips.smart.sdk.enums.ActivatorModelEnum

/**
 * Smart Life / Tuya Standard Add Device Screen with Instant Pairing & Saved Wi-Fi Credentials
 */
class TuyaPairingActivity : Activity() {

    companion object {
        private const val TAG = "TuyaPairingActivity"
        private const val PERMISSION_REQ_CODE = 1001
        private const val TIMEOUT_SECONDS = 100L
        private const val SCAN_TIMEOUT_MS = 60000
        private const val PREFS_NAME = "smartcodeflurry_wifi_prefs"
        private const val KEY_LAST_PASS = "key_last_wifi_password"
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var activator: IThingActivator? = null
    private lateinit var prefs: SharedPreferences

    // UI Root & Components
    private lateinit var rootContainer: FrameLayout
    private lateinit var mainContentLayout: LinearLayout
    private lateinit var radarView: RadarScanView
    private lateinit var nearbyStatusText: TextView
    private lateinit var discoveredListContainer: LinearLayout
    private lateinit var categorySidebar: LinearLayout
    private lateinit var deviceGridContainer: LinearLayout
    private lateinit var searchInput: EditText

    // Wizard Overlay Components
    private var wizardOverlay: FrameLayout? = null
    private var selectedCategory = "Electrical"
    private var selectedDeviceType = "Socket (Wi-Fi)"
    private val discoveredDevices = mutableSetOf<String>()
    private val discoveredBeans = mutableMapOf<String, ScanDeviceBean>()

    // Categories & Device Models
    private val categories = listOf("Electrical", "Lighting", "Sensors", "Water & Pumps", "Appliances")
    private val devicesByCategory = mapOf(
        "Electrical" to listOf(
            DeviceItem("Socket (Wi-Fi)", "\uD83D\uDD0C", "Standard 16A/10A Smart Plug"),
            DeviceItem("Socket (Gateway)", "\uD83D\uDD0C", "Zigbee / Mesh Smart Socket"),
            DeviceItem("Power Strip", "\uD83C\uDF9B\uFE0F", "Multi-outlet Smart Extension"),
            DeviceItem("Smart Breaker", "\u26A1", "DIN Rail Power Meter / MCB"),
            DeviceItem("Wall Switch", "\uD83D\uDCA1", "1/2/3/4 Gang Smart Switch")
        ),
        "Lighting" to listOf(
            DeviceItem("Smart Light Bulb", "\uD83D\uDCA1", "RGB + CCT Wi-Fi Bulb"),
            DeviceItem("LED Strip Light", "\u2728", "Addressable LED Strip Controller"),
            DeviceItem("Ceiling Lamp", "\uD83C\uDFEE", "Dimmable Ambient Light"),
            DeviceItem("Garden Spotlight", "\uD83D\uDD26", "Outdoor Landscape Light")
        ),
        "Sensors" to listOf(
            DeviceItem("Tank Level Sensor", "\uD83D\uDCA7", "Ultrasonic Water Level Meter"),
            DeviceItem("Sump Level Sensor", "\uD83C\uDF0A", "Submersible Hydrostatic Sensor"),
            DeviceItem("Soil Moisture", "\uD83C\uDF31", "Capacitive Agricultural Sensor"),
            DeviceItem("Temp & Humidity", "\uD83C\uDF21\uFE0F", "Ambient Climate Monitor"),
            DeviceItem("Water Leak Detector", "\uD83D\uDEA8", "Floor Flood Sensor")
        ),
        "Water & Pumps" to listOf(
            DeviceItem("Borewell Pump", "\u2699\uFE0F", "High-Power Submersible Starter"),
            DeviceItem("Tank Pump", "\uD83D\uDD04", "Overhead Tank Inflow Motor"),
            DeviceItem("Irrigation Pump", "\uD83C\uDF3E", "Drip Irrigation Line Valve"),
            DeviceItem("Solenoid Valve", "\uD83D\uDEB0", "Motorized Ball Valve Controller")
        ),
        "Appliances" to listOf(
            DeviceItem("Water Heater", "\uD83D\uDD25", "Smart Geyser Controller"),
            DeviceItem("Air Conditioner", "\u2744\uFE0F", "Smart IR Controller"),
            DeviceItem("Water Purifier", "\uD83E\uDD64", "RO System Monitor")
        )
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        buildMainUi()
        requestPermissionsIfNeeded()
        startNearbyBleScan()
    }

    override fun onDestroy() {
        stopNearbyBleScan()
        try {
            activator?.stop()
            activator?.onDestroy()
        } catch (e: Exception) {
            Log.w(TAG, "Error cleaning activator: ${e.message}")
        }
        super.onDestroy()
    }

    // ==========================================
    // UI BUILDER
    // ==========================================

    private fun buildMainUi() {
        rootContainer = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#1E1B19"))
        }

        val scrollView = ScrollView(this).apply {
            isFillViewport = true
        }

        mainContentLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 48, 32, 120)
        }

        // 1. Top Header Bar (< Add Device [QR])
        val headerBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, 24)
        }

        val backBtn = TextView(this).apply {
            text = "\u276E"
            textSize = 22f
            setTextColor(Color.WHITE)
            setPadding(16, 16, 32, 16)
            setOnClickListener { finish() }
        }
        headerBar.addView(backBtn)

        val headerTitle = TextView(this).apply {
            text = "Add Device"
            textSize = 20f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f)
        }
        headerBar.addView(headerTitle)

        val qrIcon = TextView(this).apply {
            text = "\u26F6"
            textSize = 22f
            setTextColor(Color.parseColor("#FF8A50"))
            setPadding(32, 16, 16, 16)
            setOnClickListener { Toast.makeText(this@TuyaPairingActivity, "Point camera at device QR code", Toast.LENGTH_SHORT).show() }
        }
        headerBar.addView(qrIcon)
        mainContentLayout.addView(headerBar)

        // 2. Radar Scan Area
        val radarContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(0, 0, 0, 24)
        }

        val searchingTitle = TextView(this).apply {
            text = "Searching for nearby devices..."
            textSize = 17f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 4)
        }
        radarContainer.addView(searchingTitle)

        val searchingSubtitle = TextView(this).apply {
            text = "Make sure device is powered on and in pairing mode."
            textSize = 12f
            setTextColor(Color.parseColor("#B4B0AD"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 20)
        }
        radarContainer.addView(searchingSubtitle)

        radarView = RadarScanView(this)
        val radarParams = LinearLayout.LayoutParams(320, 320).apply {
            gravity = Gravity.CENTER_HORIZONTAL
            bottomMargin = 20
        }
        radarContainer.addView(radarView, radarParams)

        nearbyStatusText = TextView(this).apply {
            text = "Scanning Bluetooth & Wi-Fi devices..."
            textSize = 12f
            setTextColor(Color.parseColor("#FF8A50"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 16)
        }
        radarContainer.addView(nearbyStatusText)

        // Discovered Devices Container
        discoveredListContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            visibility = View.GONE
        }
        radarContainer.addView(discoveredListContainer)

        mainContentLayout.addView(radarContainer)

        // Divider
        val divider = View(this).apply {
            setBackgroundColor(Color.parseColor("#332F2C"))
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 2).apply {
                bottomMargin = 24
            }
        }
        mainContentLayout.addView(divider)

        // 3. "Add Manually" Section Header
        val manualHeader = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, 16)
        }

        val manualTitle = TextView(this).apply {
            text = "Add Manually"
            textSize = 16f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f)
        }
        manualHeader.addView(manualTitle)
        mainContentLayout.addView(manualHeader)

        // 4. Search Bar
        searchInput = EditText(this).apply {
            hint = "Search for a category or device..."
            setHintTextColor(Color.parseColor("#7A7570"))
            setTextColor(Color.WHITE)
            textSize = 13f
            setBackgroundColor(Color.parseColor("#2A2725"))
            setPadding(28, 20, 28, 20)
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                bottomMargin = 20
            }
        }
        mainContentLayout.addView(searchInput)

        // 5. Category Split View (Sidebar Left + Grid Right)
        val splitContainer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 0, 0, 24)
        }

        // Left Sidebar
        categorySidebar = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(240, ViewGroup.LayoutParams.WRAP_CONTENT)
            setPadding(0, 0, 12, 0)
        }
        splitContainer.addView(categorySidebar)

        // Right Device Grid
        deviceGridContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f)
            setPadding(12, 0, 0, 0)
        }
        splitContainer.addView(deviceGridContainer)

        mainContentLayout.addView(splitContainer)
        scrollView.addView(mainContentLayout)
        rootContainer.addView(scrollView)
        setContentView(rootContainer)

        renderCategories()
        renderDeviceGrid(selectedCategory)
    }

    // ==========================================
    // RADAR & CATEGORY RENDERING
    // ==========================================

    private fun renderCategories() {
        categorySidebar.removeAllViews()
        for (cat in categories) {
            val isSelected = cat == selectedCategory
            val catBtn = TextView(this).apply {
                text = cat
                textSize = 13f
                setPadding(20, 24, 20, 24)
                if (isSelected) {
                    setTextColor(Color.parseColor("#FF8A50"))
                    setTypeface(null, Typeface.BOLD)
                    setBackgroundColor(Color.parseColor("#2A2725"))
                } else {
                    setTextColor(Color.parseColor("#B4B0AD"))
                    setTypeface(null, Typeface.NORMAL)
                    setBackgroundColor(Color.TRANSPARENT)
                }
                setOnClickListener {
                    selectedCategory = cat
                    renderCategories()
                    renderDeviceGrid(cat)
                }
            }
            categorySidebar.addView(catBtn)
        }
    }

    private fun renderDeviceGrid(category: String) {
        deviceGridContainer.removeAllViews()
        val devices = devicesByCategory[category] ?: emptyList()

        for (dev in devices) {
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setBackgroundColor(Color.parseColor("#2A2725"))
                setPadding(20, 20, 20, 20)
                val params = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = 12 }
                layoutParams = params
                setOnClickListener {
                    openPairingWizard(dev.name, dev.icon)
                }
            }

            val iconView = TextView(this).apply {
                text = dev.icon
                textSize = 24f
                setPadding(0, 0, 16, 0)
            }
            card.addView(iconView)

            val textLayout = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f)
            }

            val nameView = TextView(this).apply {
                text = dev.name
                setTextColor(Color.WHITE)
                textSize = 14f
                setTypeface(null, Typeface.BOLD)
            }
            textLayout.addView(nameView)

            val descView = TextView(this).apply {
                text = dev.desc
                setTextColor(Color.parseColor("#B4B0AD"))
                textSize = 11f
                setPadding(0, 2, 0, 0)
            }
            textLayout.addView(descView)
            card.addView(textLayout)

            val arrow = TextView(this).apply {
                text = "\u203A"
                textSize = 20f
                setTextColor(Color.parseColor("#7A7570"))
            }
            card.addView(arrow)

            deviceGridContainer.addView(card)
        }
    }

    // ==========================================
    // PAIRING WIZARD OVERLAY WITH SAVED WI-FI
    // ==========================================

    private fun openPairingWizard(deviceName: String, deviceIcon: String, autoStartIfSaved: Boolean = false) {
        selectedDeviceType = deviceName
        closeWizard()

        val currentSsid = getConnectedWifiSsid()
        val savedPass = getSavedWifiPassword(currentSsid)

        val overlay = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#E61E1B19"))
            isClickable = true
        }

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#2A2725"))
            setPadding(36, 36, 36, 36)
            val params = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.CENTER
                setMargins(36, 36, 36, 36)
            }
            layoutParams = params
        }

        // Header
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, 20)
        }

        val title = TextView(this).apply {
            text = "Connect $deviceName"
            setTextColor(Color.WHITE)
            textSize = 17f
            setTypeface(null, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f)
        }
        header.addView(title)

        val close = TextView(this).apply {
            text = "\u2715"
            setTextColor(Color.parseColor("#B4B0AD"))
            textSize = 20f
            setPadding(16, 0, 0, 16)
            setOnClickListener { closeWizard() }
        }
        header.addView(close)
        card.addView(header)

        // Step 1: Mode Check
        val step1Text = TextView(this).apply {
            text = "1. Ensure device is powered on and indicator is blinking rapidly."
            setTextColor(Color.parseColor("#FF8A50"))
            textSize = 12f
            setPadding(0, 0, 0, 16)
        }
        card.addView(step1Text)

        // Step 2: Wi-Fi Credentials
        val ssidLabel = TextView(this).apply {
            text = "WI-FI NETWORK (2.4 GHz Required)"
            setTextColor(Color.parseColor("#B4B0AD"))
            textSize = 11f
            setPadding(0, 0, 0, 6)
        }
        card.addView(ssidLabel)

        val ssidInput = EditText(this).apply {
            hint = "2.4 GHz Wi-Fi SSID"
            setHintTextColor(Color.parseColor("#7A7570"))
            setTextColor(Color.WHITE)
            setText(currentSsid)
            setBackgroundColor(Color.parseColor("#1E1B19"))
            setPadding(24, 18, 24, 18)
        }
        card.addView(ssidInput)

        val passLabel = TextView(this).apply {
            text = "WI-FI PASSWORD"
            setTextColor(Color.parseColor("#B4B0AD"))
            textSize = 11f
            setPadding(0, 14, 0, 6)
        }
        card.addView(passLabel)

        val passInput = EditText(this).apply {
            hint = "Wi-Fi Password"
            setHintTextColor(Color.parseColor("#7A7570"))
            setTextColor(Color.WHITE)
            setText(savedPass)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setBackgroundColor(Color.parseColor("#1E1B19"))
            setPadding(24, 18, 24, 18)
        }
        card.addView(passInput)

        // Saved password indicator badge
        if (savedPass.isNotEmpty()) {
            val savedBadge = TextView(this).apply {
                text = "\u2713 Wi-Fi password automatically remembered"
                setTextColor(Color.parseColor("#6BCB8C"))
                textSize = 11f
                setPadding(0, 6, 0, 0)
            }
            card.addView(savedBadge)
        }

        // Provisioning Progress Status
        val statusText = TextView(this).apply {
            text = if (savedPass.isNotEmpty()) "Ready to connect instantly." else "Enter password and tap Start."
            setTextColor(Color.parseColor("#B4B0AD"))
            textSize = 12f
            setPadding(0, 16, 0, 16)
            gravity = Gravity.CENTER
        }
        card.addView(statusText)

        // Action Button
        val actionBtn = Button(this).apply {
            text = if (savedPass.isNotEmpty()) "CONNECT NOW" else "START PROVISIONING"
            setBackgroundColor(Color.parseColor("#FF8A50"))
            setTextColor(Color.WHITE)
            setTypeface(null, Typeface.BOLD)
            setOnClickListener {
                val ssid = ssidInput.text.toString().trim()
                val pass = passInput.text.toString()
                if (ssid.isEmpty()) {
                    statusText.text = "Please enter Wi-Fi SSID."
                    statusText.setTextColor(Color.YELLOW)
                    return@setOnClickListener
                }
                saveWifiPassword(ssid, pass)
                isEnabled = false
                text = "PROVISIONING..."
                statusText.text = "Acquiring Tuya Cloud token..."
                statusText.setTextColor(Color.parseColor("#FF8A50"))
                startActivationFlow(ssid, pass, statusText, this)
            }
        }
        card.addView(actionBtn)

        overlay.addView(card)
        rootContainer.addView(overlay)
        wizardOverlay = overlay

        // If auto-start requested and password is already saved, launch immediately
        if (autoStartIfSaved && savedPass.isNotEmpty() && currentSsid.isNotEmpty()) {
            actionBtn.performClick()
        }
    }

    private fun closeWizard() {
        wizardOverlay?.let {
            rootContainer.removeView(it)
            wizardOverlay = null
        }
    }

    private fun getSavedWifiPassword(ssid: String): String {
        val bySsid = prefs.getString("wifi_pass_$ssid", "") ?: ""
        if (bySsid.isNotEmpty()) return bySsid
        return prefs.getString(KEY_LAST_PASS, "") ?: ""
    }

    private fun saveWifiPassword(ssid: String, pass: String) {
        prefs.edit()
            .putString("wifi_pass_$ssid", pass)
            .putString(KEY_LAST_PASS, pass)
            .apply()
    }

    // ==========================================
    // TUYA ACTIVATION FLOW
    // ==========================================

    private fun startActivationFlow(ssid: String, pwd: String, statusText: TextView, btn: Button) {
        getDefaultHomeId { homeId ->
            ThingHomeSdk.getActivatorInstance().getActivatorToken(homeId, object : IThingActivatorGetToken {
                override fun onSuccess(token: String?) {
                    if (token.isNullOrEmpty()) {
                        mainHandler.post {
                            statusText.text = "Error: empty token from Tuya Cloud"
                            statusText.setTextColor(Color.RED)
                            btn.isEnabled = true
                            btn.text = "RETRY"
                        }
                        return
                    }

                    mainHandler.post {
                        statusText.text = "Connecting to device... (EZ & BLE Mode)"
                    }

                    try {
                        val builder = ActivatorBuilder()
                            .setSsid(ssid)
                            .setPassword(pwd)
                            .setToken(token)
                            .setTimeOut(TIMEOUT_SECONDS)
                            .setContext(this@TuyaPairingActivity)
                            .setActivatorModel(ActivatorModelEnum.THING_EZ)
                            .setListener(object : IThingSmartActivatorListener {
                                override fun onError(code: String?, msg: String?) {
                                    mainHandler.post {
                                        statusText.text = "Pairing failed ($code): $msg"
                                        statusText.setTextColor(Color.RED)
                                        btn.isEnabled = true
                                        btn.text = "RETRY"
                                    }
                                }

                                override fun onActiveSuccess(devResp: DeviceBean?) {
                                    mainHandler.post {
                                        val devName = devResp?.name ?: devResp?.devId ?: selectedDeviceType
                                        statusText.text = "Device Paired Successfully!\n$devName"
                                        statusText.setTextColor(Color.parseColor("#6BCB8C"))
                                        btn.isEnabled = true
                                        btn.text = "DONE"
                                        btn.setBackgroundColor(Color.parseColor("#6BCB8C"))
                                        btn.setOnClickListener {
                                            setResult(RESULT_OK)
                                            finish()
                                        }
                                    }
                                }

                                override fun onStep(step: String?, data: Any?) {
                                    mainHandler.post {
                                        statusText.text = "Step: $step"
                                    }
                                }
                            })

                        activator = ThingHomeSdk.getActivatorInstance().newEZWifiConfigDevActivator(builder)
                        activator?.start()
                    } catch (e: Exception) {
                        mainHandler.post {
                            statusText.text = "Activator error: ${e.message}"
                            statusText.setTextColor(Color.RED)
                            btn.isEnabled = true
                            btn.text = "RETRY"
                        }
                    }
                }

                override fun onFailure(code: String?, msg: String?) {
                    mainHandler.post {
                        statusText.text = "Token resolution error ($code): $msg"
                        statusText.setTextColor(Color.RED)
                        btn.isEnabled = true
                        btn.text = "RETRY"
                    }
                }
            })
        }
    }

    private fun getDefaultHomeId(callback: (Long) -> Unit) {
        ThingHomeSdk.getHomeManagerInstance().queryHomeList(object : IThingGetHomeListCallback {
            override fun onSuccess(homeList: MutableList<HomeBean>?) {
                if (!homeList.isNullOrEmpty()) {
                    callback(homeList[0].homeId)
                } else {
                    createDefaultHome(callback)
                }
            }
            override fun onError(code: String, msg: String) {
                createDefaultHome(callback)
            }
        })
    }

    private fun createDefaultHome(callback: (Long) -> Unit) {
        ThingHomeSdk.getHomeManagerInstance().createHome("SmartCodeFlurry Home", 0.0, 0.0, "", emptyList(), object : IThingHomeResultCallback {
            override fun onSuccess(bean: HomeBean?) {
                callback(bean?.homeId ?: 0L)
            }
            override fun onError(code: String, msg: String) {
                callback(0L)
            }
        })
    }

    // ==========================================
    // BLE SCAN & UTILITIES
    // ==========================================

    private fun startNearbyBleScan() {
        try {
            ThingHomeSdk.getBleOperator().startLeScan(SCAN_TIMEOUT_MS, ScanType.SINGLE, object : BleScanResponse {
                override fun onResult(bean: ScanDeviceBean?) {
                    if (bean != null) {
                        mainHandler.post {
                            val name = if (!bean.name.isNullOrBlank()) bean.name else "Tuya Smart Device (${bean.mac ?: "Nearby"})"
                            discoveredBeans[name] = bean
                            addDiscoveredNearbyDevice(name, if (bean.rssi != 0) "${bean.rssi} dBm (Strong)" else "Nearby Device")
                        }
                    }
                }
            })
        } catch (e: Exception) {
            Log.w(TAG, "BLE Scan: ${e.message}")
        }
    }

    private fun stopNearbyBleScan() {
        try {
            ThingHomeSdk.getBleOperator().stopLeScan()
        } catch (e: Exception) {
            Log.w(TAG, "BLE Stop: ${e.message}")
        }
    }

    private fun addDiscoveredNearbyDevice(name: String, detail: String) {
        if (!discoveredDevices.add(name)) return
        discoveredListContainer.visibility = View.VISIBLE
        nearbyStatusText.text = "\u26A1 Found ${discoveredDevices.size} nearby device(s) ready to pair!"
        nearbyStatusText.setTextColor(Color.parseColor("#6BCB8C"))

        val item = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setBackgroundColor(Color.parseColor("#2A2725"))
            setPadding(24, 20, 24, 20)
            val params = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                bottomMargin = 12
            }
            layoutParams = params
            setOnClickListener {
                openPairingWizard(name, "\uD83D\uDCE1", autoStartIfSaved = true)
            }
        }

        val textLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f)
        }
        val nameView = TextView(this).apply {
            text = name
            setTextColor(Color.WHITE)
            textSize = 14f
            setTypeface(null, Typeface.BOLD)
        }
        val detailView = TextView(this).apply {
            text = "$detail \u2022 Tap to connect instantly"
            setTextColor(Color.parseColor("#FF8A50"))
            textSize = 11f
        }
        textLayout.addView(nameView)
        textLayout.addView(detailView)
        item.addView(textLayout)

        val pairBtn = Button(this).apply {
            text = "ADD"
            setBackgroundColor(Color.parseColor("#FF8A50"))
            setTextColor(Color.WHITE)
            textSize = 12f
            setTypeface(null, Typeface.BOLD)
            setOnClickListener { openPairingWizard(name, "\uD83D\uDCE1", autoStartIfSaved = true) }
        }
        item.addView(pairBtn)
        discoveredListContainer.addView(item)
    }

    private fun getConnectedWifiSsid(): String {
        return try {
            val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val info: WifiInfo = wifiManager.connectionInfo
            val raw = info.ssid ?: ""
            if (raw.startsWith("\"") && raw.endsWith("\"") && raw.length >= 2) {
                raw.substring(1, raw.length - 1)
            } else if (raw != "<unknown ssid>") {
                raw
            } else {
                "Airtel_VivaanGowda"
            }
        } catch (e: Exception) {
            "Airtel_VivaanGowda"
        }
    }

    private fun requestPermissionsIfNeeded() {
        val perms = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.ACCESS_WIFI_STATE,
            Manifest.permission.CHANGE_WIFI_STATE
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            perms.add(Manifest.permission.BLUETOOTH_SCAN)
            perms.add(Manifest.permission.BLUETOOTH_CONNECT)
        }
        val needed = perms.filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), PERMISSION_REQ_CODE)
        }
    }

    data class DeviceItem(val name: String, val icon: String, val desc: String)

    // ==========================================
    // RADAR ANIMATION VIEW
    // ==========================================

    inner class RadarScanView(context: Context) : View(context) {
        private var sweepAngle = 0f
        private val circlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#2A2725")
            style = Paint.Style.STROKE
            strokeWidth = 3f
        }
        private val centerDotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#FF8A50")
            style = Paint.Style.FILL
        }
        private val sweepPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
        }

        init {
            ValueAnimator.ofFloat(0f, 360f).apply {
                duration = 2400L
                repeatCount = ValueAnimator.INFINITE
                interpolator = LinearInterpolator()
                addUpdateListener {
                    sweepAngle = it.animatedValue as Float
                    invalidate()
                }
                start()
            }
        }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val cx = width / 2f
            val cy = height / 2f
            val maxRadius = (Math.min(width, height) / 2f) - 10f

            // Concentric Rings
            canvas.drawCircle(cx, cy, maxRadius * 0.35f, circlePaint)
            canvas.drawCircle(cx, cy, maxRadius * 0.70f, circlePaint)
            canvas.drawCircle(cx, cy, maxRadius, circlePaint)

            // Radar Sweep Gradient in warm orange theme
            val shader = SweepGradient(
                cx, cy,
                intArrayOf(Color.TRANSPARENT, Color.parseColor("#4DFF8A50"), Color.parseColor("#CCFF8A50")),
                floatArrayOf(0.0f, 0.75f, 1.0f)
            )
            val matrix = Matrix().apply { postRotate(sweepAngle, cx, cy) }
            shader.setLocalMatrix(matrix)
            sweepPaint.shader = shader

            canvas.drawCircle(cx, cy, maxRadius, sweepPaint)
            canvas.drawCircle(cx, cy, 10f, centerDotPaint)
        }
    }
}
