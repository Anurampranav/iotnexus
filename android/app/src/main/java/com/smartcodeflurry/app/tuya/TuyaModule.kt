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
import com.thingclips.smart.android.user.api.ILoginCallback
import com.thingclips.smart.android.user.bean.User
import com.thingclips.smart.home.sdk.ThingHomeSdk
import com.thingclips.smart.home.sdk.bean.HomeBean
import com.thingclips.smart.home.sdk.callback.IThingGetHomeListCallback
import com.thingclips.smart.home.sdk.callback.IThingHomeResultCallback

class TuyaModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "TuyaNativeModule"
        const val MODULE_NAME = "TuyaNativeModule"
        const val SDK_VERSION = "7.8.0"
        @Volatile
        private var isInitialized = false
    }

    override fun getName(): String = MODULE_NAME

    override fun getConstants(): MutableMap<String, Any> {
        return mutableMapOf(
            "SDK_VERSION" to SDK_VERSION
        )
    }

    private fun ensureSdkInitialized(): Boolean {
        if (!isInitialized) {
            val app = reactContext.applicationContext as Application
            return try {
                ThingHomeSdk.init(app, BuildConfig.TUYA_APP_KEY, BuildConfig.TUYA_APP_SECRET)
                ThingHomeSdk.setDebugMode(BuildConfig.DEBUG)
                isInitialized = true
                Log.d(TAG, "ThingHomeSdk successfully initialized")
                true
            } catch (e: Throwable) {
                isInitialized = false
                Log.e(TAG, "Failed to initialize Tuya SDK", e)
                false
            }
        }
        return true
    }

    @ReactMethod
    fun initialize(options: ReadableMap?, promise: Promise) {
        Handler(Looper.getMainLooper()).post {
            try {
                val app = reactContext.applicationContext as Application
                val appKey = if (options != null && options.hasKey("appKey") && !options.getString("appKey").isNullOrBlank()) {
                    options.getString("appKey")
                } else {
                    BuildConfig.TUYA_APP_KEY
                }

                val appSecret = if (options != null && options.hasKey("appSecret") && !options.getString("appSecret").isNullOrBlank()) {
                    options.getString("appSecret")
                } else {
                    BuildConfig.TUYA_APP_SECRET
                }

                if (appKey.isNullOrBlank() || appSecret.isNullOrBlank()) {
                    isInitialized = false
                    promise.reject("INIT_ERROR", "Tuya AppKey or AppSecret is missing or empty")
                    return@post
                }

                ThingHomeSdk.init(app, appKey, appSecret)
                ThingHomeSdk.setDebugMode(BuildConfig.DEBUG)
                isInitialized = true

                val response = Arguments.createMap().apply {
                    putBoolean("initialized", true)
                    putString("sdkVersion", SDK_VERSION)
                }
                promise.resolve(response)
            } catch (e: Throwable) {
                isInitialized = false
                Log.e(TAG, "Tuya SDK initialization exception", e)
                promise.reject("INIT_ERROR", "Failed to initialize Tuya SDK: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        try {
            val ready = ensureSdkInitialized()
            val response = Arguments.createMap().apply {
                putBoolean("initialized", ready)
                putString("sdkVersion", SDK_VERSION)
            }
            promise.resolve(response)
        } catch (e: Throwable) {
            promise.reject("STATUS_ERROR", "Failed to get Tuya SDK status: ${e.message}", e)
        }
    }

    @ReactMethod
    fun startDevicePairing(promise: Promise) {
        Log.d(TAG, "startDevicePairing called from JS")
        val activity = reactApplicationContext.currentActivity

        Handler(Looper.getMainLooper()).post {
            try {
                launchBizBundlePairing(activity, 0L, promise)
            } catch (e: Throwable) {
                Log.e(TAG, "Failed to launch device pairing", e)
                promise.reject("PAIRING_ERROR", "Failed to launch pairing screen: ${e.message}", e)
            }
        }
    }

    private fun resolveHomeAndLaunch(activity: android.app.Activity?, promise: Promise) {
        try {
            ThingHomeSdk.getHomeManagerInstance().queryHomeList(object : IThingGetHomeListCallback {
                override fun onSuccess(homeList: MutableList<HomeBean>?) {
                    val homeId = if (!homeList.isNullOrEmpty()) {
                        homeList[0].homeId
                    } else {
                        0L
                    }
                    
                    if (homeId != 0L) {
                        launchBizBundlePairing(activity, homeId, promise)
                    } else {
                        ThingHomeSdk.getHomeManagerInstance().createHome("Smart CodeFlurry Home", 0.0, 0.0, "Home", emptyList(),
                            object : IThingHomeResultCallback {
                                override fun onSuccess(bean: HomeBean?) {
                                    val newHomeId = bean?.homeId ?: 0L
                                    launchBizBundlePairing(activity, newHomeId, promise)
                                }
                                override fun onError(code: String, msg: String) {
                                    Log.w(TAG, "Failed creating home ($code: $msg), launching BizBundle default")
                                    launchBizBundlePairing(activity, 0L, promise)
                                }
                            }
                        )
                    }
                }

                override fun onError(code: String, msg: String) {
                    Log.w(TAG, "Home query notice ($code: $msg), launching BizBundle directly")
                    launchBizBundlePairing(activity, 0L, promise)
                }
            })
        } catch (e: Throwable) {
            Log.w(TAG, "Home resolution skipped: ${e.message}")
            launchBizBundlePairing(activity, 0L, promise)
        }
    }

    private fun launchBizBundlePairing(activity: android.app.Activity?, homeId: Long, promise: Promise) {
        try {
            val intent = if (activity != null) {
                Intent(activity, TuyaPairingActivity::class.java)
            } else {
                Intent(reactApplicationContext, TuyaPairingActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            if (homeId != 0L) {
                intent.putExtra("homeId", homeId)
            }
            
            if (activity != null) {
                activity.startActivity(intent)
            } else {
                reactApplicationContext.startActivity(intent)
            }
            
            val response = Arguments.createMap().apply {
                putBoolean("started", true)
                putString("mode", "NATIVE_ACTIVATOR")
                putString("status", "PAIRING_LAUNCHED")
            }
            promise.resolve(response)
            Log.d(TAG, "TuyaPairingActivity launched successfully")
        } catch (e: Throwable) {
            Log.e(TAG, "Failed to launch TuyaPairingActivity", e)
            promise.reject("LAUNCH_ERROR", "Failed to launch pairing activity: ${e.message}")
        }
    }
}