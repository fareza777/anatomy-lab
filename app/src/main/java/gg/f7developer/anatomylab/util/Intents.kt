package gg.f7developer.anatomylab.util

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import com.google.android.play.core.review.ReviewManagerFactory

object Intents {
    private fun storeUrl(context: Context) = "https://play.google.com/store/apps/details?id=${context.packageName}"

    fun shareApp(context: Context) {
        val text = "I've been exploring how things work in Anatomy Lab — engines, hearts and factories you can open up and run. ${storeUrl(context)}"
        context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), "Share Anatomy Lab"))
    }

    fun shareSystem(context: Context, title: String) {
        val text = "Look inside: $title, in Anatomy Lab. ${storeUrl(context)}"
        context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), "Share $title"))
    }

    /** Google Play in-app review first; the store page if the flow is unavailable. */
    fun rate(activity: Activity) {
        val manager = ReviewManagerFactory.create(activity)
        manager.requestReviewFlow().addOnCompleteListener { task ->
            if (task.isSuccessful) manager.launchReviewFlow(activity, task.result)
            else openStore(activity)
        }
    }

    fun openStore(context: Context) {
        val market = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=${context.packageName}"))
        try { context.startActivity(market) } catch (_: ActivityNotFoundException) { open(context, storeUrl(context)) }
    }

    fun open(context: Context, url: String) {
        try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
        catch (_: ActivityNotFoundException) { Toast.makeText(context, "No browser is available to open this link.", Toast.LENGTH_SHORT).show() }
    }
}
