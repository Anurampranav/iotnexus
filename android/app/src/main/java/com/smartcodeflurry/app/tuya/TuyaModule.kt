package com.smartcodeflurry.app.tuya

import android.app.Application
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.smartcodeflurry.app.BuildConfig
import com.thingclips.smart.home.sdk.ThingHomeSdk

class TuyaModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "TuyaNativeModule"
        const val MODULE_NAME = "TuyaNativeModule"
        const val SDK_VERSION = "7.8.0"
        private var isInitialized = false
    }

    override fun getName(): String = MODULE_NAME

    override fun getConstants(): MutableMap<String, Any> {
        return mutableMapOf(
            "SDK_VERSION" to SDK_VERSION
        )
    }

    @ReactMethod
    fun initialize(options: ReadableMap?, promise: Promise) {
        try {
            val app = reactContext.applicationContext as Application
            val mainHandler = Handler(Looper.getMainLooper())

            mainHandler.post {
                try {
                    val appKey = if (options != null && options.hasKey("appKey")) options.getString("appKey") else null
                    val appSecret = if (options != null && options.hasKey("appSecret")) options.getString("appSecret") else null

                    if (!appKey.isNullOrEmpty() && !appSecret.isNullOrEmpty()) {
                        ThingHomeSdk.init(app, appKey, appSecret)
                    } else {
                        ThingHomeSdk.init(app)
                    }

                    ThingHomeSdk.setDebugMode(BuildConfig.DEBUG)
                    isInitialized = true

                    val response = Arguments.createMap().apply {
                        putBoolean("initialized", true)
                        putString("sdkVersion", SDK_VERSION)
                    }
                    promise.resolve(response)
                } catch (e: Exception) {
                    isInitialized = false
                    promise.reject("INIT_ERROR", "Failed to initialize Tuya SDK: ${e.message}", e)
                }
            }
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", "Error dispatching Tuya init: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        try {
            val response = Arguments.createMap().apply {
                putBoolean("initialized", isInitialized)
                putString("sdkVersion", SDK_VERSION)
            }
            promise.resolve(response)
        } catch (e: Exception) {
            promise.reject("STATUS_ERROR", "Failed to get Tuya SDK status: ${e.message}", e)
        }
    }

    @ReactMethod
    fun startDevicePairing(promise: Promise) {
        Log.d(TAG, "startDevicePairing called from JS")
        val activity = reactApplicationContext.currentActivity

        Handler(Looper.getMainLooper()).post {
            try {
                if (!isInitialized) {
                    try {
                        val app = reactContext.applicationContext as Application
                        ThingHomeSdk.init(app)
                        ThingHomeSdk.setDebugMode(BuildConfig.DEBUG)
                        isInitialized = true
                        Log.d(TAG, "ThingHomeSdk lazily initialized")
                    } catch (initErr: Exception) {
                        Log.e(TAG, "Lazy init error", initErr)
                    }
                }
                
                val intent = if (activity != null) {
                    Intent(activity, TuyaPairingActivity::class.java)
                } else {
                    Intent(reactApplicationContext, TuyaPairingActivity::class.java).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                }
                
                if (activity != null) {
                    activity.startActivity(intent)
                } else {
                    reactApplicationContext.startActivity(intent)
                }
                
                val response = Arguments.createMap().apply {
                    putBoolean("started", true)
                    putString("status", "PAIRING_LAUNCHED")
                }
                promise.resolve(response)
                Log.d(TAG, "TuyaPairingActivity launched successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Error launching TuyaPairingActivity", e)
                promise.reject("PAIRING_ERROR", "Failed to launch pairing UI: ${e.message}", e)
            }
        }
    }
}
