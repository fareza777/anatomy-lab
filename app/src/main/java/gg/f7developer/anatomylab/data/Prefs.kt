package gg.f7developer.anatomylab.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "anatomylab_prefs")

enum class ThemeChoice { LIGHT, DARK, SYSTEM }

data class PrefsState(
    val theme: ThemeChoice = ThemeChoice.LIGHT,
    val favorites: Set<String> = emptySet(),
    val recent: List<String> = emptyList(),
    val onboardingDone: Boolean = false,
    val removeAds: Boolean = false,
    val posterUntil: Long = 0L,
    val haptics: Boolean = true,
    val loaded: Boolean = false,
)

class Prefs(private val context: Context) {

    private object Keys {
        val theme = stringPreferencesKey("theme")
        val favorites = stringSetPreferencesKey("favorites")
        val recent = stringPreferencesKey("recent")
        val onboarding = booleanPreferencesKey("onboarding_done")
        val removeAds = booleanPreferencesKey("remove_ads")
        val posterUntil = longPreferencesKey("poster_until")
        val haptics = booleanPreferencesKey("haptics")
    }

    val state: Flow<PrefsState> = context.dataStore.data.map { p ->
        PrefsState(
            theme = runCatching { ThemeChoice.valueOf(p[Keys.theme] ?: "LIGHT") }.getOrDefault(ThemeChoice.LIGHT),
            favorites = p[Keys.favorites] ?: emptySet(),
            recent = p[Keys.recent]?.split(',')?.filter { it.isNotBlank() } ?: emptyList(),
            onboardingDone = p[Keys.onboarding] ?: false,
            removeAds = p[Keys.removeAds] ?: false,
            posterUntil = p[Keys.posterUntil] ?: 0L,
            haptics = p[Keys.haptics] ?: true,
            loaded = true,
        )
    }

    suspend fun setTheme(theme: ThemeChoice) = context.dataStore.edit { it[Keys.theme] = theme.name }

    suspend fun toggleFavorite(id: String) = context.dataStore.edit { p ->
        val now = p[Keys.favorites].orEmpty()
        p[Keys.favorites] = if (id in now) now - id else now + id
    }

    suspend fun markOpened(id: String) = context.dataStore.edit { p ->
        val list = p[Keys.recent]?.split(',')?.filter { it.isNotBlank() && it != id } ?: emptyList()
        p[Keys.recent] = (listOf(id) + list).take(12).joinToString(",")
    }

    suspend fun setOnboardingDone(done: Boolean) = context.dataStore.edit { it[Keys.onboarding] = done }

    suspend fun setRemoveAds(on: Boolean) = context.dataStore.edit { it[Keys.removeAds] = on }

    suspend fun setPosterUntil(epochMillis: Long) = context.dataStore.edit { it[Keys.posterUntil] = epochMillis }

    suspend fun setHaptics(on: Boolean) = context.dataStore.edit { it[Keys.haptics] = on }
}
