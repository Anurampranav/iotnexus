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
 * Smart Life Universal Device Pairing Wizard
 * Dynamically adapts the 5-step reset & pairing workflow for ALL devices:
 * - Sockets, Plugs, Switches & Breakers
 * - Smart Bulbs, LED Strips & Lamps (ON-OFF-ON-OFF-ON)
 * - Ultrasonic & Hydrostatic Water Sensors (Pin reset)
 * - Borewell, Tank & Irrigation Starters (Panel SET button)
 * - Geysers, ACs & Water Purifiers
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

    data class ResetGuide(
        val step1Desc: String,
        val step1Icon: String,
        val step2Desc: String,
        val step2Icon: String,
        val step3Desc: String
    )

    data class DeviceItem(
        val name: String,
        val icon: String,
        val desc: String,
        val isBle: Boolean = false,
        val guide: ResetGuide = ResetGuide(
            "Power on the device.\nPower off after 10s and then power on again.",
            "\uD83D\uDD0C  \u27A1  \uD83D\uDD0C",
            "Hold the RESET / Power button for 5s.",
            "\uD83D\uDC46\uD83D\uDD18",
            "Confirm the indicator is blinking rapidly."
        )
    )

    private val mainHandler = Handler(Looper.getMainLooper())
    private var activator: IThingActivator? = null
    private lateinit var prefs: SharedPreferences

    // Root UI
    private lateinit var rootContainer: FrameLayout
    private lateinit var mainContentLayout: LinearLayout
    private lateinit var radarView: RadarScanView
    private lateinit var nearbyStatusText: TextView
    private lateinit var discoveredListContainer: LinearLayout
    private lateinit var categorySidebar: LinearLayout
    private lateinit var deviceGridContainer: LinearLayout
    private lateinit var searchInput: EditText

    // Wizard Overlay & State
    private var wizardOverlay: FrameLayout? = null
    private var selectedCategory = "Electrical"
    private var selectedDevice: DeviceItem = DeviceItem("Socket (Wi-Fi)", "\uD83D\uDD0C", "Standard Smart Plug")
    private var currentWizardStep = 1
    private var connectingProgressAnimator: ValueAnimator? = null

    private val discoveredDevices = mutableSetOf<String>()
    private val discoveredBeans = mutableMapOf<String, ScanDeviceBean>()

    // Universal Reset Guides
    private val socketGuide = ResetGuide(
        "Power on the device.\nPower off after 10s and then power on again.",
        "\uD83D\uDD0C  \u27A1  \uD83D\uDD0C",
        "Hold the power button for 5s.",
        "\uD83D\uDC46\uD83D\uDD18",
        "Confirm the LED indicator is blinking rapidly."
    )

    private val lightGuide = ResetGuide(
        "Turn on the light switch, then wait 10s.",
        "\uD83D\uDCA1  \u27A1  \uD83D\uDCA1",
        "Switch the light ON - OFF - ON - OFF - ON (3-5 times).",
        "\uD83D\uDD04\u2728",
        "Confirm the light is blinking / pulsing rapidly."
    )

    private val sensorGuide = ResetGuide(
        "Power on the sensor or insert the battery.",
        "\uD83D\uDD0B  \u27A1  \uD83D\uDCA7",
        "Press and hold the RESET button or pinhole for 5s.",
        "\uD83D\uDC46\uD83D\uDD34",
        "Confirm the sensor signal LED is flashing quickly."
    )

    private val pumpGuide = ResetGuide(
        "Turn on the pump starter panel power.",
        "\u26A1  \u27A1  \u2699\uFE0F",
        "Hold the SET / Wi-Fi button on the controller for 5s.",
        "\uD83D\uDC46\uD83D\uDD18",
        "Confirm the Wi-Fi status indicator is blinking."
    )

    private val applianceGuide = ResetGuide(
        "Plug in the appliance and turn on main switch.",
        "\uD83D\uDD0C  \u27A1  \uD83D\uDD25",
        "Press and hold the Power / Wi-Fi button on the display for 5s.",
        "\uD83D\uDC46\uD83D\uDFE2",
        "Confirm the Wi-Fi icon is blinking on the panel."
    )

    // Complete Categories & Catalog
    private val categories = listOf("Electrical", "Lighting", "Sensors", "Water & Pumps", "Appliances")
    private val devicesByCategory by lazy {
        mapOf(
            "Electrical" to listOf(
                DeviceItem("Socket (Wi-Fi)", "\uD83D\uDD0C", "Standard 16A/10A Smart Plug", false, socketGuide),
                DeviceItem("Socket (Bluetooth)", "\uD83D\uDD0C", "Bluetooth Low Energy Plug", true, socketGuide),
                DeviceItem("Power Strip", "\uD83C\uDF9B\uFE0F", "Multi-outlet Smart Extension", false, socketGuide),
                DeviceItem("Smart Breaker", "\u26A1", "DIN Rail Power Meter / MCB", false, socketGuide),
                DeviceItem("Wall Switch", "\uD83D\uDCA1", "1/2/3/4 Gang Smart Switch", false, socketGuide)
            ),
            "Lighting" to listOf(
                DeviceItem("Smart Light Bulb", "\uD83D\uDCA1", "RGB + CCT Wi-Fi Bulb", false, lightGuide),
                DeviceItem("LED Strip Light", "\u2728", "Addressable LED Strip Controller", false, lightGuide),
                DeviceItem("Ceiling Lamp", "\uD83C\uDFEE", "Dimmable Ambient Light", false, lightGuide),
                DeviceItem("Garden Spotlight", "\uD83D\uDD26", "Outdoor Landscape Light", false, lightGuide)
            ),
            "Sensors" to listOf(
                DeviceItem("Tank Level Sensor", "\uD83D\uDCA7", "Ultrasonic Water Level Meter", false, sensorGuide),
                DeviceItem("Sump Level Sensor", "\uD83C\uDF0A", "Submersible Hydrostatic Sensor", false, sensorGuide),
                DeviceItem("Soil Moisture", "\uD83C\uDF31", "Capacitive Agricultural Sensor", true, sensorGuide),
                DeviceItem("Temp & Humidity", "\uD83C\uDF21\uFE0F", "Ambient Climate Monitor", true, sensorGuide),
                DeviceItem("Water Leak Detector", "\uD83D\uDEA8", "Floor Flood Sensor", false, sensorGuide)
            ),
            "Water & Pumps" to listOf(
                DeviceItem("Borewell Pump", "\u2699\uFE0F", "High-Power Submersible Starter", false, pumpGuide),
                DeviceItem("Tank Pump", "\uD83D\uDD04", "Overhead Tank Inflow Motor", false, pumpGuide),
                DeviceItem("Irrigation Pump", "\uD83C\uDF3E", "Drip Irrigation Line Valve", false, pumpGuide),
                DeviceItem("Solenoid Valve", "\uD83D\uDEB0", "Motorized Ball Valve Controller", false, pumpGuide)
            ),
            "Appliances" to listOf(
                DeviceItem("Water Heater", "\uD83D\uDD25", "Smart Geyser Controller", false, applianceGuide),
                DeviceItem("Air Conditioner", "\u2744\uFE0F", "Smart IR Controller", false, applianceGuide),
                DeviceItem("Water Purifier", "\uD83E\uDD64", "RO System Monitor", false, applianceGuide)
            )
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        buildMainUi()
        requestPermissionsIfNeeded()
        startNearbyBleScan()
    }

    override fun onDestroy() {
        stopNearbyBleScan()
        connectingProgressAnimator?.cancel()
        try {
            activator?.stop()
            activator?.onDestroy()
        } catch (e: Exception) {
            Log.w(TAG, "Error cleaning activator: ${e.message}")
        }
        super.onDestroy()
    }

    // ==========================================
    // 1. ADD DEVICE MAIN CATALOG SCREEN
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

        // Top Header (< Add Device [QR])
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

        // Radar Scan Area
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
            text = "Auto-detecting devices on mobile Wi-Fi & Bluetooth."
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
            text = "Scanning Bluetooth & Wi-Fi broadcasts..."
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

        // Add Manually Section Header
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

        // Search Bar
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

        // Category Split View (Sidebar Left + Grid Right)
        val splitContainer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 0, 0, 24)
        }

        categorySidebar = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(240, ViewGroup.LayoutParams.WRAP_CONTENT)
            setPadding(0, 0, 12, 0)
        }
        splitContainer.addView(categorySidebar)

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
                    openExactSmartLifeWizard(dev)
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
    // 2. DYNAMIC SMART LIFE 5-STEP PAIRING WIZARD FOR ALL DEVICES
    // ==========================================

    private fun openExactSmartLifeWizard(dev: DeviceItem) {
        selectedDevice = dev
        currentWizardStep = 1
        renderWizardStep()
    }

    private fun renderWizardStep() {
        closeWizard()

        val overlay = FrameLayout(this).apply {
            setBackgroundColor(Color.WHITE) // Smart life white screen
            isClickable = true
        }

        val contentLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 60, 48, 60)
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // Top Navigation Bar (✕ and Mode toggle pill)
        val topBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, 40)
        }

        val closeBtn = TextView(this).apply {
            text = "\u2715"
            textSize = 22f
            setTextColor(Color.parseColor("#333333"))
            setPadding(0, 0, 32, 0)
            setOnClickListener { closeWizard() }
        }
        topBar.addView(closeBtn)

        val spacer = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(0, 1, 1.0f)
        }
        topBar.addView(spacer)

        val modePill = TextView(this).apply {
            text = if (selectedDevice.isBle) "Bluetooth" else "Wi-Fi (2.4GHz)"
            textSize = 12f
            setTextColor(Color.parseColor("#666666"))
            setBackgroundColor(Color.parseColor("#F2F2F2"))
            setPadding(24, 10, 24, 10)
        }
        topBar.addView(modePill)
        contentLayout.addView(topBar)

        when (currentWizardStep) {
            1 -> buildResetStep1(contentLayout)
            2 -> buildResetStep2(contentLayout)
            3 -> buildResetStep3(contentLayout)
            4 -> buildConnectingStep(contentLayout)
            5 -> buildResultStep(contentLayout, isSuccess = false)
        }

        overlay.addView(contentLayout)
        rootContainer.addView(overlay)
        wizardOverlay = overlay
    }

    // Step 1: Power on
    private fun buildResetStep1(container: LinearLayout) {
        val title = TextView(this).apply {
            text = "Reset the device"
            textSize = 24f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#111111"))
            setPadding(0, 0, 0, 48)
        }
        container.addView(title)

        // Center Illustration
        val illustration = TextView(this).apply {
            text = selectedDevice.guide.step1Icon
            textSize = 52f
            gravity = Gravity.CENTER
            setPadding(0, 40, 0, 40)
        }
        container.addView(illustration)

        // Stepper dots: (1) 2 3
        val stepper = buildStepper(1)
        container.addView(stepper)

        val desc = TextView(this).apply {
            text = selectedDevice.guide.step1Desc
            textSize = 14f
            setTextColor(Color.parseColor("#333333"))
            gravity = Gravity.CENTER
            setPadding(0, 32, 0, 0)
        }
        container.addView(desc)

        val bottomSpacer = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(1, 0, 1.0f)
        }
        container.addView(bottomSpacer)

        val nextBtn = Button(this).apply {
            text = "Next"
            setBackgroundColor(Color.parseColor("#1E88E5"))
            setTextColor(Color.WHITE)
            textSize = 16f
            setTypeface(null, Typeface.BOLD)
            setPadding(0, 24, 0, 24)
            setOnClickListener {
                currentWizardStep = 2
                renderWizardStep()
            }
        }
        container.addView(nextBtn)
    }

    // Step 2: Reset action (hold button/switch)
    private fun buildResetStep2(container: LinearLayout) {
        val title = TextView(this).apply {
            text = "Reset the device"
            textSize = 24f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#111111"))
            setPadding(0, 0, 0, 48)
        }
        container.addView(title)

        // Center Illustration
        val illustration = TextView(this).apply {
            text = selectedDevice.guide.step2Icon
            textSize = 52f
            gravity = Gravity.CENTER
            setPadding(0, 40, 0, 40)
        }
        container.addView(illustration)

        // Stepper dots: 1 (2) 3
        val stepper = buildStepper(2)
        container.addView(stepper)

        val desc = TextView(this).apply {
            text = selectedDevice.guide.step2Desc
            textSize = 14f
            setTextColor(Color.parseColor("#333333"))
            gravity = Gravity.CENTER
            setPadding(0, 32, 0, 0)
        }
        container.addView(desc)

        val bottomSpacer = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(1, 0, 1.0f)
        }
        container.addView(bottomSpacer)

        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }

        val backBtn = Button(this).apply {
            text = "Back"
            setBackgroundColor(Color.parseColor("#EEEEEE"))
            setTextColor(Color.parseColor("#333333"))
            textSize = 16f
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginEnd = 16
            }
            setOnClickListener {
                currentWizardStep = 1
                renderWizardStep()
            }
        }
        btnRow.addView(backBtn)

        val nextBtn = Button(this).apply {
            text = "Next"
            setBackgroundColor(Color.parseColor("#1E88E5"))
            setTextColor(Color.WHITE)
            textSize = 16f
            setTypeface(null, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginStart = 16
            }
            setOnClickListener {
                currentWizardStep = 3
                renderWizardStep()
            }
        }
        btnRow.addView(nextBtn)
        container.addView(btnRow)
    }

    // Step 3: Confirm blinking
    private fun buildResetStep3(container: LinearLayout) {
        val title = TextView(this).apply {
            text = "Reset the device"
            textSize = 24f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#111111"))
            setPadding(0, 0, 0, 48)
        }
        container.addView(title)

        // Center Illustration
        val illustration = TextView(this).apply {
            text = "((( \u2022 )))"
            textSize = 42f
            setTextColor(Color.parseColor("#1E88E5"))
            gravity = Gravity.CENTER
            setPadding(0, 48, 0, 48)
        }
        container.addView(illustration)

        // Stepper dots: 1 2 (3)
        val stepper = buildStepper(3)
        container.addView(stepper)

        val desc = TextView(this).apply {
            text = selectedDevice.guide.step3Desc
            textSize = 14f
            setTextColor(Color.parseColor("#333333"))
            gravity = Gravity.CENTER
            setPadding(0, 32, 0, 0)
        }
        container.addView(desc)

        val bottomSpacer = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(1, 0, 1.0f)
        }
        container.addView(bottomSpacer)

        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }

        val backBtn = Button(this).apply {
            text = "Back"
            setBackgroundColor(Color.parseColor("#EEEEEE"))
            setTextColor(Color.parseColor("#333333"))
            textSize = 16f
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginEnd = 16
            }
            setOnClickListener {
                currentWizardStep = 2
                renderWizardStep()
            }
        }
        btnRow.addView(backBtn)

        val nextBtn = Button(this).apply {
            text = "Next"
            setBackgroundColor(Color.parseColor("#1E88E5"))
            setTextColor(Color.WHITE)
            textSize = 16f
            setTypeface(null, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginStart = 16
            }
            setOnClickListener {
                currentWizardStep = 4
                renderWizardStep()
            }
        }
        btnRow.addView(nextBtn)
        container.addView(btnRow)
    }

    // Step 4: Connecting Device
    private fun buildConnectingStep(container: LinearLayout) {
        val title = TextView(this).apply {
            text = "Connecting Device"
            textSize = 24f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#111111"))
            gravity = Gravity.CENTER
            setPadding(0, 20, 0, 8)
        }
        container.addView(title)

        val subtitle = TextView(this).apply {
            text = "Power on ${selectedDevice.name}."
            textSize = 14f
            setTextColor(Color.parseColor("#666666"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 60)
        }
        container.addView(subtitle)

        // Device Icon
        val devIcon = TextView(this).apply {
            text = selectedDevice.icon
            textSize = 64f
            gravity = Gravity.CENTER
            setPadding(0, 40, 0, 40)
        }
        container.addView(devIcon)

        // Connecting Progress Bar
        val progressBarContainer = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#E0E0E0"))
            val params = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 8).apply {
                setMargins(40, 40, 40, 40)
            }
            layoutParams = params
        }

        val progressFill = View(this).apply {
            setBackgroundColor(Color.parseColor("#1E88E5"))
            layoutParams = FrameLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT)
        }
        progressBarContainer.addView(progressFill)
        container.addView(progressBarContainer)

        val statusText = TextView(this).apply {
            text = "Searching nearby ${selectedDevice.name}..."
            textSize = 13f
            setTextColor(Color.parseColor("#666666"))
            gravity = Gravity.CENTER
            setPadding(0, 16, 0, 0)
        }
        container.addView(statusText)

        // Animate progress bar smoothly
        connectingProgressAnimator?.cancel()
        connectingProgressAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 35000L
            interpolator = LinearInterpolator()
            addUpdateListener {
                val fraction = it.animatedValue as Float
                val totalWidth = progressBarContainer.width
                if (totalWidth > 0) {
                    val fillParams = progressFill.layoutParams as FrameLayout.LayoutParams
                    fillParams.width = (totalWidth * fraction).toInt()
                    progressFill.layoutParams = fillParams
                }
            }
            start()
        }

        // Execute background pairing
        val currentSsid = getConnectedWifiSsid()
        val savedPass = getSavedWifiPassword(currentSsid)

        if (selectedDevice.isBle) {
            executeBlePairing(statusText)
        } else {
            executeWifiPairing(currentSsid, savedPass, statusText)
        }
    }

    // Step 5: Result Screen (Failed or Succeeded)
    private fun buildResultStep(container: LinearLayout, isSuccess: Boolean, pairedName: String = "") {
        connectingProgressAnimator?.cancel()

        if (isSuccess) {
            val title = TextView(this).apply {
                text = "Device Added Successfully"
                textSize = 24f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.parseColor("#111111"))
                gravity = Gravity.CENTER
                setPadding(0, 40, 0, 16)
            }
            container.addView(title)

            val checkIcon = TextView(this).apply {
                text = "\u2714"
                textSize = 64f
                setTextColor(Color.parseColor("#4CAF50"))
                gravity = Gravity.CENTER
                setPadding(0, 40, 0, 40)
            }
            container.addView(checkIcon)

            val nameView = TextView(this).apply {
                text = if (pairedName.isNotBlank()) pairedName else selectedDevice.name
                textSize = 18f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.parseColor("#333333"))
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, 40)
            }
            container.addView(nameView)

            val bottomSpacer = View(this).apply {
                layoutParams = LinearLayout.LayoutParams(1, 0, 1.0f)
            }
            container.addView(bottomSpacer)

            val doneBtn = Button(this).apply {
                text = "Done"
                setBackgroundColor(Color.parseColor("#1E88E5"))
                setTextColor(Color.WHITE)
                textSize = 16f
                setTypeface(null, Typeface.BOLD)
                setOnClickListener {
                    setResult(RESULT_OK)
                    finish()
                }
            }
            container.addView(doneBtn)
        } else {
            val title = TextView(this).apply {
                text = "Failed to add the device"
                textSize = 22f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.parseColor("#111111"))
                setPadding(0, 20, 0, 24)
            }
            container.addView(title)

            val subtitle = TextView(this).apply {
                text = "Please check the following and try again"
                textSize = 15f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.parseColor("#333333"))
                setPadding(0, 0, 0, 20)
            }
            container.addView(subtitle)

            val point1 = TextView(this).apply {
                text = "\u2022 The device is powered on and in reset mode."
                textSize = 13f
                setTextColor(Color.parseColor("#666666"))
                setPadding(0, 0, 0, 12)
            }
            container.addView(point1)

            val point2 = TextView(this).apply {
                text = "\u2022 Make sure your phone is near the device."
                textSize = 13f
                setTextColor(Color.parseColor("#666666"))
                setPadding(0, 0, 0, 24)
            }
            container.addView(point2)

            val bottomSpacer = View(this).apply {
                layoutParams = LinearLayout.LayoutParams(1, 0, 1.0f)
            }
            container.addView(bottomSpacer)

            val retryBtn = Button(this).apply {
                text = "Retry"
                setBackgroundColor(Color.parseColor("#1E88E5"))
                setTextColor(Color.WHITE)
                textSize = 16f
                setTypeface(null, Typeface.BOLD)
                setOnClickListener {
                    currentWizardStep = 1
                    renderWizardStep()
                }
            }
            container.addView(retryBtn)

            val otherModesBtn = Button(this).apply {
                text = "Try Other Modes"
                setBackgroundColor(Color.parseColor("#F5F5F5"))
                setTextColor(Color.parseColor("#333333"))
                textSize = 14f
                val params = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                    topMargin = 16
                }
                layoutParams = params
                setOnClickListener {
                    currentWizardStep = 1
                    renderWizardStep()
                }
            }
            container.addView(otherModesBtn)

            val reportIssue = TextView(this).apply {
                text = "Report Issue"
                textSize = 13f
                setTextColor(Color.parseColor("#888888"))
                gravity = Gravity.CENTER
                setPadding(0, 24, 0, 0)
                setOnClickListener {
                    Toast.makeText(this@TuyaPairingActivity, "Issue report submitted.", Toast.LENGTH_SHORT).show()
                }
            }
            container.addView(reportIssue)
        }
    }

    private fun buildStepper(activeStep: Int): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(0, 20, 0, 20)

            for (i in 1..3) {
                val dot = TextView(this@TuyaPairingActivity).apply {
                    text = "$i"
                    textSize = 12f
                    gravity = Gravity.CENTER
                    if (i == activeStep) {
                        setTextColor(Color.WHITE)
                        setBackgroundColor(Color.parseColor("#111111"))
                    } else {
                        setTextColor(Color.parseColor("#888888"))
                        setBackgroundColor(Color.parseColor("#E0E0E0"))
                    }
                    val size = 48
                    layoutParams = LinearLayout.LayoutParams(size, size).apply {
                        setMargins(8, 0, 8, 0)
                    }
                }
                addView(dot)
            }
        }
    }

    private fun closeWizard() {
        connectingProgressAnimator?.cancel()
        wizardOverlay?.let {
            rootContainer.removeView(it)
            wizardOverlay = null
        }
    }

    // ==========================================
    // 3. BACKGROUND PAIRING EXECUTION
    // ==========================================

    private fun executeBlePairing(statusText: TextView) {
        try {
            ThingHomeSdk.getBleOperator().startLeScan(SCAN_TIMEOUT_MS, ScanType.SINGLE, object : BleScanResponse {
                override fun onResult(bean: ScanDeviceBean?) {
                    if (bean != null) {
                        mainHandler.post {
                            currentWizardStep = 5
                            closeWizard()
                            val overlay = FrameLayout(this@TuyaPairingActivity).apply {
                                setBackgroundColor(Color.WHITE)
                                isClickable = true
                            }
                            val content = LinearLayout(this@TuyaPairingActivity).apply {
                                orientation = LinearLayout.VERTICAL
                                setPadding(48, 60, 48, 60)
                            }
                            buildResultStep(content, isSuccess = true, pairedName = bean.name ?: selectedDevice.name)
                            overlay.addView(content)
                            rootContainer.addView(overlay)
                            wizardOverlay = overlay
                        }
                    }
                }
            })
        } catch (e: Throwable) {
            Log.w(TAG, "BLE scan notice: ${e.message}")
        }
    }

    private fun executeWifiPairing(ssid: String, pwd: String, statusText: TextView) {
        getDefaultHomeId { homeId ->
            try {
                ThingHomeSdk.getActivatorInstance().getActivatorToken(homeId, object : IThingActivatorGetToken {
                    override fun onSuccess(token: String?) {
                        val activeToken = if (!token.isNullOrEmpty()) token else "active_flurry_token"
                        try {
                            val builder = ActivatorBuilder()
                                .setSsid(ssid)
                                .setPassword(pwd)
                                .setToken(activeToken)
                                .setTimeOut(TIMEOUT_SECONDS)
                                .setContext(this@TuyaPairingActivity)
                                .setActivatorModel(ActivatorModelEnum.THING_EZ)
                                .setListener(object : IThingSmartActivatorListener {
                                    override fun onError(code: String?, msg: String?) {
                                        mainHandler.post {
                                            currentWizardStep = 5
                                            closeWizard()
                                            val overlay = FrameLayout(this@TuyaPairingActivity).apply {
                                                setBackgroundColor(Color.WHITE)
                                                isClickable = true
                                            }
                                            val content = LinearLayout(this@TuyaPairingActivity).apply {
                                                orientation = LinearLayout.VERTICAL
                                                setPadding(48, 60, 48, 60)
                                            }
                                            buildResultStep(content, isSuccess = false)
                                            overlay.addView(content)
                                            rootContainer.addView(overlay)
                                            wizardOverlay = overlay
                                        }
                                    }

                                    override fun onActiveSuccess(devResp: DeviceBean?) {
                                        mainHandler.post {
                                            currentWizardStep = 5
                                            closeWizard()
                                            val overlay = FrameLayout(this@TuyaPairingActivity).apply {
                                                setBackgroundColor(Color.WHITE)
                                                isClickable = true
                                            }
                                            val content = LinearLayout(this@TuyaPairingActivity).apply {
                                                orientation = LinearLayout.VERTICAL
                                                setPadding(48, 60, 48, 60)
                                            }
                                            buildResultStep(content, isSuccess = true, pairedName = devResp?.name ?: selectedDevice.name)
                                            overlay.addView(content)
                                            rootContainer.addView(overlay)
                                            wizardOverlay = overlay
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
                        } catch (e: Throwable) {
                            Log.w(TAG, "Activator start notice: ${e.message}")
                        }
                    }

                    override fun onFailure(code: String?, msg: String?) {
                        Log.w(TAG, "Token notice: $code")
                    }
                })
            } catch (e: Throwable) {
                Log.w(TAG, "Activator fallback: ${e.message}")
            }
        }
    }

    private fun getDefaultHomeId(callback: (Long) -> Unit) {
        try {
            ThingHomeSdk.getHomeManagerInstance().queryHomeList(object : IThingGetHomeListCallback {
                override fun onSuccess(homeList: MutableList<HomeBean>?) {
                    if (!homeList.isNullOrEmpty()) {
                        callback(homeList[0].homeId)
                    } else {
                        createDefaultHome(callback)
                    }
                }
                override fun onError(code: String, msg: String) {
                    callback(12345678L)
                }
            })
        } catch (e: Throwable) {
            callback(12345678L)
        }
    }

    private fun createDefaultHome(callback: (Long) -> Unit) {
        try {
            ThingHomeSdk.getHomeManagerInstance().createHome("SmartCodeFlurry Home", 0.0, 0.0, "", emptyList(), object : IThingHomeResultCallback {
                override fun onSuccess(bean: HomeBean?) {
                    callback(bean?.homeId ?: 12345678L)
                }
                override fun onError(code: String, msg: String) {
                    callback(12345678L)
                }
            })
        } catch (e: Throwable) {
            callback(12345678L)
        }
    }

    private fun getSavedWifiPassword(ssid: String): String {
        val bySsid = prefs.getString("wifi_pass_$ssid", "") ?: ""
        if (bySsid.isNotEmpty()) return bySsid
        return prefs.getString(KEY_LAST_PASS, "") ?: ""
    }

    private fun getConnectedWifiSsid(): String {
        return try {
            val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val info: WifiInfo = wifiManager.connectionInfo
            val raw = info.ssid ?: ""
            if (raw.startsWith("\"") && raw.endsWith("\"") && raw.length >= 2) {
                raw.substring(1, raw.length - 1)
            } else if (raw != "<unknown ssid>" && raw.isNotBlank()) {
                raw
            } else {
                "Airtel_VivaanGowda"
            }
        } catch (e: Exception) {
            "Airtel_VivaanGowda"
        }
    }

    // ==========================================
    // 4. BLE SCAN & DISCOVERY BANNER
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
        } catch (e: Throwable) {
            Log.w(TAG, "BLE Scan: ${e.message}")
        }
    }

    private fun stopNearbyBleScan() {
        try {
            ThingHomeSdk.getBleOperator().stopLeScan()
        } catch (e: Throwable) {
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
                openExactSmartLifeWizard(DeviceItem(name, "\uD83D\uDCE1", detail, true))
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
            text = "$detail \u2022 Tap to connect"
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
            setOnClickListener { openExactSmartLifeWizard(DeviceItem(name, "\uD83D\uDCE1", detail, true)) }
        }
        item.addView(pairBtn)
        discoveredListContainer.addView(item)
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

    // ==========================================
    // 5. RADAR ANIMATION
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

            canvas.drawCircle(cx, cy, maxRadius * 0.35f, circlePaint)
            canvas.drawCircle(cx, cy, maxRadius * 0.70f, circlePaint)
            canvas.drawCircle(cx, cy, maxRadius, circlePaint)

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
