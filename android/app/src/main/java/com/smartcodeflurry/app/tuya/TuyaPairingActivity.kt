package com.smartcodeflurry.app.tuya

import android.Manifest
import android.animation.ValueAnimator
import android.app.Activity
import android.content.Context
import android.content.Intent
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
import com.smartcodeflurry.app.R
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
 * Smart Life / Tuya Standard Add Device Screen
 * Matches the official Smart Life design with radar animation, category explorer, device tiles, and 3-step pairing flow.
 */
class TuyaPairingActivity : Activity() {

    companion object {
        private const val TAG = "TuyaPairingActivity"
        private const val PERMISSION_REQ_CODE = 1001
        private const val TIMEOUT_SECONDS = 100L
        private const val SCAN_TIMEOUT_MS = 60000
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var activator: IThingActivator? = null

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

    // Categories & Device Models
    private val categories = listOf("Electrical", "Lighting", "Sensors", "Water & Pumps", "Appliances")
    private val devicesByCategory = mapOf(
        "Electrical" to listOf(
            DeviceItem("Socket (Wi-Fi)", "??", "Standard 16A/10A Smart Plug"),
            DeviceItem("Socket (Gateway)", "??", "Zigbee / Mesh Smart Socket"),
            DeviceItem("Power Strip", "???", "Multi-outlet Smart Extension"),
            DeviceItem("Smart Breaker", "?", "DIN Rail Power Meter / MCB"),
            DeviceItem("Wall Switch", "??", "1/2/3/4 Gang Smart Switch")
        ),
        "Lighting" to listOf(
            DeviceItem("Smart Light Bulb", "??", "RGB + CCT Wi-Fi Bulb"),
            DeviceItem("LED Strip Light", "?", "Addressable LED Strip Controller"),
            DeviceItem("Ceiling Lamp", "??", "Dimmable Ambient Light"),
            DeviceItem("Garden Spotlight", "??", "Outdoor Landscape Light")
        ),
        "Sensors" to listOf(
            DeviceItem("Tank Level Sensor", "??", "Ultrasonic Water Level Meter"),
            DeviceItem("Sump Level Sensor", "??", "Submersible Hydrostatic Sensor"),
            DeviceItem("Soil Moisture", "??", "Capacitive Agricultural Sensor"),
            DeviceItem("Temp & Humidity", "???", "Ambient Climate Monitor"),
            DeviceItem("Water Leak Detector", "??", "Floor Flood Sensor")
        ),
        "Water & Pumps" to listOf(
            DeviceItem("Borewell Pump", "??", "High-Power Submersible Starter"),
            DeviceItem("Tank Pump", "??", "Overhead Tank Inflow Motor"),
            DeviceItem("Irrigation Pump", "??", "Drip Irrigation Line Valve"),
            DeviceItem("Solenoid Valve", "??", "Motorized Ball Valve Controller")
        ),
        "Appliances" to listOf(
            DeviceItem("Water Heater", "??", "Smart Geyser Controller"),
            DeviceItem("Air Conditioner", "??", "Smart IR Controller"),
            DeviceItem("Water Purifier", "??", "RO System Monitor")
        )
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
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
            setBackgroundColor(Color.parseColor("#0F172A"))
        }

        val scrollView = ScrollView(this).apply {
            isFillViewport = true
        }

        mainContentLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 48, 32, 48)
        }

        // 1. Top Header Bar (< Add Device [QR])
        val headerBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, 32)
        }

        val backBtn = TextView(this).apply {
            text = "?"
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
            text = "?"
            textSize = 22f
            setTextColor(Color.parseColor("#38BDF8"))
            setPadding(32, 16, 16, 16)
            setOnClickListener { Toast.makeText(this@TuyaPairingActivity, "Point camera at device QR code", Toast.LENGTH_SHORT).show() }
        }
        headerBar.addView(qrIcon)
        mainContentLayout.addView(headerBar)

        // 2. Radar Scan Area
        val radarContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(0, 0, 0, 32)
        }

        val searchingTitle = TextView(this).apply {
            text = "Searching for nearby devices..."
            textSize = 18f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 8)
        }
        radarContainer.addView(searchingTitle)

        val searchingSubtitle = TextView(this).apply {
            text = "Make sure the device is powered on and in pairing mode."
            textSize = 13f
            setTextColor(Color.parseColor("#94A3B8"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 24)
        }
        radarContainer.addView(searchingSubtitle)

        radarView = RadarScanView(this)
        val radarParams = LinearLayout.LayoutParams(360, 360).apply {
            gravity = Gravity.CENTER_HORIZONTAL
            bottomMargin = 24
        }
        radarContainer.addView(radarView, radarParams)

        nearbyStatusText = TextView(this).apply {
            text = "Scanning nearby Bluetooth & Wi-Fi devices..."
            textSize = 12f
            setTextColor(Color.parseColor("#38BDF8"))
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
            setBackgroundColor(Color.parseColor("#334155"))
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 2).apply {
                bottomMargin = 32
            }
        }
        mainContentLayout.addView(divider)

        // 3. "Add Manually" Section Header
        val manualHeader = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, 20)
        }

        val manualTitle = TextView(this).apply {
            text = "Add Manually"
            textSize = 17f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f)
        }
        manualHeader.addView(manualTitle)
        mainContentLayout.addView(manualHeader)

        // 4. Search Bar
        searchInput = EditText(this).apply {
            hint = "Search for a category or device..."
            setHintTextColor(Color.parseColor("#64748B"))
            setTextColor(Color.WHITE)
            textSize = 14f
            setBackgroundColor(Color.parseColor("#1E293B"))
            setPadding(32, 24, 32, 24)
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                bottomMargin = 24
            }
        }
        mainContentLayout.addView(searchInput)

        // 5. Category Split View (Sidebar Left + Grid Right)
        val splitContainer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 0, 0, 32)
        }

        // Left Sidebar
        categorySidebar = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(260, ViewGroup.LayoutParams.WRAP_CONTENT)
            setPadding(0, 0, 16, 0)
        }
        splitContainer.addView(categorySidebar)

        // Right Device Grid
        deviceGridContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f)
            setPadding(16, 0, 0, 0)
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
                textSize = 14f
                setPadding(24, 28, 24, 28)
                if (isSelected) {
                    setTextColor(Color.parseColor("#38BDF8"))
                    setTypeface(null, Typeface.BOLD)
                    setBackgroundColor(Color.parseColor("#1E293B"))
                } else {
                    setTextColor(Color.parseColor("#94A3B8"))
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
                setBackgroundColor(Color.parseColor("#1E293B"))
                setPadding(24, 24, 24, 24)
                val params = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = 16 }
                layoutParams = params
                setOnClickListener {
                    openPairingWizard(dev.name, dev.icon)
                }
            }

            val iconView = TextView(this).apply {
                text = dev.icon
                textSize = 28f
                setPadding(0, 0, 24, 0)
            }
            card.addView(iconView)

            val textLayout = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f)
            }

            val nameView = TextView(this).apply {
                text = dev.name
                setTextColor(Color.WHITE)
                textSize = 15f
                setTypeface(null, Typeface.BOLD)
            }
            textLayout.addView(nameView)

            val descView = TextView(this).apply {
                text = dev.desc
                setTextColor(Color.parseColor("#94A3B8"))
                textSize = 12f
                setPadding(0, 4, 0, 0)
            }
            textLayout.addView(descView)
            card.addView(textLayout)

            val arrow = TextView(this).apply {
                text = "›"
                textSize = 22f
                setTextColor(Color.parseColor("#64748B"))
            }
            card.addView(arrow)

            deviceGridContainer.addView(card)
        }
    }

    // ==========================================
    // PAIRING WIZARD OVERLAY
    // ==========================================

    private fun openPairingWizard(deviceName: String, deviceIcon: String) {
        selectedDeviceType = deviceName
        closeWizard()

        val overlay = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#E60F172A"))
            isClickable = true
        }

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#1E293B"))
            setPadding(40, 40, 40, 40)
            val params = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.CENTER
                setMargins(40, 40, 40, 40)
            }
            layoutParams = params
        }

        // Header
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, 24)
        }

        val title = TextView(this).apply {
            text = "Connect $deviceName"
            setTextColor(Color.WHITE)
            textSize = 18f
            setTypeface(null, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f)
        }
        header.addView(title)

        val close = TextView(this).apply {
            text = "?"
            setTextColor(Color.parseColor("#94A3B8"))
            textSize = 20f
            setPadding(16, 0, 0, 16)
            setOnClickListener { closeWizard() }
        }
        header.addView(close)
        card.addView(header)

        // Step 1: Mode Check
        val step1Text = TextView(this).apply {
            text = "1. Power on device and ensure the LED indicator is blinking rapidly."
            setTextColor(Color.parseColor("#38BDF8"))
            textSize = 13f
            setPadding(0, 0, 0, 20)
        }
        card.addView(step1Text)

        // Step 2: Wi-Fi Credentials
        val ssidLabel = TextView(this).apply {
            text = "WI-FI NETWORK (2.4 GHz Required)"
            setTextColor(Color.parseColor("#94A3B8"))
            textSize = 11f
            setPadding(0, 0, 0, 8)
        }
        card.addView(ssidLabel)

        val ssidInput = EditText(this).apply {
            hint = "2.4 GHz Wi-Fi SSID"
            setHintTextColor(Color.parseColor("#64748B"))
            setTextColor(Color.WHITE)
            setText(getConnectedWifiSsid())
            setBackgroundColor(Color.parseColor("#0F172A"))
            setPadding(24, 20, 24, 20)
        }
        card.addView(ssidInput)

        val passLabel = TextView(this).apply {
            text = "WI-FI PASSWORD"
            setTextColor(Color.parseColor("#94A3B8"))
            textSize = 11f
            setPadding(0, 16, 0, 8)
        }
        card.addView(passLabel)

        val passInput = EditText(this).apply {
            hint = "Wi-Fi Password"
            setHintTextColor(Color.parseColor("#64748B"))
            setTextColor(Color.WHITE)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setBackgroundColor(Color.parseColor("#0F172A"))
            setPadding(24, 20, 24, 20)
        }
        card.addView(passInput)

        // Provisioning Progress Status
        val statusText = TextView(this).apply {
            text = "Ready to connect."
            setTextColor(Color.parseColor("#94A3B8"))
            textSize = 13f
            setPadding(0, 20, 0, 20)
            gravity = Gravity.CENTER
        }
        card.addView(statusText)

        // Action Button
        val actionBtn = Button(this).apply {
            text = "START PROVISIONING"
            setBackgroundColor(Color.parseColor("#38BDF8"))
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
                isEnabled = false
                text = "PROVISIONING..."
                statusText.text = "Acquiring Tuya Cloud token..."
                statusText.setTextColor(Color.parseColor("#38BDF8"))
                startActivationFlow(ssid, pass, statusText, this)
            }
        }
        card.addView(actionBtn)

        overlay.addView(card)
        rootContainer.addView(overlay)
        wizardOverlay = overlay
    }

    private fun closeWizard() {
        wizardOverlay?.let {
            rootContainer.removeView(it)
            wizardOverlay = null
        }
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
                        statusText.text = "Connecting to device... (EZ Mode)"
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
                                        statusText.setTextColor(Color.parseColor("#4ADE80"))
                                        btn.isEnabled = true
                                        btn.text = "DONE"
                                        btn.setBackgroundColor(Color.parseColor("#22C55E"))
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
                            addDiscoveredNearbyDevice(name, if (bean.rssi != 0) "${bean.rssi} dBm" else "Strong Signal")
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
        nearbyStatusText.text = "Found ${discoveredDevices.size} nearby device(s)"
        nearbyStatusText.setTextColor(Color.parseColor("#4ADE80"))

        val item = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setBackgroundColor(Color.parseColor("#1E293B"))
            setPadding(24, 20, 24, 20)
            val params = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                bottomMargin = 12
            }
            layoutParams = params
            setOnClickListener {
                openPairingWizard(name, "??")
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
            text = detail
            setTextColor(Color.parseColor("#38BDF8"))
            textSize = 11f
        }
        textLayout.addView(nameView)
        textLayout.addView(detailView)
        item.addView(textLayout)

        val pairBtn = Button(this).apply {
            text = "ADD"
            setBackgroundColor(Color.parseColor("#38BDF8"))
            setTextColor(Color.WHITE)
            textSize = 12f
            setOnClickListener { openPairingWizard(name, "??") }
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
                ""
            }
        } catch (e: Exception) {
            ""
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
            color = Color.parseColor("#1E293B")
            style = Paint.Style.STROKE
            strokeWidth = 3f
        }
        private val centerDotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#38BDF8")
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

            // Radar Sweep Gradient
            val shader = SweepGradient(
                cx, cy,
                intArrayOf(Color.TRANSPARENT, Color.parseColor("#4D38BDF8"), Color.parseColor("#CC38BDF8")),
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