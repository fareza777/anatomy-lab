package gg.f7developer.anatomylab.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import gg.f7developer.anatomylab.MainActivity
import gg.f7developer.anatomylab.data.AppContainer
import gg.f7developer.anatomylab.data.PrefsState
import gg.f7developer.anatomylab.ui.theme.LocalLab

private data class Tab(val route: String, val label: String, val on: ImageVector, val off: ImageVector)

private val TABS = listOf(
    Tab("home", "Home", Icons.Filled.Home, Icons.Outlined.Home),
    Tab("explore", "Explore", Icons.Filled.Explore, Icons.Outlined.Explore),
    Tab("search", "Search", Icons.Filled.Search, Icons.Outlined.Search),
    Tab("saved", "Saved", Icons.Filled.Bookmark, Icons.Outlined.BookmarkBorder),
    Tab("settings", "Settings", Icons.Filled.Tune, Icons.Outlined.Tune),
)

/** Navigation for the whole app after onboarding. Labs open full screen, without the tab bar. */
@Composable
fun MainScaffold(container: AppContainer, activity: MainActivity, prefs: PrefsState, dark: Boolean) {
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route ?: "home"
    val showBar = TABS.any { it.route == route }
    val openLab: (String) -> Unit = { id -> nav.navigate("lab/$id") }
    val openCategory: (String) -> Unit = { id -> nav.navigate("category/$id") }

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        NavHost(nav, startDestination = "home", modifier = Modifier.fillMaxSize()) {
            composable("home") { HomeScreen(container, prefs, dark, openLab, openCategory, onSearch = { nav.switchTab("search") }) }
            composable("explore") { ExploreScreen(container, openCategory) }
            composable("search") { SearchScreen(container, dark, openLab) }
            composable("saved") { SavedScreen(container, prefs, dark, openLab, onBrowse = { nav.switchTab("explore") }) }
            composable("settings") { SettingsScreen(container, activity, prefs, onAbout = { nav.navigate("about") }) }
            composable("about") { AboutScreen(onBack = { nav.popBackStack() }) }
            composable("category/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { back ->
                CategoryScreen(container, back.arguments?.getString("id").orEmpty(), dark, openLab, onBack = { nav.popBackStack() })
            }
            composable("lab/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) { back ->
                LabScreen(container, activity, prefs, back.arguments?.getString("id").orEmpty(), dark, onBack = { nav.popBackStack() })
            }
        }
        AnimatedVisibility(
            visible = showBar,
            enter = slideInVertically { it } + fadeIn(),
            exit = slideOutVertically { it } + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter),
        ) {
            // fade the content out under the bar and the system navigation buttons
            val bg = MaterialTheme.colorScheme.background
            Box(Modifier.background(androidx.compose.ui.graphics.Brush.verticalGradient(0f to bg.copy(alpha = 0f), 0.45f to bg.copy(alpha = 0.85f), 1f to bg))) {
                FloatingTabBar(route) { nav.switchTab(it) }
            }
        }
    }
}

private fun NavHostController.switchTab(route: String) {
    navigate(route) {
        popUpTo("home") { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

@Composable
private fun FloatingTabBar(current: String, onSelect: (String) -> Unit) {
    val lab = LocalLab.current
    Row(
        Modifier
            .navigationBarsPadding()
            .padding(horizontal = 16.dp, vertical = 10.dp)
            .fillMaxWidth()
            .shadow(18.dp, RoundedCornerShape(26.dp), ambientColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f), spotColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.25f))
            .clip(RoundedCornerShape(26.dp))
            .background(lab.glass)
            .border(1.dp, lab.hairline, RoundedCornerShape(26.dp))
            .padding(6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TABS.forEach { tab ->
            val selected = tab.route == current
            val pad by animateDpAsState(if (selected) 14.dp else 10.dp, label = "pad")
            Row(
                Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(if (selected) MaterialTheme.colorScheme.primary else androidx.compose.ui.graphics.Color.Transparent)
                    .clickable(remember { MutableInteractionSource() }, null) { onSelect(tab.route) }
                    .padding(horizontal = pad, vertical = 11.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(if (selected) tab.on else tab.off, tab.label, tint = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(22.dp))
                AnimatedVisibility(selected, enter = expandHorizontally() + fadeIn(), exit = shrinkHorizontally() + fadeOut()) {
                    Row {
                        Spacer(Modifier.width(6.dp))
                        Text(tab.label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onPrimary)
                    }
                }
            }
        }
    }
}

/** Space reserved at the bottom of tab screens so content scrolls clear of the floating bar. */
@Composable
fun TabBarSpacer() = Spacer(Modifier.navigationBarsPadding().height(96.dp))
