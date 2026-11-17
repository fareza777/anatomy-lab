# WebView bridge: methods called from the lab pages by name.
-keepclassmembers class gg.f7developer.anatomylab.ui.screens.LabBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
# kotlinx.serialization
-keepattributes *Annotation*, InnerClasses
-keepclassmembers @kotlinx.serialization.Serializable class ** { *** Companion; *; }
-keep,includedescriptorclasses class gg.f7developer.anatomylab.**$$serializer { *; }
