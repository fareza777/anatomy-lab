package gg.f7developer.anatomylab.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/** The three slab colours of the brand mark: vermilion, gold, teal (top, side, side). */
val SlabColors = listOf(
    Triple(Color(0xFFFF6A3D), Color(0xFFE2451F), Color(0xFFB8351A)),
    Triple(Color(0xFFFFD066), Color(0xFFE9A93A), Color(0xFFC2852A)),
    Triple(Color(0xFF43D3D6), Color(0xFF1FA6AC), Color(0xFF14797F)),
)

private fun polyOf(p: List<Offset>) = Path().apply {
    moveTo(p[0].x, p[0].y)
    for (i in 1 until p.size) lineTo(p[i].x, p[i].y)
    close()
}

/** One isometric slab: top rhombus with half-width [a], half-height [b], thickness [t]. */
fun DrawScope.isoSlab(c: Offset, a: Float, b: Float, t: Float, colors: Triple<Color, Color, Color>, alpha: Float = 1f, groove: Boolean = true) {
    val top = Offset(c.x, c.y - b); val r = Offset(c.x + a, c.y); val bt = Offset(c.x, c.y + b); val l = Offset(c.x - a, c.y)
    drawPath(polyOf(listOf(l, bt, Offset(bt.x, bt.y + t), Offset(l.x, l.y + t))), colors.second, alpha = alpha)
    drawPath(polyOf(listOf(bt, r, Offset(r.x, r.y + t), Offset(bt.x, bt.y + t))), colors.third, alpha = alpha)
    drawPath(polyOf(listOf(top, r, bt, l)), colors.first, alpha = alpha)
    if (groove) {
        val k = 0.62f
        fun s(p: Offset) = Offset(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k)
        drawPath(polyOf(listOf(s(top), s(r), s(bt), s(l))), Color.White, alpha = 0.45f * alpha, style = Stroke(width = a * 0.035f))
    }
}

/**
 * The Anatomy Lab mark: three slabs stacked with gaps, ringed by an orbit.
 * [explode] 0 = assembled, 1 = flung apart; [orbit] 0..1 draws the ring; [electron] is its angle.
 */
fun DrawScope.brandMark(center: Offset, unit: Float, explode: Float = 0f, orbit: Float = 1f, electron: Float = 0.6f, alpha: Float = 1f, ring: Color = Color(0xFFE8EEFF)) {
    val a = 20f * unit; val b = 11.55f * unit; val t = 6.5f * unit
    val gap = 14f * unit * (1f + explode * 1.4f)
    val ys = listOf(-gap, 0f, gap)
    val rx = 33f * unit; val ry = 10.5f * unit
    val rot = -24f
    fun ringPoint(deg: Float): Offset {
        val tt = deg / 180f * PI.toFloat(); val rr = rot / 180f * PI.toFloat()
        val x = rx * cos(tt); val y = ry * sin(tt)
        return Offset(center.x + x * cos(rr) - y * sin(rr), center.y + x * sin(rr) + y * cos(rr))
    }
    fun arc(from: Float, to: Float, w: Float, a2: Float) {
        if (orbit <= 0f) return
        val path = Path(); val n = 48
        val end = from + (to - from) * orbit
        for (i in 0..n) { val p = ringPoint(from + (end - from) * i / n); if (i == 0) path.moveTo(p.x, p.y) else path.lineTo(p.x, p.y) }
        drawPath(path, ring, alpha = a2 * alpha, style = Stroke(width = w, cap = StrokeCap.Round))
    }
    arc(180f, 360f, 1.6f * unit, 0.5f)
    for (i in 2 downTo 0) isoSlab(Offset(center.x, center.y + ys[i]), a, b, t, SlabColors[i], alpha)
    arc(0f, 180f, 2f * unit, 0.95f)
    if (orbit >= 1f) drawCircle(Color(0xFFFFF4D6), radius = 2.6f * unit, center = ringPoint(electron * 360f), alpha = alpha)
}

@Composable
fun BrandMark(modifier: Modifier = Modifier, explode: Float = 0f, orbit: Float = 1f, electron: Float = 0.1f, ring: Color = Color(0xFFE8EEFF)) {
    Canvas(modifier) { brandMark(Offset(size.width / 2, size.height / 2), size.minDimension / 80f, explode, orbit, electron, ring = ring) }
}

/** A toothed gear outline for decorative onboarding art. */
fun DrawScope.gear(center: Offset, r: Float, teeth: Int, angle: Float, color: Color, hub: Color) {
    val path = Path()
    val n = teeth * 4
    for (i in 0..n) {
        val tt = angle + i * (2 * PI.toFloat() / n)
        val rr = if ((i / 2) % 2 == 0) r else r * 0.86f
        val p = Offset(center.x + rr * cos(tt), center.y + rr * sin(tt) * 0.58f)
        if (i == 0) path.moveTo(p.x, p.y) else path.lineTo(p.x, p.y)
    }
    path.close()
    drawPath(path, color)
    drawOval(hub, topLeft = Offset(center.x - r * 0.3f, center.y - r * 0.3f * 0.58f), size = androidx.compose.ui.geometry.Size(r * 0.6f, r * 0.6f * 0.58f))
}

/** Subtle isometric grid used behind hero areas. */
fun DrawScope.isoGrid(color: Color, step: Float, phase: Float = 0f) {
    val slope = 0.577f
    var x = -size.height * 2 + (phase % step)
    while (x < size.width + size.height * 2) {
        drawLine(color, Offset(x, 0f), Offset(x + size.height / slope, size.height), strokeWidth = 1f)
        drawLine(color, Offset(x, size.height), Offset(x + size.height / slope, 0f), strokeWidth = 1f)
        x += step
    }
}

fun DrawScope.rotateAt(deg: Float, pivot: Offset, block: DrawScope.() -> Unit) = rotate(deg, pivot, block)
