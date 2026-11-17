package gg.f7developer.anatomylab.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import gg.f7developer.anatomylab.data.ThemeChoice
import gg.f7developer.anatomylab.ui.components.SlabColors
import gg.f7developer.anatomylab.ui.components.brandMark
import gg.f7developer.anatomylab.ui.components.gear
import gg.f7developer.anatomylab.ui.components.isoGrid
import gg.f7developer.anatomylab.ui.components.isoSlab
import gg.f7developer.anatomylab.ui.theme.LocalLab
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.sin

private data class Page(val kicker: String, val title: String, val body: String)

private val PAGES = listOf(
    Page("Look inside", "See how everything works", "Engines, hearts, factories and planets, drawn as living machines you can open up. Every part is real, and every part moves."),
    Page("Touch to explore", "Drag it. Pull it apart.", "Turn a crank with your finger, switch to X-ray, explode the assembly, or tap any part to learn its name and its job."),
    Page("Real science", "Numbers you can trust", "Each system runs on a physical model. Slide a control and the pressure, speed and flow update the way the real thing would."),
    Page("Your lab", "Choose your bench light", "Bright paper for daytime or a dark studio for night. You can change it any time in Settings."),
)

@Composable
fun OnboardingScreen(dark: Boolean, onTheme: (ThemeChoice) -> Unit, onDone: () -> Unit) {
    val pager = rememberPagerState { PAGES.size }
    val scope = rememberCoroutineScope()
    val lab = LocalLab.current
    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .navigationBarsPadding(),
    ) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("ANATOMY LAB", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(start = 12.dp).weight(1f))
            // keep the slot on the last page so the header does not jump
            val canSkip = pager.currentPage < PAGES.lastIndex
            TextButton(onClick = onDone, enabled = canSkip, modifier = Modifier.alpha(if (canSkip) 1f else 0f)) { Text("Skip", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
        HorizontalPager(pager, Modifier.weight(1f)) { index ->
            val page = PAGES[index]
            Column(Modifier.fillMaxSize().padding(horizontal = 24.dp)) {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .clip(RoundedCornerShape(32.dp))
                        .background(Brush.radialGradient(listOf(MaterialTheme.colorScheme.primary.copy(alpha = if (lab.dark) 0.22f else 0.12f), MaterialTheme.colorScheme.surface), radius = 900f))
                        .border(1.dp, lab.hairline, RoundedCornerShape(32.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Canvas(Modifier.fillMaxSize()) { isoGrid(Color(if (lab.dark) 0x10FFFFFF else 0x0F000000), 32.dp.toPx()) }
                    when (index) {
                        0 -> ExplodeArt()
                        1 -> DragArt()
                        2 -> GraphArt()
                        else -> ThemeArt(dark, onTheme)
                    }
                }
                Spacer(Modifier.height(24.dp))
                Text(page.kicker.uppercase(), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.height(8.dp))
                Text(page.title, style = MaterialTheme.typography.displayMedium, color = MaterialTheme.colorScheme.onBackground)
                Spacer(Modifier.height(10.dp))
                Text(page.body, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Justify)
                Spacer(Modifier.height(8.dp))
            }
        }
        Row(Modifier.fillMaxWidth().padding(24.dp), verticalAlignment = Alignment.CenterVertically) {
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                repeat(PAGES.size) { i ->
                    val w by animateFloatAsState(if (pager.currentPage == i) 26f else 8f, label = "dot")
                    val c by animateColorAsState(if (pager.currentPage == i) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline, label = "dotc")
                    Box(Modifier.height(8.dp).width(w.dp).clip(CircleShape).background(c))
                }
            }
            val last = pager.currentPage == PAGES.lastIndex
            Button(
                onClick = { if (last) onDone() else scope.launch { pager.animateScrollToPage(pager.currentPage + 1) } },
                shape = RoundedCornerShape(18.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 26.dp, vertical = 16.dp),
            ) { Text(if (last) "Start exploring" else "Next", style = MaterialTheme.typography.titleSmall) }
        }
    }
}

@Composable
private fun ExplodeArt() {
    val LocalLabDark = LocalLab.current.dark
    val t = rememberInfiniteTransition(label = "explode")
    val phase by t.animateFloat(0f, 1f, infiniteRepeatable(tween(4200, easing = LinearEasing)), label = "p")
    val e = (sin(phase * 2 * PI).toFloat() * 0.5f + 0.5f)
    val ease = e * e * (3 - 2 * e)
    Canvas(Modifier.fillMaxWidth(0.82f).aspectRatio(1f)) {
        brandMark(Offset(size.width / 2, size.height / 2), size.minDimension / 128f, explode = ease, orbit = 1f, electron = phase, ring = if (LocalLabDark) Color(0xFFE8EEFF) else Color(0xFF3E63DD))
    }
}

@Composable
private fun DragArt() {
    var angle by remember { mutableFloatStateOf(0f) }
    var spin by remember { mutableFloatStateOf(0f) }
    val t = rememberInfiniteTransition(label = "drag")
    val idle by t.animateFloat(0f, 1f, infiniteRepeatable(tween(2600), RepeatMode.Reverse), label = "i")
    val lab = LocalLab.current
    Box(Modifier.fillMaxSize().pointerInput(Unit) {
        detectDragGestures { _, d -> angle += d.x / 60f; spin = d.x }
    }, contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxWidth(0.86f).aspectRatio(1f)) {
            val c = Offset(size.width / 2, size.height / 2)
            val r = size.minDimension * 0.2f
            val a = angle + idle * 0.6f
            // centres sit one pitch-radius sum apart (in the iso plane) so the teeth mesh
            gear(Offset(c.x - r * 0.75f, c.y - r * 0.1f), r, 14, a, SlabColors[1].second, SlabColors[1].third)
            gear(Offset(c.x + r * 0.61f, c.y + r * 0.27f), r * 0.62f, 9, -a * 14f / 9f + 0.2f, SlabColors[0].first, SlabColors[0].third)
            gear(Offset(c.x - r * 0.27f, c.y - r * 0.86f), r * 0.5f, 7, -a * 2f, SlabColors[2].first, SlabColors[2].third)
            // finger hint
            val fx = c.x - r + idle * r * 2
            drawCircle(if (lab.dark) Color.White else Color(0xFF12161F), radius = r * 0.16f, center = Offset(fx, c.y + r * 1.55f), alpha = 0.18f)
            drawCircle(if (lab.dark) Color.White else Color(0xFF12161F), radius = r * 0.09f, center = Offset(fx, c.y + r * 1.55f), alpha = 0.55f)
        }
    }
}

@Composable
private fun GraphArt() {
    val t = rememberInfiniteTransition(label = "graph")
    val p by t.animateFloat(0f, 1f, infiniteRepeatable(tween(3000, easing = LinearEasing)), label = "g")
    val ink = MaterialTheme.colorScheme.onSurface
    val accent = MaterialTheme.colorScheme.primary
    val teal = MaterialTheme.colorScheme.secondary
    Canvas(Modifier.fillMaxWidth(0.82f).aspectRatio(1.2f)) {
        val w = size.width; val h = size.height
        for (i in 0..4) drawLine(ink.copy(alpha = 0.08f), Offset(0f, h * i / 4), Offset(w, h * i / 4), 1.5f)
        fun curve(f: (Float) -> Float, color: Color, upto: Float) {
            val path = Path(); val n = 120
            for (i in 0..(n * upto).toInt()) { val x = i / n.toFloat(); val y = f(x); val pt = Offset(x * w, h * (0.9f - 0.8f * y)); if (i == 0) path.moveTo(pt.x, pt.y) else path.lineTo(pt.x, pt.y) }
            drawPath(path, color, style = Stroke(width = 5f, cap = StrokeCap.Round))
        }
        val pressure = { x: Float -> exp(-((x - 0.42f) * 6f) * ((x - 0.42f) * 6f)) * 0.95f + 0.04f }
        val flow = { x: Float -> 0.35f + 0.3f * sin(x * 2 * PI.toFloat() * 2f) }
        curve(flow, teal, 1f)
        curve(pressure, accent, p)
        val x = p; val y = pressure(x)
        drawCircle(accent, 12f, Offset(x * w, h * (0.9f - 0.8f * y)))
        drawCircle(Color.White, 5f, Offset(x * w, h * (0.9f - 0.8f * y)))
    }
}

@Composable
private fun ThemeArt(dark: Boolean, onTheme: (ThemeChoice) -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Canvas(Modifier.size(150.dp)) {
            val c = Offset(size.width / 2, size.height / 2)
            val u = size.minDimension / 70f
            for (i in 2 downTo 0) isoSlab(Offset(c.x, c.y + (i - 1) * 16 * u), 20 * u, 11.55f * u, 6.5f * u, SlabColors[i])
        }
        Spacer(Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ThemeOption("Light", Icons.Outlined.LightMode, selected = !dark, preview = Color(0xFFF2F4F7)) { onTheme(ThemeChoice.LIGHT) }
            ThemeOption("Dark", Icons.Outlined.DarkMode, selected = dark, preview = Color(0xFF0E1420)) { onTheme(ThemeChoice.DARK) }
        }
    }
}

@Composable
private fun ThemeOption(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, selected: Boolean, preview: Color, onClick: () -> Unit) {
    val border = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
    Column(
        Modifier
            .clip(RoundedCornerShape(20.dp))
            .border(if (selected) 2.dp else 1.dp, border, RoundedCornerShape(20.dp))
            .clickable(onClick = onClick)
            .padding(10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.size(width = 96.dp, height = 64.dp).clip(RoundedCornerShape(12.dp)).background(preview), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = if (preview.red > 0.5f) Color(0xFF12161F) else Color.White)
        }
        Spacer(Modifier.height(8.dp))
        Text(label, style = MaterialTheme.typography.labelLarge, color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

