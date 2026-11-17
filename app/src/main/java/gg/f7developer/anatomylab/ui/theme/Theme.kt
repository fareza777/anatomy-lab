package gg.f7developer.anatomylab.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import gg.f7developer.anatomylab.R

// ---- fonts ------------------------------------------------------------------------------------
@OptIn(androidx.compose.ui.text.ExperimentalTextApi::class)
private fun grotesk(w: Int) = Font(R.font.space_grotesk, FontWeight(w), variationSettings = FontVariation.Settings(FontVariation.weight(w)))
@OptIn(androidx.compose.ui.text.ExperimentalTextApi::class)
private fun mono(w: Int) = Font(R.font.jetbrains_mono, FontWeight(w), variationSettings = FontVariation.Settings(FontVariation.weight(w)))
val Display = FontFamily(grotesk(400), grotesk(500), grotesk(600), grotesk(700))
val Mono = FontFamily(mono(400), mono(500), mono(600), mono(700))

private val AppTypography = Typography(
    displayLarge = TextStyle(fontFamily = Display, fontWeight = FontWeight.Bold, fontSize = 44.sp, lineHeight = 46.sp, letterSpacing = (-0.03).em),
    displayMedium = TextStyle(fontFamily = Display, fontWeight = FontWeight.Bold, fontSize = 34.sp, lineHeight = 38.sp, letterSpacing = (-0.025).em),
    headlineLarge = TextStyle(fontFamily = Display, fontWeight = FontWeight.SemiBold, fontSize = 28.sp, lineHeight = 32.sp, letterSpacing = (-0.02).em),
    headlineMedium = TextStyle(fontFamily = Display, fontWeight = FontWeight.SemiBold, fontSize = 23.sp, lineHeight = 28.sp, letterSpacing = (-0.015).em),
    headlineSmall = TextStyle(fontFamily = Display, fontWeight = FontWeight.SemiBold, fontSize = 19.sp, lineHeight = 24.sp, letterSpacing = (-0.01).em),
    titleLarge = TextStyle(fontFamily = Display, fontWeight = FontWeight.SemiBold, fontSize = 18.sp, lineHeight = 23.sp),
    titleMedium = TextStyle(fontFamily = Display, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 21.sp),
    titleSmall = TextStyle(fontFamily = Display, fontWeight = FontWeight.Medium, fontSize = 14.sp, lineHeight = 19.sp),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 25.sp),
    bodyMedium = TextStyle(fontSize = 14.5.sp, lineHeight = 22.sp),
    bodySmall = TextStyle(fontSize = 12.5.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontFamily = Mono, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, letterSpacing = 0.08.em),
    labelMedium = TextStyle(fontFamily = Mono, fontWeight = FontWeight.Medium, fontSize = 11.sp, letterSpacing = 0.1.em),
    labelSmall = TextStyle(fontFamily = Mono, fontWeight = FontWeight.Medium, fontSize = 9.5.sp, letterSpacing = 0.12.em),
)

// ---- colours ----------------------------------------------------------------------------------
val Vermilion = Color(0xFFE8461A)
val VermilionDark = Color(0xFFFF7A45)
val Gold = Color(0xFFE9A93A)
val Teal = Color(0xFF0F8597)
val Ink = Color(0xFF12161F)

private val Light = lightColorScheme(
    primary = Vermilion, onPrimary = Color.White,
    primaryContainer = Color(0xFFFFE3D8), onPrimaryContainer = Color(0xFF5A1600),
    secondary = Teal, onSecondary = Color.White,
    secondaryContainer = Color(0xFFD4F1F4), onSecondaryContainer = Color(0xFF00363D),
    tertiary = Gold, onTertiary = Ink,
    background = Color(0xFFEEF1F5), onBackground = Ink,
    surface = Color(0xFFFFFFFF), onSurface = Ink,
    surfaceVariant = Color(0xFFF4F6F9), onSurfaceVariant = Color(0xFF5B6475),
    surfaceContainer = Color(0xFFF7F8FA), surfaceContainerHigh = Color(0xFFEFF2F6),
    outline = Color(0xFFD5DBE5), outlineVariant = Color(0xFFE5E9EF),
)

private val Dark = darkColorScheme(
    primary = VermilionDark, onPrimary = Color(0xFF2A0A00),
    primaryContainer = Color(0xFF4A1A08), onPrimaryContainer = Color(0xFFFFDBCC),
    secondary = Color(0xFF3CC8D8), onSecondary = Color(0xFF00363D),
    secondaryContainer = Color(0xFF0E3B44), onSecondaryContainer = Color(0xFFBFF3F8),
    tertiary = Color(0xFFF5C04A), onTertiary = Color(0xFF2A1C00),
    background = Color(0xFF070A10), onBackground = Color(0xFFEEF2F8),
    surface = Color(0xFF0E1420), onSurface = Color(0xFFEEF2F8),
    surfaceVariant = Color(0xFF141C2B), onSurfaceVariant = Color(0xFF9AA6BA),
    surfaceContainer = Color(0xFF111827), surfaceContainerHigh = Color(0xFF172033),
    outline = Color(0xFF263044), outlineVariant = Color(0xFF1C2536),
)

/** Each shelf of the library has its own hue, used for glows, chips and accents. */
fun categoryColor(id: String): Color = when (id) {
    "biology" -> Color(0xFFE5484D)
    "physics" -> Color(0xFF7C5CE0)
    "nature" -> Color(0xFF30A46C)
    "technology" -> Color(0xFF0091FF)
    "engineering" -> Color(0xFFF76B15)
    "chemistry" -> Color(0xFF12A594)
    "space" -> Color(0xFF3E63DD)
    "everyday" -> Color(0xFFE2A72E)
    "making" -> Color(0xFFD6409F)
    else -> Vermilion
}

@Immutable
data class LabColors(val dark: Boolean, val glass: Color, val hairline: Color, val glow: Color)

val LocalLab = staticCompositionLocalOf { LabColors(false, Color.White, Color.LightGray, Vermilion) }

@Composable
fun AnatomyLabTheme(dark: Boolean, content: @Composable () -> Unit) {
    val scheme: ColorScheme = if (dark) Dark else Light
    val lab = if (dark) LabColors(true, Color(0xCC0E1420), Color(0x22FFFFFF), VermilionDark)
    else LabColors(false, Color(0xD9FFFFFF), Color(0x14000000), Vermilion)
    androidx.compose.runtime.CompositionLocalProvider(LocalLab provides lab) {
        MaterialTheme(colorScheme = scheme, typography = AppTypography, content = content)
    }
}
