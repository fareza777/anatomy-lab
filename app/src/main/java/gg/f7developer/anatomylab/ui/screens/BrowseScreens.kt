package gg.f7developer.anatomylab.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.util.lerp
import gg.f7developer.anatomylab.data.AppContainer
import gg.f7developer.anatomylab.data.PrefsState
import gg.f7developer.anatomylab.ui.components.BrandMark
import gg.f7developer.anatomylab.ui.components.CategoryTile
import gg.f7developer.anatomylab.ui.components.HeroCard
import gg.f7developer.anatomylab.ui.components.SectionHeader
import gg.f7developer.anatomylab.ui.components.SystemRow
import gg.f7developer.anatomylab.ui.components.SystemTile
import gg.f7developer.anatomylab.ui.components.categoryIcon
import gg.f7developer.anatomylab.ui.components.isoGrid
import gg.f7developer.anatomylab.ui.theme.LocalLab
import gg.f7developer.anatomylab.ui.theme.categoryColor
import kotlinx.coroutines.launch
import kotlin.math.absoluteValue

// ---- Home ---------------------------------------------------------------------------------------

@Composable
fun HomeScreen(
    container: AppContainer,
    prefs: PrefsState,
    dark: Boolean,
    openLab: (String) -> Unit,
    openCategory: (String) -> Unit,
    onSearch: () -> Unit,
) {
    val catalog = remember { container.catalog.catalog() }
    val featured = remember(catalog) { catalog.systems.filter { it.featured }.ifEmpty { catalog.systems } }
    val recent = prefs.recent.mapNotNull { id -> catalog.systems.firstOrNull { it.id == id } }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 8.dp)) {
        item { HomeHeader(onSearch) }
        item {
            val pager = rememberPagerState { featured.size }
            HorizontalPager(pager, contentPadding = PaddingValues(horizontal = 24.dp), pageSpacing = 14.dp) { page ->
                val offset = ((pager.currentPage - page) + pager.currentPageOffsetFraction).absoluteValue
                val s = system(featured, page)
                HeroCard(
                    s, catalog.categories.firstOrNull { it.id == s.category }, container.catalog, dark,
                    onOpen = { openLab(s.id) },
                    modifier = Modifier.graphicsLayer {
                        val f = 1f - offset.coerceIn(0f, 1f)
                        scaleX = lerp(0.92f, 1f, f); scaleY = scaleX; alpha = lerp(0.6f, 1f, f)
                    },
                )
            }
            Spacer(Modifier.height(12.dp))
            if (featured.size > 1) Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                repeat(featured.size) { i ->
                    Box(Modifier.padding(3.dp).size(if (i == pager.currentPage) 18.dp else 6.dp, 6.dp).clip(CircleShape).background(if (i == pager.currentPage) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline))
                }
            }
        }
        if (recent.isNotEmpty()) {
            item { Spacer(Modifier.height(26.dp)); SectionHeader("Continue exploring") ; Spacer(Modifier.height(12.dp)) }
            item {
                LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(recent, key = { "r-" + it.id }) { s -> SystemTile(s, container.catalog, dark, { openLab(s.id) }, width = 150.dp) }
                }
            }
        }
        item { Spacer(Modifier.height(26.dp)); SectionHeader("Shelves"); Spacer(Modifier.height(12.dp)) }
        item {
            LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(catalog.categories.filter { c -> catalog.systems.any { it.category == c.id } }, key = { it.id }) { c ->
                    val color = categoryColor(c.id)
                    Row(
                        Modifier.clip(RoundedCornerShape(50)).background(color.copy(alpha = 0.12f)).clickable { openCategory(c.id) }.padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(categoryIcon(c.id), null, tint = color, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(c.short, style = MaterialTheme.typography.labelLarge, color = color)
                    }
                }
            }
        }
        catalog.categories.forEach { c ->
            val list = catalog.systems.filter { it.category == c.id }
            if (list.isNotEmpty()) {
                item(key = "h-" + c.id) {
                    Spacer(Modifier.height(26.dp))
                    SectionHeader(c.title, categoryColor(c.id), action = "See all") { openCategory(c.id) }
                    Spacer(Modifier.height(12.dp))
                }
                item(key = "row-" + c.id) {
                    LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(list, key = { it.id }) { s -> SystemTile(s, container.catalog, dark, { openLab(s.id) }) }
                    }
                }
            }
        }
        item {
            Spacer(Modifier.height(28.dp))
            StatsCard(catalog.systems.size, catalog.systems.sumOf { it.parts.size }, catalog.systems.sumOf { it.steps.size })
            TabBarSpacer()
        }
    }
}

private fun system(list: List<gg.f7developer.anatomylab.data.LabSystem>, i: Int) = list[i.coerceIn(0, list.lastIndex)]

@Composable
private fun HomeHeader(onSearch: () -> Unit) {
    val lab = LocalLab.current
    Box(Modifier.fillMaxWidth()) {
        Canvas(Modifier.matchParentSize()) { isoGrid(Color(if (lab.dark) 0x0CFFFFFF else 0x0A000000), 30.dp.toPx()) }
        Column(Modifier.statusBarsPadding().padding(start = 20.dp, end = 12.dp, top = 10.dp, bottom = 18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                BrandMark(Modifier.size(44.dp))
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text("Anatomy Lab", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
                    Text("HOW THINGS WORK", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                }
                IconButton(onClick = onSearch) { Icon(Icons.Outlined.Search, "Search", tint = MaterialTheme.colorScheme.onBackground) }
            }
            Spacer(Modifier.height(18.dp))
            Text("Open up the machines\nthat run the world.", style = MaterialTheme.typography.displayMedium, color = MaterialTheme.colorScheme.onBackground)
        }
    }
}

@Composable
private fun StatsCard(systems: Int, parts: Int, steps: Int) {
    Row(
        Modifier.padding(horizontal = 20.dp).fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(MaterialTheme.colorScheme.surface)
            .border(1.dp, LocalLab.current.hairline, RoundedCornerShape(24.dp)).padding(vertical = 18.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        Stat("$systems", "systems", MaterialTheme.colorScheme.primary)
        Stat("$parts", "named parts", MaterialTheme.colorScheme.tertiary)
        Stat("$steps", "guided steps", MaterialTheme.colorScheme.secondary)
    }
}

@Composable
private fun Stat(value: String, label: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.headlineLarge, color = color)
        Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

// ---- Explore & category ----------------------------------------------------------------------

@Composable
fun ExploreScreen(container: AppContainer, openCategory: (String) -> Unit) {
    val catalog = remember { container.catalog.catalog() }
    LazyVerticalGrid(
        GridCells.Fixed(2), Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 120.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item(span = { GridItemSpan(2) }) { ScreenTitle("Explore", "Nine shelves, from cells to stars") }
        items(catalog.categories, key = { it.id }) { c ->
            CategoryTile(c, catalog.systems.count { it.category == c.id }, onOpen = { openCategory(c.id) })
        }
    }
}

@Composable
fun CategoryScreen(container: AppContainer, id: String, dark: Boolean, openLab: (String) -> Unit, onBack: () -> Unit) {
    val category = remember(id) { container.catalog.category(id) }
    val list = remember(id) { container.catalog.inCategory(id) }
    val color = categoryColor(id)
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 40.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Box(Modifier.fillMaxWidth().background(androidx.compose.ui.graphics.Brush.verticalGradient(listOf(color.copy(alpha = 0.22f), Color.Transparent)))) {
                Column(Modifier.statusBarsPadding().padding(start = 8.dp, end = 20.dp, top = 4.dp, bottom = 12.dp)) {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back", tint = MaterialTheme.colorScheme.onBackground) }
                    Column(Modifier.padding(start = 12.dp)) {
                        Box(Modifier.size(48.dp).clip(CircleShape).background(color), contentAlignment = Alignment.Center) { Icon(categoryIcon(id), null, tint = Color.White) }
                        Spacer(Modifier.height(14.dp))
                        Text(category?.title.orEmpty(), style = MaterialTheme.typography.displayMedium, color = MaterialTheme.colorScheme.onBackground)
                        Spacer(Modifier.height(6.dp))
                        Text(category?.blurb.orEmpty(), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        if (list.isEmpty()) item { EmptyState("Systems for this shelf are being built.", "Explore the other shelves in the meantime.") }
        items(list, key = { it.id }) { s -> Box(Modifier.padding(horizontal = 16.dp)) { SystemRow(s, container.catalog, dark, { openLab(s.id) }) } }
    }
}

// ---- Search ---------------------------------------------------------------------------------

@Composable
fun SearchScreen(container: AppContainer, dark: Boolean, openLab: (String) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    val results = remember(query) { container.catalog.search(query) }
    val catalog = remember { container.catalog.catalog() }
    val suggestions = remember(catalog) { catalog.systems.flatMap { it.tags }.groupingBy { it }.eachCount().entries.sortedByDescending { it.value }.take(14).map { it.key } }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 120.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { ScreenTitle("Search", "Systems, parts and ideas") }
        item {
            TextField(
                value = query, onValueChange = { query = it.take(60) },
                modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth().clip(RoundedCornerShape(18.dp)),
                placeholder = { Text("Try “piston”, “valve”, “heart”…") },
                leadingIcon = { Icon(Icons.Outlined.Search, null) },
                trailingIcon = { if (query.isNotEmpty()) IconButton(onClick = { query = "" }) { Icon(Icons.Outlined.Close, "Clear") } },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surface, unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent,
                ),
            )
        }
        if (query.isBlank()) {
            item {
                Text("POPULAR", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 20.dp))
                Spacer(Modifier.height(8.dp))
                FlowChips(suggestions) { query = it }
            }
        } else if (results.isEmpty()) {
            item { EmptyState("Nothing matches “$query”.", "Try a broader word, like a part name or a field of science.") }
        } else {
            item { Text("${results.size} RESULT${if (results.size == 1) "" else "S"}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 20.dp)) }
            items(results, key = { it.id }) { s -> Box(Modifier.padding(horizontal = 16.dp)) { SystemRow(s, container.catalog, dark, { openLab(s.id) }) } }
        }
    }
}

@Composable
private fun FlowChips(words: List<String>, onPick: (String) -> Unit) {
    androidx.compose.foundation.layout.FlowRow(
        Modifier.padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        words.forEach { w ->
            Text(
                w, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.clip(RoundedCornerShape(50)).background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, LocalLab.current.hairline, RoundedCornerShape(50)).clickable { onPick(w) }.padding(horizontal = 14.dp, vertical = 8.dp),
            )
        }
    }
}

// ---- Saved ----------------------------------------------------------------------------------

@Composable
fun SavedScreen(container: AppContainer, prefs: PrefsState, dark: Boolean, openLab: (String) -> Unit, onBrowse: () -> Unit) {
    val catalog = remember { container.catalog.catalog() }
    val saved = catalog.systems.filter { it.id in prefs.favorites }
    val scope = rememberCoroutineScope()
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 120.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { ScreenTitle("Saved", if (saved.isEmpty()) "Your bench is empty" else "${saved.size} on your bench") }
        if (saved.isEmpty()) {
            item {
                EmptyState("Tap the bookmark in any system to keep it here.", "Your saved systems stay on this device and work offline.")
                Spacer(Modifier.height(12.dp))
                Text("Browse shelves", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.padding(horizontal = 20.dp).clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.primary).clickable(onClick = onBrowse).padding(horizontal = 20.dp, vertical = 14.dp))
            }
        }
        items(saved, key = { it.id }) { s ->
            Box(Modifier.padding(horizontal = 16.dp)) {
                SystemRow(s, container.catalog, dark, { openLab(s.id) }) {
                    IconButton(onClick = { scope.launch { container.prefs.toggleFavorite(s.id) } }) {
                        Icon(Icons.Filled.Bookmark, "Remove from saved", tint = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }
}

// ---- shared ---------------------------------------------------------------------------------

@Composable
fun ScreenTitle(title: String, subtitle: String) {
    Column(Modifier.statusBarsPadding().padding(start = 20.dp, end = 20.dp, top = 18.dp, bottom = 8.dp)) {
        Text(title, style = MaterialTheme.typography.displayMedium, color = MaterialTheme.colorScheme.onBackground)
        Spacer(Modifier.height(4.dp))
        Text(subtitle.uppercase(), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
    }
}

@Composable
fun EmptyState(title: String, body: String) {
    Column(Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) {
        BrandMark(Modifier.size(96.dp), explode = 0.6f)
        Spacer(Modifier.height(12.dp))
        Text(title, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
        Spacer(Modifier.height(4.dp))
        Text(body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
