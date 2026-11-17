package gg.f7developer.anatomylab.data

import android.content.Context
import gg.f7developer.anatomylab.ads.AdsManager
import gg.f7developer.anatomylab.billing.BillingManager

/** Hand-wired singletons; the app is small enough not to need a DI framework. */
class AppContainer(context: Context) {
    val appContext: Context = context.applicationContext
    val prefs = Prefs(appContext)
    val catalog = CatalogRepository(appContext)
    val ads = AdsManager(appContext)
    val billing = BillingManager(appContext, prefs)
}
