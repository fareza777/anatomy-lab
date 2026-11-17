package gg.f7developer.anatomylab.ui.screens

import android.widget.Toast
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
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Policy
import androidx.compose.material.icons.outlined.PrivacyTip
import androidx.compose.material.icons.outlined.Restore
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.StarRate
import androidx.compose.material.icons.outlined.Vibration
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import gg.f7developer.anatomylab.BuildConfig
import gg.f7developer.anatomylab.MainActivity
import gg.f7developer.anatomylab.data.AppContainer
import gg.f7developer.anatomylab.data.PrefsState
import gg.f7developer.anatomylab.data.ThemeChoice
import gg.f7developer.anatomylab.ui.components.BrandMark
import gg.f7developer.anatomylab.ui.theme.LocalLab
import gg.f7developer.anatomylab.util.Intents
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(container: AppContainer, activity: MainActivity, prefs: PrefsState, onAbout: () -> Unit) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val price by container.billing.price.collectAsStateWithLifecycle()
    val busy by container.billing.busy.collectAsStateWithLifecycle()
    val message by container.billing.message.collectAsStateWithLifecycle()
    val privacyRequired by container.ads.privacyRequired.collectAsStateWithLifecycle()
    LaunchedEffect(message) {
        message?.let { Toast.makeText(context, it, Toast.LENGTH_LONG).show(); container.billing.clearMessage() }
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        ScreenTitle("Settings", "Your lab, your way")

        Group("Appearance") {
            Text("Theme", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(start = 16.dp, top = 14.dp))
            Row(Modifier.padding(12.dp).fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surfaceVariant).padding(4.dp)) {
                ThemeChoice.entries.forEach { choice ->
                    val on = prefs.theme == choice
                    Text(
                        choice.name.lowercase().replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.labelLarge, textAlign = TextAlign.Center,
                        color = if (on) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f).clip(RoundedCornerShape(10.dp))
                            .background(if (on) MaterialTheme.colorScheme.primary else Color.Transparent)
                            .clickable { scope.launch { container.prefs.setTheme(choice) } }.padding(vertical = 11.dp),
                    )
                }
            }
            ToggleRow(Icons.Outlined.Vibration, "Haptics", "A light tick when you pick a part", prefs.haptics) { scope.launch { container.prefs.setHaptics(it) } }
        }

        PremiumCard(prefs.removeAds, price, busy, onBuy = { container.billing.purchase(activity) })

        Group("Purchases & privacy") {
            LinkRow(Icons.Outlined.Restore, "Restore purchases", "Already bought Remove Ads? Get it back here.") { container.billing.restore() }
            if (privacyRequired) LinkRow(Icons.Outlined.PrivacyTip, "Privacy options", "Review your ad consent choices") { container.ads.showPrivacyOptions(activity) }
            LinkRow(Icons.Outlined.Policy, "Privacy policy", null, trailing = Icons.AutoMirrored.Outlined.OpenInNew) { Intents.open(context, BuildConfig.PRIVACY_URL) }
        }

        Group("Anatomy Lab") {
            LinkRow(Icons.Outlined.StarRate, "Rate us", "Enjoying the lab? A review helps a lot.") { Intents.rate(activity) }
            LinkRow(Icons.Outlined.Share, "Share app", "Send Anatomy Lab to a curious friend") { Intents.shareApp(context) }
            LinkRow(Icons.Outlined.Info, "About", "Version ${BuildConfig.VERSION_NAME} · F7 Developer", onClick = onAbout)
        }
        TabBarSpacer()
    }
}

@Composable
private fun PremiumCard(owned: Boolean, price: String, busy: Boolean, onBuy: () -> Unit) {
    val primary = MaterialTheme.colorScheme.primary
    Column(
        Modifier.padding(16.dp).fillMaxWidth().clip(RoundedCornerShape(26.dp))
            .background(Brush.linearGradient(listOf(Color(0xFF1B2850), Color(0xFF0B1220))))
            .padding(20.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            BrandMark(Modifier.size(54.dp))
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(if (owned) "Ad-free lab" else "Remove ads", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                Text(if (owned) "THANK YOU FOR YOUR SUPPORT" else "ONE-TIME PURCHASE", style = MaterialTheme.typography.labelSmall, color = Color(0xFFFFB38F))
            }
            if (owned) Icon(Icons.Outlined.CheckCircle, null, tint = Color(0xFF6BE0A0), modifier = Modifier.size(30.dp))
        }
        Spacer(Modifier.height(12.dp))
        Text(
            if (owned) "Every banner, interstitial and video is switched off on this account, and posters export without a video."
            else "No banners, no interstitials, and every poster export is free. Pay once, keep it forever on your Google account.",
            style = MaterialTheme.typography.bodyMedium, color = Color(0xFFC9D3E6),
        )
        if (!owned) {
            Spacer(Modifier.height(16.dp))
            Text(
                if (busy) "Opening Google Play…" else "Remove ads · $price",
                style = MaterialTheme.typography.titleSmall, color = Color.White, textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(primary).clickable(enabled = !busy, onClick = onBuy).padding(vertical = 15.dp),
            )
        }
    }
}

@Composable
private fun Group(title: String, content: @Composable () -> Unit) {
    Text(title.uppercase(), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 24.dp, top = 18.dp, bottom = 8.dp))
    Column(
        Modifier.padding(horizontal = 16.dp).fillMaxWidth().clip(RoundedCornerShape(22.dp))
            .background(MaterialTheme.colorScheme.surface).border(1.dp, LocalLab.current.hairline, RoundedCornerShape(22.dp)),
    ) { content() }
}

@Composable
private fun LinkRow(icon: ImageVector, title: String, subtitle: String?, trailing: ImageVector? = null, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(38.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
            if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (trailing != null) Icon(trailing, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
    }
}

@Composable
private fun ToggleRow(icon: ImageVector, title: String, subtitle: String, on: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().clickable { onChange(!on) }.padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(38.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(on, onChange, colors = SwitchDefaults.colors(checkedTrackColor = MaterialTheme.colorScheme.primary))
    }
}

@Composable
fun AboutScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).statusBarsPadding().padding(bottom = 40.dp)) {
        IconButton(onClick = onBack, modifier = Modifier.padding(8.dp)) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back", tint = MaterialTheme.colorScheme.onBackground) }
        Column(Modifier.padding(horizontal = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            BrandMark(Modifier.size(140.dp))
            Spacer(Modifier.height(10.dp))
            Text("Anatomy Lab", style = MaterialTheme.typography.displayMedium, color = MaterialTheme.colorScheme.onBackground)
            Text("HOW THINGS WORK · v${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
        }
        Spacer(Modifier.height(24.dp))
        val paras = listOf(
            "Anatomy Lab is an interactive library of complex systems — machines, organs, factories and phenomena — drawn as precise isometric models you can run, pull apart and question.",
            "Every figure is driven by a physical model, so what you see moving and every number you read come from the same equations. Each system lists the assumptions behind it and the references it was checked against.",
            "Everything works offline. Your saved systems and settings stay on your device.",
        )
        paras.forEach {
            Text(it, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Justify, modifier = Modifier.padding(horizontal = 24.dp, vertical = 6.dp))
        }
        Spacer(Modifier.height(18.dp))
        Text("CREDITS", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 24.dp))
        Spacer(Modifier.height(8.dp))
        Credit("Made by F7 Developer", null) {}
        Credit("Figure engine: Anatomy by Ryan (MIT licence)", "github.com/wheresryan22/anatomy") { Intents.open(context, "https://github.com/wheresryan22/anatomy") }
        Credit("Typefaces: Space Grotesk and JetBrains Mono (SIL Open Font Licence)", null) {}
        Credit("Privacy policy", "Opens in your browser") { Intents.open(context, BuildConfig.PRIVACY_URL) }
    }
}

@Composable
private fun Credit(title: String, subtitle: String?, onClick: () -> Unit) {
    Column(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 24.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(title, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onBackground)
        if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
    }
}
