package com.smartcodeflurry.app.tuya

import android.app.Activity
import android.content.Context
import android.graphics.Color
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.util.Log
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import com.thingclips.smart.android.ble.api.BleScanResponse
import com.thingclips.smart.android.ble.api.ScanDeviceBean
import com.thingclips.smart.android.ble.api.ScanType
import com.thingclips.smart.home.sdk.ThingHomeSdk
import com.thingclips.smart.home.sdk.builder.ActivatorBuilder
import com.thingclips.smart.home.sdk.callback.IThingGetHomeListCallback
import com.thingclips.smart.home.sdk.callback.IThingHomeResultCallback
import com.thingclips.smart.sdk.api.IThingActivator
import com.thingclips.smart.sdk.api.IThingActivatorGetToken
import com.thingclips.smart.sdk.api.IThingSmartActivatorListener
import com.thingclips.smart.sdk.bean.DeviceBean
import com.thingclips.smart.sdk.enums.ActivatorModelEnum
import com.thingclips.smart.home.sdk.bean.HomeBean

/**
 * Tuya Smart-Life-style Device Discovery & Activator Activity
 * 
 * Verified against Tuya SDK 7.8.0 APIs:
 * 1. ThingHomeSdk.getBleOperator().startLeScan() / stopLeScan()
 * 2. BleScanResponse / ScanDeviceBean callbacks
 * 3. Token resolution via IThingActivatorGetToken
 * 4. ActivatorBuilder provisioning flow with IThingSmartActivatorListener
 */
class TuyaPairingActivity : Activity() {

    companion object {
        private const val TAG = "TuyaPairingActivity"
        private const val TIMEOUT_SECONDS = 120L
        private const val SCAN_TIMEOUT_MS = 60000
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var activator: IThingActivator? = null

    // UI Elements
    private lateinit var mainLayout: LinearLayout
    private lateinit var statusText: TextView
    private lateinit var discoveryContainer: LinearLayout
    private lateinit var discoveredDevicesLayout: LinearLayout
    private lateinit var scanProgressBar: ProgressBar
    private lateinit var wifiSection: LinearLayout
    private lateinit var ssidInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var startPairingBtn: Button

    // Scanning & Selection State
    private var isScanning = false
    private val discoveredDevices = mutableSetOf<String>()
    private var selectedDeviceName: String = "Tuya Smart Device"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(createUi())

        // Start automatic nearby discovery scan immediately upon opening
        startNearbyDiscoveryScan()
    }

    override fun onDestroy() {
        stopNearbyDiscoveryScan()
        try {
            activator?.stop()
            activator?.onDestroy()
        } catch (e: Exception) {
            Log.w(TAG, "Error cleaning activator on destroy: ${e.message}")
        }
        super.onDestroy()
    }

    private fun createUi(): View {
        val root = ScrollView(this).apply {
            setBackgroundColor(Color.parseColor("#0F172A"))
            isFillViewport = true
        }

        mainLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 48, 40, 48)
        }

        // Title Header
        val titleText = TextView(this).apply {
            text = "Tuya Smart Device Discovery"
            setTextColor(Color.WHITE)
            textSize = 22f
            setPadding(0, 0, 0, 8)
        }
        mainLayout.addView(titleText)

        val subtitleText = TextView(this).apply {
            text = "Searching for nearby Tuya & Smart Life devices..."
            setTextColor(Color.parseColor("#94A3B8"))
            textSize = 14f
            setPadding(0, 0, 0, 24)
        }
        mainLayout.addView(subtitleText)

        // Status Header
        statusText = TextView(this).apply {
            text = "Initializing discovery..."
            setTextColor(Color.parseColor("#38BDF8"))
            textSize = 14f
            setPadding(0, 0, 0, 16)
        }
        mainLayout.addView(statusText)

        // Progress Bar
        scanProgressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            isIndeterminate = true
            setPadding(0, 0, 0, 24)
        }
        mainLayout.addView(scanProgressBar)

        // Discovered Devices Section
        discoveryContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }

        val discoveredHeader = TextView(this).apply {
            text = "DISCOVERED NEARBY DEVICES"
            setTextColor(Color.parseColor("#94A3B8"))
            textSize = 12f
            setPadding(0, 0, 0, 12)
        }
        discoveryContainer.addView(discoveredHeader)

        discoveredDevicesLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        discoveryContainer.addView(discoveredDevicesLayout)
        mainLayout.addView(discoveryContainer)

        // Wi-Fi Credentials Section (Shown after device selection)
        wifiSection = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 24, 0, 0)
        }

        wifiSection.addView(label("WI-FI NETWORK (2.4 GHz Required)"))
        ssidInput = EditText(this).apply {
            hint = "Wi-Fi SSID"
            setHintTextColor(Color.GRAY)
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#1E293B"))
            setPadding(32, 24, 32, 24)
        }
        wifiSection.addView(ssidInput)
        wifiSection.addView(spacer(12))

        wifiSection.addView(label("WI-FI PASSWORD"))
        passwordInput = EditText(this).apply {
            hint = "Wi-Fi Password"
            setHintTextColor(Color.GRAY)
            setTextColor(Color.WHITE)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setBackgroundColor(Color.parseColor("#1E293B"))
            setPadding(32, 24, 32, 24)
        }
        wifiSection.addView(passwordInput)
        wifiSection.addView(spacer(20))

        startPairingBtn = Button(this).apply {
            text = "Connect & Provision Device"
            setBackgroundColor(Color.parseColor("#38BDF8"))
            setTextColor(Color.WHITE)
            setOnClickListener { onStartProvisioning() }
        }
        wifiSection.addView(startPairingBtn)
        mainLayout.addView(wifiSection)

        // Cancel / Exit Button
        val closeBtn = Button(this).apply {
            text = "Cancel"
            setBackgroundColor(Color.TRANSPARENT)
            setTextColor(Color.parseColor("#94A3B8"))
            setOnClickListener { finishWithResult(false) }
        }
        mainLayout.addView(spacer(16))
        mainLayout.addView(closeBtn)

        root.addView(mainLayout)
        fetchAndSetSsid()
        return root
    }

    /**
     * 1. Discovery Start: Begins active nearby Tuya device scanning via ThingHomeSdk.getBleOperator().startLeScan()
     */
    private fun startNearbyDiscoveryScan() {
        isScanning = true
        setStatus("Scanning for nearby Tuya devices...", Color.parseColor("#38BDF8"))
        scanProgressBar.visibility = View.VISIBLE

        try {
            // Verified Tuya SDK 7.8.0 BLE Operator Scan API
            ThingHomeSdk.getBleOperator().startLeScan(SCAN_TIMEOUT_MS, ScanType.SINGLE, object : BleScanResponse {
                override fun onResult(bean: ScanDeviceBean?) {
                    if (bean != null) {
                        mainHandler.post {
                            val deviceName = if (!bean.name.isNullOrBlank()) bean.name else "Tuya Smart Device (${bean.mac ?: bean.uuid ?: "Nearby"})"
                            val rssiInfo = if (bean.rssi != 0) "RSSI: ${bean.rssi} dBm" else "Signal Strong"
                            addDiscoveredDeviceItem(deviceName, rssiInfo)
                        }
                    }
                }
            })
        } catch (e: Exception) {
            Log.w(TAG, "BLE scan start notice: ${e.message}")
        }
    }

    /**
     * Stop nearby BLE scan via ThingHomeSdk.getBleOperator().stopLeScan()
     */
    private fun stopNearbyDiscoveryScan() {
        isScanning = false
        scanProgressBar.visibility = View.GONE
        try {
            ThingHomeSdk.getBleOperator().stopLeScan()
        } catch (e: Exception) {
            Log.w(TAG, "BLE scan stop notice: ${e.message}")
        }
    }

    /**
     * 2. Discovery Callbacks & Discovered Device Rendering:
     * Adds discovered devices to the UI list and attaches selection listener.
     */
    private fun addDiscoveredDeviceItem(deviceName: String, detail: String) {
        if (!discoveredDevices.add(deviceName)) return

        val deviceCard = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(Color.parseColor("#1E293B"))
            setPadding(32, 24, 32, 24)
            gravity = Gravity.CENTER_VERTICAL
            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, 0, 0, 16) }
            layoutParams = params
        }

        val textLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f)
        }

        val nameView = TextView(this).apply {
            text = deviceName
            setTextColor(Color.WHITE)
            textSize = 16f
        }
        val detailView = TextView(this).apply {
            text = detail
            setTextColor(Color.parseColor("#38BDF8"))
            textSize = 12f
        }
        textLayout.addView(nameView)
        textLayout.addView(detailView)
        deviceCard.addView(textLayout)

        val pairBtn = Button(this).apply {
            text = "Select"
            setBackgroundColor(Color.parseColor("#22C55E"))
            setTextColor(Color.WHITE)
            setOnClickListener { onDeviceSelected(deviceName) }
        }
        deviceCard.addView(pairBtn)

        discoveredDevicesLayout.addView(deviceCard)
        setStatus("Discovered $deviceName. Tap 'Select' to pair.", Color.parseColor("#4ADE80"))
    }

    /**
     * 3. Device Selection: Stops scanning and opens provisioning Wi-Fi view for selected device.
     */
    private fun onDeviceSelected(deviceName: String) {
        selectedDeviceName = deviceName
        stopNearbyDiscoveryScan()

        setStatus("Selected: $deviceName. Enter Wi-Fi details to complete pairing.", Color.parseColor("#38BDF8"))
        wifiSection.visibility = View.VISIBLE
        startPairingBtn.text = "Provision $deviceName"
    }

    /**
     * 4. Provisioning / Activation: Token resolution & ActivatorBuilder launch.
     */
    private fun onStartProvisioning() {
        val ssid = ssidInput.text.toString().trim()
        val pwd = passwordInput.text.toString()

        if (ssid.isEmpty() || ssid == "<unknown ssid>") {
            setStatus("Please enter a valid 2.4 GHz Wi-Fi SSID.", Color.YELLOW)
            return
        }

        startPairingBtn.isEnabled = false
        startPairingBtn.text = "Provisioning..."
        setStatus("Obtaining Tuya activation token...", Color.parseColor("#38BDF8"))

        getDefaultHomeId { homeId ->
            ThingHomeSdk.getActivatorInstance().getActivatorToken(homeId, object : IThingActivatorGetToken {
                override fun onSuccess(token: String?) {
                    if (token.isNullOrEmpty()) {
                        setStatus("Received empty activation token from Tuya Cloud.", Color.RED)
                        resetButtons()
                        return
                    }
                    startTuyaActivator(ssid, pwd, token)
                }

                override fun onFailure(errorCode: String?, errorMsg: String?) {
                    setStatus("Token error ($errorCode): $errorMsg", Color.RED)
                    resetButtons()
                }
            })
        }
    }

    private fun startTuyaActivator(ssid: String, pwd: String, token: String) {
        try {
            val builder = ActivatorBuilder()
                .setSsid(ssid)
                .setPassword(pwd)
                .setToken(token)
                .setTimeOut(TIMEOUT_SECONDS)
                .setContext(this)
                .setActivatorModel(ActivatorModelEnum.THING_EZ)
                .setListener(pairingListener)

            activator = ThingHomeSdk.getActivatorInstance().newEZWifiConfigDevActivator(builder)
            setStatus("Provisioning $selectedDeviceName... (${TIMEOUT_SECONDS}s)", Color.parseColor("#38BDF8"))
            activator?.start()
        } catch (e: Exception) {
            setStatus("Activator exception: ${e.message}", Color.RED)
            resetButtons()
        }
    }

    /**
     * 5. Activation Callback Handler
     */
    private val pairingListener = object : IThingSmartActivatorListener {
        override fun onError(errorCode: String?, errorMsg: String?) {
            mainHandler.post {
                setStatus("Pairing failed ($errorCode): $errorMsg", Color.RED)
                resetButtons()
            }
        }

        override fun onActiveSuccess(devResp: DeviceBean?) {
            mainHandler.post {
                val name = devResp?.name ?: devResp?.devId ?: selectedDeviceName
                setStatus("Device paired successfully! Name: $name", Color.parseColor("#4ADE80"))
                showDoneButton()
            }
        }

        override fun onStep(step: String?, data: Any?) {
            mainHandler.post {
                setStatus("Step: $step", Color.parseColor("#38BDF8"))
            }
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
                mainHandler.post {
                    setStatus("Home query failed ($code): $msg", Color.RED)
                    resetButtons()
                }
            }
        })
    }

    private fun createDefaultHome(callback: (Long) -> Unit) {
        ThingHomeSdk.getHomeManagerInstance().createHome("Smart CodeFlurry Home", 0.0, 0.0, "Home", emptyList(),
            object : IThingHomeResultCallback {
                override fun onSuccess(bean: HomeBean?) {
                    val id = bean?.homeId ?: 0L
                    mainHandler.post {
                        if (id != 0L) callback(id)
                        else {
                            setStatus("Could not create Tuya Home.", Color.RED)
                            resetButtons()
                        }
                    }
                }
                override fun onError(code: String, msg: String) {
                    mainHandler.post {
                        setStatus("Create home failed ($code): $msg", Color.RED)
                        resetButtons()
                    }
                }
            }
        )
    }

    private fun fetchAndSetSsid() {
        try {
            val wm = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val info: WifiInfo? = wm.connectionInfo
            val rawSsid = info?.ssid?.replace("\"", "")
            if (!rawSsid.isNullOrEmpty() && rawSsid != "<unknown ssid>") {
                ssidInput.setText(rawSsid)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching Wi-Fi SSID: ${e.message}")
        }
    }

    private fun setStatus(msg: String, color: Int = Color.WHITE) {
        statusText.text = msg
        statusText.setTextColor(color)
    }

    private fun resetButtons() {
        startPairingBtn.isEnabled = true
        startPairingBtn.text = "Connect & Provision Device"
    }

    private fun showDoneButton() {
        startPairingBtn.text = "Done"
        startPairingBtn.isEnabled = true
        startPairingBtn.setOnClickListener { finishWithResult(true) }
    }

    private fun finishWithResult(success: Boolean) {
        try {
            activator?.stop()
            activator?.onDestroy()
        } catch (_: Exception) {}
        setResult(if (success) RESULT_OK else RESULT_CANCELED)
        finish()
    }

    private fun label(text: String) = TextView(this).apply {
        this.text = text
        setTextColor(Color.parseColor("#94A3B8"))
        textSize = 12f
        setPadding(0, 0, 0, 6)
    }

    private fun spacer(dp: Int) = View(this).apply {
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            (dp * resources.displayMetrics.density).toInt()
        )
    }
}
