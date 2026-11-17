package gg.f7developer.anatomylab.ads

import android.app.Activity
import android.content.Context
import android.util.Log
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.ump.ConsentDebugSettings
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import gg.f7developer.anatomylab.BuildConfig
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.atomic.AtomicBoolean

/**
 * One owner for every ad placement, so the policy lives in one place:
 *  - Banner: only in a reserved row under the lab, never over the figure, controls or navigation.
 *  - Interstitial: only at a natural break (leaving a lab after real use), at most once every
 *    3 minutes, never on the first lab of a session.
 *  - Rewarded: only when the user taps "Save poster" and chooses to watch.
 * No ad request is made before the UMP consent flow has finished.
 */
class AdsManager(private val context: Context) {

    private val initialized = AtomicBoolean(false)
    private var interstitial: InterstitialAd? = null
    private var rewarded: RewardedAd? = null
    private var loadingInterstitial = false
    private var loadingRewarded = false
    private var lastInterstitialAt = 0L
    private var labsLeft = 0

    @Volatile var adsRemoved: Boolean = false
        set(value) {
            field = value
            if (value) interstitial = null
        }

    private val _ready = MutableStateFlow(false)
    /** True once consent is resolved and the SDK may serve ads. */
    val ready: StateFlow<Boolean> = _ready.asStateFlow()

    private val _privacyRequired = MutableStateFlow(false)
    /** Whether a "Privacy options" entry must be offered in Settings (GDPR regions). */
    val privacyRequired: StateFlow<Boolean> = _privacyRequired.asStateFlow()

    fun initialize(activity: Activity) {
        if (initialized.get()) return
        val params = ConsentRequestParameters.Builder()
            .setTagForUnderAgeOfConsent(false)
            .apply {
                if (BuildConfig.DEBUG) {
                    setConsentDebugSettings(
                        ConsentDebugSettings.Builder(activity)
                            .setDebugGeography(ConsentDebugSettings.DebugGeography.DEBUG_GEOGRAPHY_EEA)
                            .build(),
                    )
                }
            }
            .build()
        val consent = UserMessagingPlatform.getConsentInformation(activity)
        consent.requestConsentInfoUpdate(activity, params, {
            UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { error ->
                if (error != null) Log.w(TAG, "Consent form: ${error.message}")
                afterConsent(consent)
            }
        }, { error ->
            Log.w(TAG, "Consent update failed: ${error.message}")
            afterConsent(consent)
        })
    }

    private fun afterConsent(consent: ConsentInformation) {
        _privacyRequired.value =
            consent.privacyOptionsRequirementStatus == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
        if (!consent.canRequestAds()) return
        if (!initialized.compareAndSet(false, true)) return
        MobileAds.initialize(context) {
            _ready.value = true
            preloadInterstitial()
            preloadRewarded()
        }
    }

    fun showPrivacyOptions(activity: Activity, onDone: (String?) -> Unit = {}) {
        UserMessagingPlatform.showPrivacyOptionsForm(activity) { error -> onDone(error?.message) }
    }

    fun bannerUnitId(): String = BuildConfig.ADMOB_BANNER

    // ---- interstitial -----------------------------------------------------------------------

    private fun preloadInterstitial() {
        if (adsRemoved || !_ready.value || loadingInterstitial || interstitial != null) return
        loadingInterstitial = true
        InterstitialAd.load(context, BuildConfig.ADMOB_INTERSTITIAL, AdRequest.Builder().build(),
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) { loadingInterstitial = false; interstitial = ad }
                override fun onAdFailedToLoad(error: LoadAdError) { loadingInterstitial = false; Log.w(TAG, "Interstitial: ${error.message}") }
            })
    }

    /** Call when the user leaves a lab. Shows an interstitial only when the policy allows. */
    fun onLeftLab(activity: Activity, secondsInLab: Long, then: () -> Unit) {
        labsLeft++
        val now = System.currentTimeMillis()
        val ad = interstitial
        val allowed = !adsRemoved && labsLeft >= 2 && secondsInLab >= 40 && now - lastInterstitialAt >= GAP_MS
        if (!allowed || ad == null) { preloadInterstitial(); then(); return }
        lastInterstitialAt = now
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() { interstitial = null; preloadInterstitial(); then() }
            override fun onAdFailedToShowFullScreenContent(error: AdError) { interstitial = null; preloadInterstitial(); then() }
        }
        ad.show(activity)
    }

    // ---- rewarded ---------------------------------------------------------------------------

    private fun preloadRewarded() {
        if (!_ready.value || loadingRewarded || rewarded != null) return
        loadingRewarded = true
        RewardedAd.load(context, BuildConfig.ADMOB_REWARDED, AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) { loadingRewarded = false; rewarded = ad }
                override fun onAdFailedToLoad(error: LoadAdError) { loadingRewarded = false; Log.w(TAG, "Rewarded: ${error.message}") }
            })
    }

    fun rewardedReady(): Boolean = rewarded != null

    fun showRewarded(activity: Activity, onReward: () -> Unit, onUnavailable: (String) -> Unit) {
        val ad = rewarded
        if (ad == null) {
            preloadRewarded()
            onUnavailable("No video is ready yet. Check your connection and try again in a moment.")
            return
        }
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() { rewarded = null; preloadRewarded() }
            override fun onAdFailedToShowFullScreenContent(error: AdError) { rewarded = null; preloadRewarded(); onUnavailable(error.message) }
        }
        ad.show(activity) { onReward() }
    }

    companion object {
        private const val TAG = "AnatomyAds"
        private const val GAP_MS = 180_000L
    }
}
