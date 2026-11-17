package gg.f7developer.anatomylab.ui.screens

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.Typeface
import android.os.Handler
import android.os.Looper
import android.view.HapticFeedbackConstants
import android.view.PixelCopy
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.MoreVert
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.webkit.WebViewAssetLoader
import gg.f7developer.anatomylab.MainActivity
import gg.f7developer.anatomylab.ads.BannerAdRow
import gg.f7developer.anatomylab.data.AppContainer
import gg.f7developer.anatomylab.data.LabSystem
import gg.f7developer.anatomylab.data.PrefsState
import gg.f7developer.anatomylab.ui.components.BrandMark
import gg.f7developer.anatomylab.ui.theme.LocalLab
import gg.f7developer.anatomylab.ui.theme.categoryColor
import gg.f7developer.anatomylab.util.Intents
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

private const val ASSET_HOST = "appassets.androidplatform.net"

/** Bridge the lab pages call through window.AnatomyNative. Every call hops to the main thread. */
class LabBridge(private val onReady: () -> Unit, private val onPick: (String) -> Unit, private val onStep: (Int) -> Unit) {
    private val main = Handler(Looper.getMainLooper())
    @JavascriptInterface fun ready() { main.post(onReady) }
    @JavascriptInterface fun onPick(name: String) { main.post { onPick(name.take(80)) } }
    @JavascriptInterface fun onStep(index: Int) { main.post { onStep(index) } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LabScreen(container: AppContainer, activity: MainActivity, prefs: PrefsState, id: String, dark: Boolean, onBack: () -> Unit) {
    val system = remember(id) { container.catalog.system(id) }
    if (system == null) {
        Column(Modifier.fillMaxSize().statusBarsPadding()) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back") }
            EmptyState("This system isn't available.", "It may have been renamed in an update. Go back to browse the library.")
        }
        return
    }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val openedAt = remember { System.currentTimeMillis() }
    var ready by remember(dark) { mutableStateOf(false) }
    var showInfo by remember { mutableStateOf(false) }
    var menu by remember { mutableStateOf(false) }
    var posterAsk by remember { mutableStateOf(false) }
    var webRef by remember { mutableStateOf<WebView?>(null) }
    val color = categoryColor(system.category)
    val pageBg = if (dark) 0xFF070A10.toInt() else 0xFFEEF1F5.toInt()

    LaunchedEffect(id) { container.prefs.markOpened(id) }

    val leave = { container.ads.onLeftLab(activity, (System.currentTimeMillis() - openedAt) / 1000) { onBack() } }
    BackHandler { leave() }

    // Pause the figure (and its animation loop) whenever the app is in the background.
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(lifecycle, webRef) {
        val observer = LifecycleEventObserver { _, event ->
            val web = webRef ?: return@LifecycleEventObserver
            when (event) {
                Lifecycle.Event.ON_PAUSE -> { web.evaluateJavascript("window.Lab&&Lab.setPaused(true)", null); web.onPause() }
                Lifecycle.Event.ON_RESUME -> { web.onResume(); web.evaluateJavascript("window.Lab&&Lab.setPaused(false)", null) }
                else -> Unit
            }
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer) }
    }

    val sharePoster = { exportPoster(activity, webRef, system, dark) { msg -> Toast.makeText(context, msg, Toast.LENGTH_LONG).show() } }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // ---- top bar ----
        Row(Modifier.statusBarsPadding().fillMaxWidth().padding(horizontal = 4.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = leave) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back", tint = MaterialTheme.colorScheme.onBackground) }
            Column(Modifier.weight(1f)) {
                Text(system.title, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text((container.catalog.category(system.category)?.short ?: "").uppercase(), style = MaterialTheme.typography.labelSmall, color = color)
            }
            val fav = system.id in prefs.favorites
            IconButton(onClick = { scope.launch { container.prefs.toggleFavorite(system.id) } }) {
                Icon(if (fav) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder, if (fav) "Remove from saved" else "Save", tint = if (fav) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onBackground)
            }
            IconButton(onClick = { showInfo = true }) { Icon(Icons.Outlined.Info, "About this system", tint = MaterialTheme.colorScheme.onBackground) }
            Box {
                IconButton(onClick = { menu = true }) { Icon(Icons.Outlined.MoreVert, "More", tint = MaterialTheme.colorScheme.onBackground) }
                DropdownMenu(menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(text = { Text("Share") }, leadingIcon = { Icon(Icons.Outlined.Share, null) }, onClick = { menu = false; Intents.shareSystem(context, system.title) })
                    DropdownMenuItem(text = { Text("Share as poster") }, leadingIcon = { Icon(Icons.Outlined.Image, null) }, onClick = {
                        menu = false
                        if (prefs.removeAds || prefs.posterUntil > System.currentTimeMillis()) sharePoster() else posterAsk = true
                    })
                }
            }
        }
        // ---- the lab page ----
        Box(Modifier.weight(1f).fillMaxWidth()) {
            key(id, dark) {
                LabWebView(
                    url = "https://$ASSET_HOST/assets/labs/${system.id}/${if (dark) "dark" else "light"}.html",
                    background = pageBg,
                    onCreated = { webRef = it },
                    bridge = LabBridge(
                        onReady = { ready = true },
                        onPick = { if (prefs.haptics) webRef?.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK) },
                        onStep = { if (prefs.haptics) webRef?.performHapticFeedback(HapticFeedbackConstants.CONTEXT_CLICK) },
                    ),
                )
            }
            androidx.compose.animation.AnimatedVisibility(visible = !ready, exit = fadeOut(tween(400))) { LabLoading(color) }
        }
        BannerAdRow(container.ads, enabled = !prefs.removeAds, modifier = Modifier.navigationBarsPadding())
        if (prefs.removeAds) Spacer(Modifier.navigationBarsPadding())
    }

    if (showInfo) {
        ModalBottomSheet(onDismissRequest = { showInfo = false }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = MaterialTheme.colorScheme.surface) {
            InfoSheet(system, color)
        }
    }
    if (posterAsk) {
        AlertDialog(
            onDismissRequest = { posterAsk = false },
            title = { Text("Share a poster") },
            text = { Text("Watch a short video to unlock poster sharing for 24 hours, or remove ads to share posters any time.") },
            confirmButton = {
                TextButton(onClick = {
                    posterAsk = false
                    container.ads.showRewarded(activity,
                        onReward = { scope.launch { container.prefs.setPosterUntil(System.currentTimeMillis() + 24 * 3600_000L) }; sharePoster() },
                        onUnavailable = { Toast.makeText(context, it, Toast.LENGTH_LONG).show() })
                }) { Text("Watch video") }
            },
            dismissButton = { TextButton(onClick = { posterAsk = false }) { Text("Not now") } },
        )
    }
}

@SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
@Composable
private fun LabWebView(url: String, background: Int, bridge: LabBridge, onCreated: (WebView) -> Unit) {
    AndroidView(
        factory = { ctx ->
            val loader = WebViewAssetLoader.Builder()
                .setDomain(ASSET_HOST)
                .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(ctx))
                .build()
            WebView(ctx).apply {
                setBackgroundColor(background)
                isVerticalScrollBarEnabled = false
                overScrollMode = WebView.OVER_SCROLL_NEVER
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.allowFileAccess = false
                settings.allowContentAccess = false
                settings.mediaPlaybackRequiresUserGesture = true
                settings.setSupportZoom(false)
                settings.offscreenPreRaster = true
                addJavascriptInterface(bridge, "AnatomyNative")
                webViewClient = object : WebViewClient() {
                    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? = loader.shouldInterceptRequest(request.url)
                    // Lab pages are self-contained; nothing may navigate away from the bundled assets.
                    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = request.url.host != ASSET_HOST
                }
                loadUrl(url)
                onCreated(this)
            }
        },
        onRelease = { it.stopLoading(); it.removeJavascriptInterface("AnatomyNative"); it.destroy() },
        modifier = Modifier.fillMaxSize(),
    )
}

@Composable
private fun LabLoading(color: androidx.compose.ui.graphics.Color) {
    val t = rememberInfiniteTransition(label = "load")
    val e by t.animateFloat(0f, 1f, infiniteRepeatable(tween(1600, easing = LinearEasing)), label = "e")
    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            BrandMark(Modifier.size(120.dp), explode = 0.5f + 0.5f * kotlin.math.sin(e * 6.283f), electron = e)
            Spacer(Modifier.height(12.dp))
            Text("ASSEMBLING…", style = MaterialTheme.typography.labelMedium, color = color)
        }
    }
}

@Composable
private fun InfoSheet(system: LabSystem, color: androidx.compose.ui.graphics.Color) {
    var tab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Overview", "Parts", "Numbers", "Sources")
    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).navigationBarsPadding()) {
        Text(system.title, style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.onSurface)
        Text(system.subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(14.dp))
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surfaceVariant).padding(4.dp)) {
            tabs.forEachIndexed { i, label ->
                Text(label, style = MaterialTheme.typography.labelMedium, textAlign = TextAlign.Center,
                    color = if (tab == i) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f).clip(RoundedCornerShape(10.dp)).background(if (tab == i) color else androidx.compose.ui.graphics.Color.Transparent).clickable { tab = i }.padding(vertical = 10.dp))
            }
        }
        Spacer(Modifier.height(14.dp))
        Column(Modifier.height(440.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            when (tab) {
                0 -> system.overview.forEach { Text(it, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.Justify) }
                1 -> system.parts.forEachIndexed { i, p ->
                    Row {
                        Box(Modifier.size(26.dp).clip(CircleShape).background(color.copy(alpha = 0.14f)), contentAlignment = Alignment.Center) {
                            Text("${i + 1}", style = MaterialTheme.typography.labelSmall, color = color)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(p.name, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
                            Text(p.role, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                2 -> {
                    system.facts.forEach { f ->
                        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).border(1.dp, LocalLab.current.hairline, RoundedCornerShape(14.dp)).padding(12.dp)) {
                            Text(f.label.uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(f.value, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }
                else -> {
                    if (system.accuracy.isNotBlank()) {
                        Text("HOW ACCURATE IS THIS?", style = MaterialTheme.typography.labelMedium, color = color)
                        Text(system.accuracy, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.Justify)
                    }
                    Text("REFERENCES", style = MaterialTheme.typography.labelMedium, color = color)
                    system.sources.forEach { Text("• $it", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

/**
 * Capture the figure card exactly as it is on screen (WebGL included) with PixelCopy, frame it
 * as a branded poster, and hand it to the share sheet. No storage permission is needed.
 */
private fun exportPoster(activity: MainActivity, web: WebView?, system: LabSystem, dark: Boolean, toast: (String) -> Unit) {
    if (web == null) { toast("The figure isn't ready yet."); return }
    web.evaluateJavascript("(()=>{const r=document.querySelector('.iso-plate').getBoundingClientRect();return JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height})})()") { raw ->
        val r = runCatching { JSONObject(JSONObject("{\"v\":$raw}").getString("v")) }.getOrNull()
        if (r == null) { toast("Couldn't find the figure to capture."); return@evaluateJavascript }
        val density = web.resources.displayMetrics.density
        val loc = IntArray(2).also { web.getLocationInWindow(it) }
        val rect = Rect(
            (loc[0] + r.getDouble("x") * density).toInt(), (loc[1] + r.getDouble("y") * density).toInt(),
            (loc[0] + (r.getDouble("x") + r.getDouble("w")) * density).toInt(), (loc[1] + (r.getDouble("y") + r.getDouble("h")) * density).toInt(),
        )
        if (rect.width() <= 0 || rect.height() <= 0) { toast("Scroll the figure into view first."); return@evaluateJavascript }
        val shot = Bitmap.createBitmap(rect.width(), rect.height(), Bitmap.Config.ARGB_8888)
        PixelCopy.request(activity.window, rect, shot, { result ->
            if (result != PixelCopy.SUCCESS) { toast("Capture failed. Please try again."); return@request }
            runCatching {
                val poster = framePoster(shot, system, dark)
                val dir = File(activity.cacheDir, "posters").apply { mkdirs() }
                val file = File(dir, "anatomy-lab-${system.id}.png")
                FileOutputStream(file).use { poster.compress(Bitmap.CompressFormat.PNG, 100, it) }
                val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.files", file)
                val send = android.content.Intent(android.content.Intent.ACTION_SEND).setType("image/png")
                    .putExtra(android.content.Intent.EXTRA_STREAM, uri)
                    .putExtra(android.content.Intent.EXTRA_TEXT, "${system.title} — made in Anatomy Lab")
                    .addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                activity.startActivity(android.content.Intent.createChooser(send, "Share poster"))
            }.onFailure { toast("Couldn't create the poster: ${it.message}") }
        }, Handler(Looper.getMainLooper()))
    }
}

private fun framePoster(shot: Bitmap, system: LabSystem, dark: Boolean): Bitmap {
    val pad = (shot.width * 0.06f).toInt()
    val head = (shot.width * 0.2f).toInt()
    val foot = (shot.width * 0.12f).toInt()
    val out = Bitmap.createBitmap(shot.width + pad * 2, shot.height + head + foot + pad, Bitmap.Config.ARGB_8888)
    val c = Canvas(out)
    val bg = if (dark) 0xFF070A10.toInt() else 0xFFEEF1F5.toInt()
    val ink = if (dark) 0xFFEEF2F8.toInt() else 0xFF12161F.toInt()
    val accent = categoryColor(system.category).toArgb()
    c.drawColor(bg)
    val title = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ink; textSize = shot.width * 0.075f; typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD) }
    val sub = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = accent; textSize = shot.width * 0.032f; typeface = Typeface.MONOSPACE; letterSpacing = 0.12f }
    c.drawText(system.subtitle.uppercase().take(48), pad.toFloat(), head * 0.42f, sub)
    c.drawText(system.title, pad.toFloat(), head * 0.82f, title)
    c.drawBitmap(shot, pad.toFloat(), head.toFloat(), null)
    val brand = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ink; alpha = 170; textSize = shot.width * 0.034f; typeface = Typeface.MONOSPACE; letterSpacing = 0.14f }
    c.drawText("ANATOMY LAB · HOW THINGS WORK", pad.toFloat(), (head + shot.height + foot * 0.62f), brand)
    return out
}
