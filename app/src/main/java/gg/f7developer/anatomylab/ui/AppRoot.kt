package gg.f7developer.anatomylab.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import gg.f7developer.anatomylab.MainActivity
import gg.f7developer.anatomylab.data.AppContainer
import gg.f7developer.anatomylab.data.PrefsState
import gg.f7developer.anatomylab.data.ThemeChoice
import gg.f7developer.anatomylab.ui.screens.BrandSplash
import gg.f7developer.anatomylab.ui.screens.F7Splash
import gg.f7developer.anatomylab.ui.screens.MainScaffold
import gg.f7developer.anatomylab.ui.screens.OnboardingScreen
import gg.f7developer.anatomylab.ui.theme.AnatomyLabTheme
import kotlinx.coroutines.launch

private enum class Stage { BRAND, F7, ONBOARDING, MAIN }

@Composable
fun AppRoot(container: AppContainer, activity: MainActivity) {
    val prefs by container.prefs.state.collectAsStateWithLifecycle(PrefsState())
    val scope = rememberCoroutineScope()
    val systemDark = isSystemInDarkTheme()
    val dark = when (prefs.theme) {
        ThemeChoice.LIGHT -> false
        ThemeChoice.DARK -> true
        ThemeChoice.SYSTEM -> systemDark
    }
    var stage by rememberSaveable { mutableStateOf(Stage.BRAND) }

    LaunchedEffect(prefs.removeAds) { container.ads.adsRemoved = prefs.removeAds }
    // Consent and ads only start once the brand splashes are over, so no dialog covers them.
    LaunchedEffect(stage) {
        val splashing = stage == Stage.BRAND || stage == Stage.F7
        activity.setBarsDark(!splashing && !dark)
        if (!splashing) container.ads.initialize(activity)
    }
    LaunchedEffect(dark) { if (stage == Stage.ONBOARDING || stage == Stage.MAIN) activity.setBarsDark(!dark) }

    AnatomyLabTheme(dark = dark) {
        AnimatedContent(
            targetState = stage,
            transitionSpec = { fadeIn(androidx.compose.animation.core.tween(450)) togetherWith fadeOut(androidx.compose.animation.core.tween(350)) },
            label = "stage",
        ) { s ->
            when (s) {
                Stage.BRAND -> BrandSplash(onFinished = { stage = Stage.F7 })
                Stage.F7 -> F7Splash(onFinished = {
                    stage = if (prefs.loaded && !prefs.onboardingDone) Stage.ONBOARDING else Stage.MAIN
                })
                Stage.ONBOARDING -> OnboardingScreen(
                    dark = dark,
                    onTheme = { choice -> scope.launch { container.prefs.setTheme(choice) } },
                    onDone = {
                        scope.launch { container.prefs.setOnboardingDone(true) }
                        stage = Stage.MAIN
                    },
                )
                Stage.MAIN -> MainScaffold(container, activity, prefs, dark)
            }
        }
    }
}
