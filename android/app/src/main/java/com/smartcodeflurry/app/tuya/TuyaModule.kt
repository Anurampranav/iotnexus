package com.smartcodeflurry.app.tuya

import android.app.Application
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.smartcodeflurry.app.BuildConfig
import com.thingclips.smart.home.sdk.ThingHomeSdk
import com.thingclips.smart.api.router.UrlRouter

class TuyaModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
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
                        // Initialize using AndroidManifest meta-data if present
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
                    promise.reject("INIT_ERROR", "Failed to initialize Tuya SDK: ", e)
                }
            }
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", "Error dispatching Tuya init: ", e)
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
            promise.reject("STATUS_ERROR", "Failed to get Tuya SDK status: ", e)
        }
    }

    @ReactMethod
    fun startDevicePairing(promise: Promise) {
        try {
            val act = reactContext.currentActivity
            if (act == null) {
                promise.reject("ACTIVITY_ERROR", "Current activity is null")
                return
            }

            val mainHandler = Handler(Looper.getMainLooper())
            mainHandler.post {
                try {
                    UrlRouter.execute(act, "thingSmart://device_active")

                    val response = Arguments.createMap().apply {
                        putBoolean("started", true)
                        putString("status", "PAIRING_LAUNCHED")
                    }
                    promise.resolve(response)
                } catch (e: Exception) {
                    try {
                        UrlRouter.execute(act, "thingSmart://device_activator")

                        val response = Arguments.createMap().apply {
                            putBoolean("started", true)
                            putString("status", "PAIRING_LAUNCHED")
                        }
                        promise.resolve(response)
                    } catch (err: Exception) {
                        promise.reject("PAIRING_ERROR", "Failed to launch Tuya pairing UI: ", e)
                    }
                }
            }
        } catch (e: Exception) {
            promise.reject("PAIRING_ERROR", "Error launching Tuya device pairing: ", e)
        }
    }
}
