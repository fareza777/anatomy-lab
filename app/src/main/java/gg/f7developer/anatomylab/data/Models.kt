package gg.f7developer.anatomylab.data

import kotlinx.serialization.Serializable

@Serializable
data class Catalog(
    val version: Int = 1,
    val categories: List<Category> = emptyList(),
    val systems: List<LabSystem> = emptyList(),
)

@Serializable
data class Category(val id: String, val title: String, val short: String, val blurb: String = "")

@Serializable
data class LabSystem(
    val id: String,
    val title: String,
    val subtitle: String = "",
    val category: String,
    val tags: List<String> = emptyList(),
    val difficulty: String = "",
    val minutes: Int = 5,
    val summary: String = "",
    val overview: List<String> = emptyList(),
    val steps: List<Step> = emptyList(),
    val parts: List<Part> = emptyList(),
    val facts: List<Fact> = emptyList(),
    val accuracy: String = "",
    val sources: List<String> = emptyList(),
    val featured: Boolean = false,
)

@Serializable
data class Step(val title: String, val body: List<String> = emptyList())

@Serializable
data class Part(val name: String, val role: String)

@Serializable
data class Fact(val label: String, val value: String)
