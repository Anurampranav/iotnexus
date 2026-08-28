package com.smartcodeflurry.app.tuya

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.location.LocationManager
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.util.Log
import android.view.Gravity
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
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
 * TuyaPairingActivity — WiFi device pairing UI using verified ThingHomeSdk 7.5.1 / 7.8.0 APIs.
 */
class TuyaPairingActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var ssidInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var startButton: Button
    private lateinit var closeButton: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var modeGroup: RadioGroup
    private lateinit var ezRadio: RadioButton
    private lateinit var apRadio: RadioButton

    private var activator: IThingActivator? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    companion object {
        private const val TAG = "TuyaPairingActivity"
        private const val TIMEOUT_SECONDS = 120L
        private const val PERM_REQUEST_CODE = 101
        private const val APP_KEY = "33vtgndn3d4vptmwhg3s"
        private const val APP_SECRET = "k9xuvk3a4jryygp8yrxev8vg4f4v9wce"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "onCreate initialized")

        // Ensure SDK is initialized before layout/queries
        ensureSdkInitialized()

        setContentView(buildLayout())
        checkLocationPermissionAndPrefillSsid()
    }

    private fun ensureSdkInitialized() {
        try {
            ThingHomeSdk.init(application, APP_KEY, APP_SECRET)
            ThingHomeSdk.setDebugMode(com.smartcodeflurry.app.BuildConfig.DEBUG)
            Log.d(TAG, "ThingHomeSdk initialized in TuyaPairingActivity")
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing ThingHomeSdk in TuyaPairingActivity", e)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "onDestroy called")
        try { activator?.stop(); activator?.onDestroy() } catch (e: Exception) { Log.e(TAG, "Error stopping activator on destroy", e) }
    }

    // --- Layout ---------------------------------------------------------------

    private fun buildLayout(): View {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
            setBackgroundColor(Color.parseColor("#1A1A2E"))
        }
        root.addView(TextView(this).apply {
            text = "Add Device"
            textSize = 24f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(0, 0, 0, 32)
        })
        modeGroup = RadioGroup(this).apply {
            orientation = RadioGroup.HORIZONTAL
            gravity = Gravity.CENTER_HORIZONTAL
        }
        ezRadio = RadioButton(this).apply { text = "EZ Mode"; setTextColor(Color.WHITE); isChecked = true; id = View.generateViewId() }
        apRadio = RadioButton(this).apply { text = "AP Mode"; setTextColor(Color.WHITE); id = View.generateViewId() }
        modeGroup.addView(ezRadio); modeGroup.addView(apRadio)
        root.addView(modeGroup)
        root.addView(spacer(16))
        root.addView(label("Wi-Fi Network (2.4 GHz)"))
        ssidInput = EditText(this).apply {
            hint = "Enter Wi-Fi SSID"; setTextColor(Color.WHITE); setHintTextColor(Color.GRAY)
            setBackgroundColor(Color.parseColor("#2D2D44")); setPadding(24, 16, 24, 16)
        }
        root.addView(ssidInput)
        root.addView(spacer(16))
        root.addView(label("Wi-Fi Password"))
        passwordInput = EditText(this).apply {
            hint = "Enter Wi-Fi Password"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setTextColor(Color.WHITE); setHintTextColor(Color.GRAY)
            setBackgroundColor(Color.parseColor("#2D2D44")); setPadding(24, 16, 24, 16)
        }
        root.addView(passwordInput)
        root.addView(spacer(24))
        progressBar = ProgressBar(this).apply { visibility = View.GONE }
        root.addView(progressBar)
        statusText = TextView(this).apply {
            text = "Put your device in pairing mode, then tap Start."
            setTextColor(Color.parseColor("#AAAACC")); textSize = 14f
            gravity = Gravity.CENTER_HORIZONTAL; setPadding(0, 16, 0, 16)
        }
        root.addView(statusText)
        root.addView(spacer(16))
        startButton = Button(this).apply {
            text = "Start Pairing"; setBackgroundColor(Color.parseColor("#4CAF50")); setTextColor(Color.WHITE)
            setOnClickListener { onStartPairing() }
        }
        root.addView(startButton)
        root.addView(spacer(12))
        closeButton = Button(this).apply {
            text = "Cancel"; setBackgroundColor(Color.parseColor("#555577")); setTextColor(Color.WHITE)
            setOnClickListener { finishWithResult(false) }
        }
        root.addView(closeButton)
        val scroll = ScrollView(this); scroll.addView(root); return scroll
    }

    // --- Pairing flow --------------------------------------------------------

    private fun checkLocationPermissionAndPrefillSsid() {
        val hasFine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!hasFine) {
            Log.d(TAG, "Requesting location permissions for SSID auto-detection")
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                PERM_REQUEST_CODE
            )
        } else {
            fetchAndSetSsid()
        }
    }

    private fun fetchAndSetSsid() {
        try {
            val wm = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val wifiInfo: WifiInfo? = wm.connectionInfo
            var ssid = wifiInfo?.ssid ?: ""
            if (ssid.startsWith("\"") && ssid.endsWith("\"")) {
                ssid = ssid.substring(1, ssid.length - 1)
            }
            Log.d(TAG, "Auto-detected Wi-Fi SSID: $ssid")
            if (ssid == "<unknown ssid>" || ssid == "0x" || ssid.isEmpty()) {
                val lm = applicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
                val isGpsEnabled = lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
                if (!isGpsEnabled) {
                    setStatus("? Enable Location/GPS on phone to auto-detect Wi-Fi SSID.", Color.YELLOW)
                }
            } else {
                ssidInput.setText(ssid)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching SSID", e)
        }
    }

    private fun onStartPairing() {
        val ssid = ssidInput.text.toString().trim()
        val pwd  = passwordInput.text.toString()
        Log.d(TAG, "onStartPairing tapped. SSID: '$ssid'")
        if (ssid.isEmpty()) { setStatus("? Enter Wi-Fi SSID.", Color.YELLOW); return }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), PERM_REQUEST_CODE)
            return
        }
        val isEz = ezRadio.isChecked
        startButton.isEnabled = false
        progressBar.visibility = View.VISIBLE
        setStatus("Fetching pairing token…", Color.parseColor("#AADDFF"))

        getDefaultHomeId { homeId ->
            Log.d(TAG, "Obtained HomeId: $homeId. Requesting activator token…")
            try {
                ThingHomeSdk.getActivatorInstance().getActivatorToken(homeId, object : IThingActivatorGetToken {
                    override fun onSuccess(token: String) {
                        Log.d(TAG, "Received activator token successfully: $token")
                        mainHandler.post {
                            if (isEz) startEzMode(ssid, pwd, token)
                            else       startApMode(ssid, pwd, token)
                        }
                    }
                    override fun onFailure(code: String, msg: String) {
                        Log.e(TAG, "Failed to get activator token. Code: $code, Msg: $msg")
                        mainHandler.post {
                            setStatus("? Token error ($code): $msg\n(Check Tuya App Key/Secret)", Color.RED)
                            resetButtons()
                        }
                    }
                })
            } catch (e: Exception) {
                Log.e(TAG, "Exception during getActivatorToken call", e)
                mainHandler.post {
                    setStatus("? Exception starting token request: ${e.message}", Color.RED)
                    resetButtons()
                }
            }
        }
    }

    private fun startEzMode(ssid: String, pwd: String, token: String) {
        Log.d(TAG, "Starting EZ Mode pairing with SSID: '$ssid'")
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
            setStatus("? Scanning for EZ-mode devices… (${TIMEOUT_SECONDS}s)", Color.parseColor("#AADDFF"))
            activator?.start()
            Log.d(TAG, "EZ Activator started")
        } catch (e: Exception) {
            Log.e(TAG, "Exception launching EZ Mode activator", e)
            setStatus("? Exception launching EZ mode: ${e.message}", Color.RED)
            resetButtons()
        }
    }

    private fun startApMode(ssid: String, pwd: String, token: String) {
        Log.d(TAG, "Starting AP Mode pairing with SSID: '$ssid'")
        try {
            val builder = ActivatorBuilder()
                .setSsid(ssid)
                .setPassword(pwd)
                .setToken(token)
                .setTimeOut(TIMEOUT_SECONDS)
                .setContext(this)
                .setActivatorModel(ActivatorModelEnum.THING_AP)
                .setListener(pairingListener)

            activator = ThingHomeSdk.getActivatorInstance().newActivator(builder)
            setStatus("Connect phone to device hotspot, then wait…", Color.parseColor("#AADDFF"))
            activator?.start()
            Log.d(TAG, "AP Activator started")
        } catch (e: Exception) {
            Log.e(TAG, "Exception launching AP Mode activator", e)
            setStatus("? Exception launching AP mode: ${e.message}", Color.RED)
            resetButtons()
        }
    }

    private val pairingListener = object : IThingSmartActivatorListener {
        override fun onError(errorCode: String?, errorMsg: String?) {
            Log.e(TAG, "pairingListener onError. Code: $errorCode, Msg: $errorMsg")
            mainHandler.post {
                setStatus("? Pairing failed: $errorMsg ($errorCode)", Color.RED)
                resetButtons()
            }
        }
        override fun onActiveSuccess(devResp: DeviceBean?) {
            Log.d(TAG, "pairingListener onActiveSuccess. Device: ${devResp?.name} / ${devResp?.devId}")
            mainHandler.post {
                progressBar.visibility = View.GONE
                setStatus("? Device paired: ${devResp?.name ?: devResp?.devId ?: "Unknown"}", Color.parseColor("#66FF88"))
                showDoneButton()
            }
        }
        override fun onStep(step: String?, data: Any?) {
            Log.d(TAG, "pairingListener onStep. Step: $step")
            mainHandler.post { setStatus("? $step", Color.parseColor("#AADDFF")) }
        }
    }

    // --- Home helpers --------------------------------------------------------

    private fun getDefaultHomeId(callback: (Long) -> Unit) {
        Log.d(TAG, "Querying home list…")
        try {
            ThingHomeSdk.getHomeManagerInstance().queryHomeList(object : IThingGetHomeListCallback {
                override fun onSuccess(homeList: MutableList<HomeBean>?) {
                    Log.d(TAG, "queryHomeList onSuccess. Count: ${homeList?.size ?: 0}")
                    if (!homeList.isNullOrEmpty()) {
                        val homeId = homeList[0].homeId
                        Log.d(TAG, "Using existing HomeId: $homeId")
                        mainHandler.post { callback(homeId) }
                    } else {
                        Log.d(TAG, "Home list empty. Creating default home…")
                        createDefaultHome(callback)
                    }
                }
                override fun onError(code: String, msg: String) {
                    Log.e(TAG, "queryHomeList onError. Code: $code, Msg: $msg")
                    mainHandler.post { setStatus("? Home query failed ($code): $msg", Color.RED); resetButtons() }
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Exception querying home list", e)
            mainHandler.post { setStatus("? Exception querying home: ${e.message}", Color.RED); resetButtons() }
        }
    }

    private fun createDefaultHome(callback: (Long) -> Unit) {
        try {
            ThingHomeSdk.getHomeManagerInstance().createHome("My Home", 0.0, 0.0, "Home", emptyList(),
                object : IThingHomeResultCallback {
                    override fun onSuccess(bean: HomeBean?) {
                        val id = bean?.homeId ?: 0L
                        Log.d(TAG, "createHome onSuccess. HomeId: $id")
                        mainHandler.post {
                            if (id != 0L) callback(id)
                            else { setStatus("? Could not create home. Check Tuya credentials.", Color.RED); resetButtons() }
                        }
                    }
                    override fun onError(code: String, msg: String) {
                        Log.e(TAG, "createHome onError. Code: $code, Msg: $msg")
                        mainHandler.post { setStatus("? Create home failed ($code): $msg", Color.RED); resetButtons() }
                    }
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "Exception creating default home", e)
            mainHandler.post { setStatus("? Exception creating home: ${e.message}", Color.RED); resetButtons() }
        }
    }

    // --- UI helpers ----------------------------------------------------------

    private fun setStatus(msg: String, color: Int = Color.WHITE) { statusText.text = msg; statusText.setTextColor(color) }

    private fun resetButtons() {
        progressBar.visibility = View.GONE
        startButton.isEnabled = true; startButton.text = "Start Pairing"
        startButton.setOnClickListener { onStartPairing() }
    }

    private fun showDoneButton() {
        progressBar.visibility = View.GONE
        startButton.text = "Done"; startButton.isEnabled = true
        startButton.setOnClickListener { finishWithResult(true) }
    }

    private fun finishWithResult(success: Boolean) {
        Log.d(TAG, "finishWithResult called with success: $success")
        try { activator?.stop(); activator?.onDestroy() } catch (_: Exception) {}
        setResult(if (success) RESULT_OK else RESULT_CANCELED); finish()
    }

    private fun label(text: String) = TextView(this).apply {
        this.text = text; setTextColor(Color.parseColor("#CCCCEE")); textSize = 13f; setPadding(0, 0, 0, 6)
    }

    private fun spacer(dp: Int) = View(this).apply {
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, (dp * resources.displayMetrics.density).toInt())
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERM_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                fetchAndSetSsid()
            } else {
                setStatus("? Location permission required to auto-detect Wi-Fi SSID.", Color.YELLOW)
            }
        }
    }
}
