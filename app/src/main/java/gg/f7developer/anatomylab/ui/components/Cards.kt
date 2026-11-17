package gg.f7developer.anatomylab.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Biotech
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Factory
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Memory
import androidx.compose.material.icons.outlined.Park
import androidx.compose.material.icons.outlined.PrecisionManufacturing
import androidx.compose.material.icons.outlined.RocketLaunch
import androidx.compose.material.icons.outlined.Science
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import gg.f7developer.anatomylab.data.CatalogRepository
import gg.f7developer.anatomylab.data.Category
import gg.f7developer.anatomylab.data.LabSystem
import gg.f7developer.anatomylab.ui.theme.LocalLab
import gg.f7developer.anatomylab.ui.theme.categoryColor

fun categoryIcon(id: String): ImageVector = when (id) {
    "biology" -> Icons.Outlined.Biotech
    "physics" -> Icons.Outlined.Bolt
    "nature" -> Icons.Outlined.Park
    "technology" -> Icons.Outlined.Memory
    "engineering" -> Icons.Outlined.PrecisionManufacturing
    "chemistry" -> Icons.Outlined.Science
    "space" -> Icons.Outlined.RocketLaunch
    "everyday" -> Icons.Outlined.Home
    "making" -> Icons.Outlined.Factory
    else -> Icons.Outlined.Science
}

/** A soft scale-down on press, the app's one tactile response for every card. */
@Composable
fun Modifier.pressable(onClick: () -> Unit): Modifier {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val s by animateFloatAsState(if (pressed) 0.965f else 1f, spring(dampingRatio = 0.6f, stiffness = 600f), label = "press")
    return this.scale(s).clickable(interactionSource = source, indication = null, onClick = onClick)
}

@Composable
fun rememberThumb(repo: CatalogRepository, id: String, dark: Boolean): ImageBitmap? {
    val bmp by produceState<ImageBitmap?>(null, id, dark) { value = repo.thumbnail(id, dark)?.asImageBitmap() }
    return bmp
}

/** The figure on a studio spotlight tinted by its category. */
@Composable
fun Spotlight(color: Color, modifier: Modifier = Modifier, content: @Composable androidx.compose.foundation.layout.BoxScope.() -> Unit) {
    val lab = LocalLab.current
    val base = MaterialTheme.colorScheme.surface
    Box(
        modifier.background(
            Brush.radialGradient(
                listOf(color.copy(alpha = if (lab.dark) 0.34f else 0.16f), base.copy(alpha = 0f)),
                radius = 900f,
            ),
        ),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.fillMaxSize()) { isoGrid(color.copy(alpha = if (lab.dark) 0.07f else 0.06f), 34.dp.toPx()) }
        content()
    }
}

@Composable
fun MetaChip(text: String, color: Color = MaterialTheme.colorScheme.onSurfaceVariant) {
    Text(
        text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = color,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(color.copy(alpha = 0.1f))
            .padding(horizontal = 8.dp, vertical = 4.dp),
    )
}

@Composable
fun HeroCard(system: LabSystem, category: Category?, repo: CatalogRepository, dark: Boolean, onOpen: () -> Unit, modifier: Modifier = Modifier) {
    val color = categoryColor(system.category)
    val thumb = rememberThumb(repo, system.id, dark)
    Column(
        modifier
            .pressable(onOpen)
            .clip(RoundedCornerShape(28.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, LocalLab.current.hairline, RoundedCornerShape(28.dp)),
    ) {
        Spotlight(color, Modifier.fillMaxWidth().aspectRatio(1.25f)) {
            if (thumb != null) Image(thumb, system.title, Modifier.fillMaxSize().padding(10.dp), contentScale = ContentScale.Fit)
            Row(Modifier.align(Alignment.TopStart).padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(categoryIcon(system.category), null, tint = color, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text((category?.short ?: "").uppercase(), style = MaterialTheme.typography.labelMedium, color = color)
            }
        }
        Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 14.dp, bottom = 20.dp)) {
            Text(system.title, style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(4.dp))
            Text(system.subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                MetaChip("${system.minutes} min", color)
                if (system.difficulty.isNotBlank()) MetaChip(system.difficulty)
                MetaChip("${system.steps.size} steps")
                MetaChip("${system.parts.size} parts")
            }
        }
    }
}

@Composable
fun SystemTile(system: LabSystem, repo: CatalogRepository, dark: Boolean, onOpen: () -> Unit, modifier: Modifier = Modifier, width: Dp = 178.dp) {
    val color = categoryColor(system.category)
    val thumb = rememberThumb(repo, system.id, dark)
    Column(
        modifier
            .width(width)
            .pressable(onOpen)
            .clip(RoundedCornerShape(22.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, LocalLab.current.hairline, RoundedCornerShape(22.dp)),
    ) {
        Spotlight(color, Modifier.fillMaxWidth().aspectRatio(1f)) {
            if (thumb != null) Image(thumb, system.title, Modifier.fillMaxSize().padding(6.dp), contentScale = ContentScale.Fit)
        }
        Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
            Text(system.title, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(2.dp))
            Text(system.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
fun SystemRow(system: LabSystem, repo: CatalogRepository, dark: Boolean, onOpen: () -> Unit, trailing: @Composable () -> Unit = {}) {
    val color = categoryColor(system.category)
    val thumb = rememberThumb(repo, system.id, dark)
    Row(
        Modifier
            .fillMaxWidth()
            .pressable(onOpen)
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, LocalLab.current.hairline, RoundedCornerShape(20.dp))
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Spotlight(color, Modifier.size(84.dp).clip(RoundedCornerShape(14.dp))) {
            if (thumb != null) Image(thumb, null, Modifier.fillMaxSize().padding(2.dp), contentScale = ContentScale.Fit)
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(system.title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(2.dp))
            Text(system.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(6.dp))
            MetaChip("${system.minutes} min · ${system.steps.size} steps", color)
        }
        trailing()
    }
}

@Composable
fun CategoryTile(category: Category, count: Int, onOpen: () -> Unit, modifier: Modifier = Modifier) {
    val color = categoryColor(category.id)
    val lab = LocalLab.current
    Box(
        modifier
            .pressable(onOpen)
            .clip(RoundedCornerShape(24.dp))
            .background(Brush.linearGradient(listOf(color.copy(alpha = if (lab.dark) 0.32f else 0.16f), MaterialTheme.colorScheme.surface), start = Offset.Zero, end = Offset(600f, 600f)))
            .border(1.dp, color.copy(alpha = 0.25f), RoundedCornerShape(24.dp))
            .padding(16.dp),
    ) {
        Column {
            Box(Modifier.size(42.dp).clip(CircleShape).background(color), contentAlignment = Alignment.Center) {
                Icon(categoryIcon(category.id), null, tint = Color.White, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.height(18.dp))
            Text(category.title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 2)
            Spacer(Modifier.height(4.dp))
            Text(category.blurb, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(10.dp))
            Text(if (count == 1) "1 SYSTEM" else "$count SYSTEMS", style = MaterialTheme.typography.labelSmall, color = color, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun SectionHeader(title: String, color: Color = MaterialTheme.colorScheme.primary, action: String? = null, onAction: () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(8.dp).clip(CircleShape).background(color))
        Spacer(Modifier.width(10.dp))
        Text(title, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
        if (action != null) {
            Text(action.uppercase(), style = MaterialTheme.typography.labelMedium, color = color, modifier = Modifier.clip(RoundedCornerShape(50)).clickable(onClick = onAction).padding(horizontal = 10.dp, vertical = 6.dp))
        }
    }
}
