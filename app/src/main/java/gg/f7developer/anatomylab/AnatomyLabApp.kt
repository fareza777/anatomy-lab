package gg.f7developer.anatomylab

import android.app.Application
import android.webkit.WebView
import gg.f7developer.anatomylab.data.AppContainer

class AnatomyLabApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)
    }
}
