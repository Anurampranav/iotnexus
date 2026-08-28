package com.smartcodeflurry.app

import android.app.Application
import android.content.res.Configuration
import android.util.Log

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

import com.thingclips.smart.home.sdk.ThingHomeSdk

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

    // Explicitly initialize ThingHomeSdk at application startup
    try {
      ThingHomeSdk.init(this, "33vtgndn3d4vptmwhg3s", "k9xuvk3a4jryygp8yrxev8vg4f4v9wce")
      ThingHomeSdk.setDebugMode(BuildConfig.DEBUG)
      Log.d("MainApplication", "ThingHomeSdk initialized in Application.onCreate")
    } catch (e: Exception) {
      Log.e("MainApplication", "Failed to initialize ThingHomeSdk in Application.onCreate", e)
    }

    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
