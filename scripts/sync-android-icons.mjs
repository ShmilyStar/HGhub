#!/usr/bin/env node
/**
 * 把仓库里跟踪的安卓图标与 activity-alias 配置同步进生成的 Android 工程。
 */
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src-tauri", "icons", "android");
const androidApp = join(root, "src-tauri", "gen", "android", "app", "src", "main");
const dest = join(androidApp, "res");

if (!existsSync(src)) {
  console.log(`[icons] 跳过：缺少 ${src}`);
  process.exit(0);
}
if (!existsSync(dest)) {
  console.log("[icons] 跳过：gen/android 还没生成（先跑 tauri android init）");
  process.exit(0);
}

// 1. 同步全套 mipmap 图标（包括黄果图标与计算器伪装图标）
cpSync(src, dest, { recursive: true, force: true });
console.log(`[icons] 安卓图标已同步 → ${dest}`);

// 2. 注入应用名与计算器别名应用名
const stringsXml = join(dest, "values", "strings.xml");
if (existsSync(stringsXml)) {
  let xml = readFileSync(stringsXml, "utf8");
  xml = xml.replace(/<string name="app_name">.*?<\/string>/g, '<string name="app_name">黄果</string>');
  xml = xml.replace(/<string name="main_activity_title">.*?<\/string>/g, '<string name="main_activity_title">黄果</string>');
  if (!xml.includes('name="calc_app_name"')) {
    xml = xml.replace('</resources>', '    <string name="calc_app_name">标准计算器</string>\n</resources>');
  }
  writeFileSync(stringsXml, xml, "utf8");
  console.log("[icons] 安卓桌面应用名已设置为：黄果 / 标准计算器");
}

// 3. 注入 AndroidManifest.xml 的双 Launcher activity-alias
const manifestPath = join(androidApp, "AndroidManifest.xml");
if (existsSync(manifestPath)) {
  let manifest = readFileSync(manifestPath, "utf8");
  if (!manifest.includes("MainActivityDefault")) {
    // 移除 MainActivity 原本的 LAUNCHER intent-filter，交给 activity-alias 动态接管
    manifest = manifest.replace(
      /<intent-filter>[\s\S]*?<category\s+android:name="android\.intent\.category\.LAUNCHER"\s*\/>[\s\S]*?<\/intent-filter>/,
      ""
    );

    const aliases = `
    <!-- 默认 Launcher 入口：黄果短剧 -->
    <activity-alias
        android:name=".MainActivityDefault"
        android:targetActivity=".MainActivity"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:label="@string/app_name"
        android:enabled="true"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
    </activity-alias>

    <!-- 伪装 Launcher 入口：标准计算器 -->
    <activity-alias
        android:name=".MainActivityCalc"
        android:targetActivity=".MainActivity"
        android:icon="@mipmap/ic_calc_launcher"
        android:roundIcon="@mipmap/ic_calc_launcher_round"
        android:label="@string/calc_app_name"
        android:enabled="false"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
    </activity-alias>
`;

    manifest = manifest.replace("</application>", `${aliases}\n  </application>`);
    writeFileSync(manifestPath, manifest, "utf8");
    console.log("[icons] AndroidManifest.xml 已成功注入双 activity-alias！");
  }
}

// 4. 为 MainActivity.kt 注入 setLauncherIcon 方法以供 JNI 调用
function findFile(dir, name) {
  if (!existsSync(dir)) return null;
  const list = readdirSync(dir);
  for (const item of list) {
    const full = join(dir, item);
    const s = statSync(full);
    if (s.isDirectory()) {
      const res = findFile(full, name);
      if (res) return res;
    } else if (item === name) {
      return full;
    }
  }
  return null;
}

const mainActivityPath = findFile(join(androidApp, "java"), "MainActivity.kt");
if (mainActivityPath && existsSync(mainActivityPath)) {
  let kt = readFileSync(mainActivityPath, "utf8");
  if (!kt.includes("fun setLauncherIcon")) {
    const helperCode = `
  fun setLauncherIcon(icon: String): Boolean {
    val pm = packageManager
    val defaultAlias = android.content.ComponentName(this, "\${packageName}.MainActivityDefault")
    val calcAlias = android.content.ComponentName(this, "\${packageName}.MainActivityCalc")
    return try {
      if (icon == "calc") {
        pm.setComponentEnabledSetting(defaultAlias, android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED, android.content.pm.PackageManager.DONT_KILL_APP)
        pm.setComponentEnabledSetting(calcAlias, android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED, android.content.pm.PackageManager.DONT_KILL_APP)
      } else {
        pm.setComponentEnabledSetting(calcAlias, android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED, android.content.pm.PackageManager.DONT_KILL_APP)
        pm.setComponentEnabledSetting(defaultAlias, android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED, android.content.pm.PackageManager.DONT_KILL_APP)
      }
      true
    } catch (e: Exception) {
      false
    }
  }
}
`;
    // 替换类结尾的花括号
    kt = kt.replace(/\}\s*$/, helperCode);
    writeFileSync(mainActivityPath, kt, "utf8");
    console.log("[icons] MainActivity.kt 已成功注入 setLauncherIcon JNI 方法！");
  }
}