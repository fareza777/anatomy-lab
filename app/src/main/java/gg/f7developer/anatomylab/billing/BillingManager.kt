package gg.f7developer.anatomylab.billing

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import gg.f7developer.anatomylab.data.Prefs
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * "Remove Ads" is a one-time, non-consumable product. The price label comes from Google Play;
 * $4.99 is only the fallback until product details load.
 */
class BillingManager(private val context: Context, private val prefs: Prefs) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var details: ProductDetails? = null
    private var client: BillingClient? = null

    private val _price = MutableStateFlow("$4.99")
    val price: StateFlow<String> = _price.asStateFlow()
    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy.asStateFlow()
    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    fun clearMessage() { _message.value = null }

    private val purchasesUpdated = PurchasesUpdatedListener { result, purchases ->
        _busy.value = false
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> purchases?.forEach { handlePurchase(it, announce = true) }
            BillingClient.BillingResponseCode.USER_CANCELED -> Unit
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> restore(announce = true)
            else -> _message.value = friendlyError(result)
        }
    }

    fun start() {
        if (client != null) return
        val billing = BillingClient.newBuilder(context)
            .setListener(purchasesUpdated)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build()
        client = billing
        billing.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    queryDetails()
                    restore(announce = false)
                } else {
                    Log.w(TAG, "Billing setup: ${result.debugMessage}")
                }
            }
            override fun onBillingServiceDisconnected() = Unit
        })
    }

    private fun queryDetails() {
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(listOf(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(PRODUCT_ID)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build(),
            ))
            .build()
        client?.queryProductDetailsAsync(params) { result, productDetails ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                details = productDetails.productDetailsList.firstOrNull()
                details?.oneTimePurchaseOfferDetails?.formattedPrice?.let { _price.value = it }
            } else {
                Log.w(TAG, "Product details: ${result.debugMessage}")
            }
        }
    }

    fun purchase(activity: Activity) {
        val billing = client
        val product = details
        if (billing == null || !billing.isReady) {
            _message.value = "Google Play Billing isn't available right now. Check that the Play Store is signed in."
            return
        }
        if (product == null) {
            _message.value = "Remove Ads isn't available yet. Please try again later."
            queryDetails()
            return
        }
        _busy.value = true
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(
                BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).build(),
            ))
            .build()
        val response = billing.launchBillingFlow(activity, params)
        if (response.responseCode != BillingClient.BillingResponseCode.OK) {
            _busy.value = false
            _message.value = friendlyError(response)
        }
    }

    fun restore(announce: Boolean = true) {
        val billing = client
        if (billing == null || !billing.isReady) {
            if (announce) _message.value = "Couldn't reach Google Play. Try again when you're online."
            return
        }
        billing.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
        ) { result, purchases ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                if (announce) _message.value = friendlyError(result)
                return@queryPurchasesAsync
            }
            val owned = purchases.filter { it.products.contains(PRODUCT_ID) && it.purchaseState == Purchase.PurchaseState.PURCHASED }
            owned.forEach { handlePurchase(it, announce = false) }
            if (owned.isEmpty()) scope.launch { prefs.setRemoveAds(false) }
            if (announce) _message.value = if (owned.isNotEmpty()) "Purchase restored. Ads are off — thank you!" else "No previous purchase found on this Google account."
        }
    }

    private fun handlePurchase(purchase: Purchase, announce: Boolean) {
        if (!purchase.products.contains(PRODUCT_ID)) return
        if (purchase.purchaseState == Purchase.PurchaseState.PENDING) {
            if (announce) _message.value = "Your payment is pending. Ads will switch off once it completes."
            return
        }
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) return
        scope.launch { prefs.setRemoveAds(true) }
        if (announce) _message.value = "Ads removed. Thank you for supporting Anatomy Lab!"
        if (!purchase.isAcknowledged) {
            val ack = AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.purchaseToken).build()
            client?.acknowledgePurchase(ack) { result ->
                if (result.responseCode != BillingClient.BillingResponseCode.OK) Log.w(TAG, "Acknowledge: ${result.debugMessage}")
            }
        }
    }

    private fun friendlyError(result: BillingResult): String = when (result.responseCode) {
        BillingClient.BillingResponseCode.BILLING_UNAVAILABLE -> "Google Play Billing is unavailable. Update the Play Store and try again."
        BillingClient.BillingResponseCode.ITEM_UNAVAILABLE -> "Remove Ads isn't available in your region yet."
        BillingClient.BillingResponseCode.NETWORK_ERROR -> "Network error. Check your connection and try again."
        BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE,
        BillingClient.BillingResponseCode.SERVICE_DISCONNECTED -> "Google Play is busy. Please try again."
        else -> "The purchase couldn't be completed (code ${result.responseCode})."
    }

    companion object {
        const val PRODUCT_ID = "anatomylab_remove_ads"
        private const val TAG = "AnatomyBilling"
    }
}
