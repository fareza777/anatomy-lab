package gg.f7developer.anatomylab.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import android.util.LruCache
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json

/** Reads the offline catalog and thumbnails bundled in assets. */
class CatalogRepository(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true }

    @Volatile private var cached: Catalog? = null

    private val thumbs = object : LruCache<String, Bitmap>(24 * 1024 * 1024) {
        override fun sizeOf(key: String, value: Bitmap) = value.byteCount
    }

    fun catalog(): Catalog = cached ?: synchronized(this) {
        cached ?: runCatching {
            context.assets.open("catalog.json").bufferedReader().use {
                json.decodeFromString(Catalog.serializer(), it.readText())
            }
        }.onFailure { Log.e(TAG, "Catalog could not be read", it) }
            .getOrDefault(Catalog())
            .also { cached = it }
    }

    fun system(id: String): LabSystem? = catalog().systems.firstOrNull { it.id == id }

    fun category(id: String): Category? = catalog().categories.firstOrNull { it.id == id }

    fun inCategory(id: String): List<LabSystem> = catalog().systems.filter { it.category == id }

    fun search(query: String): List<LabSystem> {
        val words = query.trim().lowercase().split(Regex("\\s+")).filter { it.isNotEmpty() }
        if (words.isEmpty()) return emptyList()
        return catalog().systems
            .map { s ->
                val hay = buildString {
                    append(s.title).append(' ').append(s.subtitle).append(' ').append(s.summary).append(' ')
                    append(s.tags.joinToString(" ")).append(' ').append(s.parts.joinToString(" ") { it.name })
                    append(' ').append(category(s.category)?.title.orEmpty())
                }.lowercase()
                val score = words.sumOf { w ->
                    when {
                        s.title.lowercase().contains(w) -> 5
                        s.tags.any { it.lowercase().contains(w) } -> 3
                        hay.contains(w) -> 1
                        else -> -100
                    }
                }
                s to score
            }
            .filter { it.second > 0 }
            .sortedByDescending { it.second }
            .map { it.first }
    }

    /** Thumbnail for a system in a theme, decoded off the main thread and cached. */
    suspend fun thumbnail(id: String, dark: Boolean): Bitmap? = withContext(Dispatchers.IO) {
        val key = "$id-${if (dark) "dark" else "light"}"
        thumbs.get(key) ?: runCatching {
            context.assets.open("thumbs/$key.webp").use { BitmapFactory.decodeStream(it) }
        }.onFailure { Log.w(TAG, "No thumbnail for $key") }
            .getOrNull()?.also { thumbs.put(key, it) }
    }

    companion object { private const val TAG = "Catalog" }
}
