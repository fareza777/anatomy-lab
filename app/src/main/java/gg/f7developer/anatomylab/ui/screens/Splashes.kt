package gg.f7developer.anatomylab.ui.screens

import android.net.Uri
import android.widget.FrameLayout
import android.widget.VideoView
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import gg.f7developer.anatomylab.R
import gg.f7developer.anatomylab.ui.components.brandMark
import gg.f7developer.anatomylab.ui.components.isoGrid
import gg.f7developer.anatomylab.ui.theme.Display
import gg.f7developer.anatomylab.ui.theme.Mono
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.delay

private val SplashBg = Color(0xFF0B1220)

/** Splash 1: the Anatomy Lab mark assembles from an exploded view, then the wordmark rises. */
@Composable
fun BrandSplash(onFinished: () -> Unit) {
    val explode = remember { Animatable(1f) }
    val orbit = remember { Animatable(0f) }
    val electron = remember { Animatable(0f) }
    val word = remember { Animatable(0f) }
    val grid = remember { Animatable(0f) }
    val done by rememberUpdatedState(onFinished)
    LaunchedEffect(Unit) {
        listOf(
            async { grid.animateTo(1f, tween(900)) },
            async { explode.animateTo(0f, tween(1100, easing = FastOutSlowInEasing)) },
            async { delay(500); orbit.animateTo(1f, tween(700, easing = FastOutSlowInEasing)) },
            async { delay(900); electron.animateTo(1.6f, tween(1500, easing = LinearEasing)) },
            async { delay(1000); word.animateTo(1f, tween(650, easing = FastOutSlowInEasing)) },
        ).awaitAll()
        delay(250)
        done()
    }
    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.radialGradient(listOf(Color(0xFF22355F), SplashBg), radius = 1400f))
            .clickable(remember { MutableInteractionSource() }, null) { done() },
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.fillMaxSize().alpha(grid.value * 0.9f)) { isoGrid(Color(0x14FFFFFF), 46.dp.toPx()) }
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Canvas(Modifier.size(220.dp)) {
                brandMark(Offset(size.width / 2, size.height / 2), size.minDimension / 80f, explode.value, orbit.value, 0.1f + electron.value)
            }
            Spacer(Modifier.height(18.dp))
            Text(
                "Anatomy Lab",
                fontFamily = Display, fontSize = 40.sp, letterSpacing = (-0.03).em, color = Color.White,
                modifier = Modifier.graphicsLayer { alpha = word.value; translationY = (1f - word.value) * 24.dp.toPx() },
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "HOW THINGS WORK",
                fontFamily = Mono, fontSize = 12.sp, letterSpacing = 0.32.em, color = Color(0xFFFFB38F), textAlign = TextAlign.Center,
                modifier = Modifier.graphicsLayer { alpha = word.value * word.value },
            )
        }
    }
}

/** Splash 2: the F7 Developer ident video. Tap to skip; never blocks on an error. */
@Composable
fun F7Splash(onFinished: () -> Unit) {
    val context = LocalContext.current
    val done by rememberUpdatedState(onFinished)
    val finished = remember { booleanArrayOf(false) }
    val finish = { if (!finished[0]) { finished[0] = true; done() } }
    LaunchedEffect(Unit) { delay(5_500); finish() }
    Box(
        Modifier
            .fillMaxSize()
            .background(Color(0xFF07060C))
            .clickable(remember { MutableInteractionSource() }, null) { finish() },
        contentAlignment = Alignment.Center,
    ) {
        AndroidView(
            factory = { ctx ->
                FrameLayout(ctx).apply {
                    setBackgroundColor(0xFF07060C.toInt())
                    val video = VideoView(ctx)
                    addView(video, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT, android.view.Gravity.CENTER))
                    video.setVideoURI(Uri.parse("android.resource://${context.packageName}/${R.raw.f7_splash}"))
                    video.setOnPreparedListener { mp -> mp.setVolume(0.6f, 0.6f) }
                    video.setOnCompletionListener { finish() }
                    video.setOnErrorListener { _, _, _ -> finish(); true }
                    video.start()
                }
            },
            modifier = Modifier.fillMaxSize(),
            onRelease = { (it.getChildAt(0) as? VideoView)?.stopPlayback() },
        )
    }
    DisposableEffect(Unit) { onDispose { finished[0] = true } }
}
