package com.smartcodeflurry.app

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Native Tuya SDK Bridge Package
          add(com.smartcodeflurry.app.tuya.TuyaPackage())
        }
    )
  }

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)

    // Initialize Tuya ThingHomeSdk at application startup
    try {
      com.thingclips.smart.home.sdk.ThingHomeSdk.init(this, BuildConfig.TUYA_APP_KEY, BuildConfig.TUYA_APP_SECRET)
      com.thingclips.smart.home.sdk.ThingHomeSdk.setDebugMode(BuildConfig.DEBUG)
      android.util.Log.d("MainApplication", "ThingHomeSdk successfully initialized in Application.onCreate")
    } catch (e: Throwable) {
      android.util.Log.e("MainApplication", "Failed to initialize ThingHomeSdk in Application.onCreate", e)
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
