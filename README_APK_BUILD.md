# 「清息控烟」Android APK 安装包打包与生成指南

本项目已通过 **Capacitor 6** 完成原生安卓项目的初始化与资产同步，并配置好了沉浸式竖屏锁定与震动权限。

工程根目录：`C:\Users\admin\.gemini\antigravity\scratch\smoke-tracker`  
原生安卓工程目录：`C:\Users\admin\.gemini\antigravity\scratch\smoke-tracker\android`  
应用包名（Package Name）：`com.qingxi.smokefree`  
应用名称：`清息控烟`

---

## 方案一：使用 Android Studio 本地编译生成 APK（最稳定官方方案）

如果您电脑上已安装或打算安装 **Android Studio**：

1. 打开 **Android Studio**；
2. 选择 **Open**（打开已有工程），定位到本项目目录下的 **`android`** 文件夹（即 `smoke-tracker\android`）；
3. 等待 Android Studio 自动完成 Gradle 同步（初次打开时它会自动下载对应的 Android SDK 与构建工具）；
4. 点击顶部菜单栏：
   👉 **`Build`** -> **`Build Bundle(s) / APK(s)`** -> **`Build APK(s)`**；
5. 构建完成后，右下角会弹出提示，点击 **`locate`**，即可直接在文件管理器中找到编译好的安装包：
   `android\app\build\outputs\apk\debug\app-debug.apk`；
6. 将该 APK 传输到安卓手机上直接安装即可！

---

## 方案二：使用 GitHub Actions 自动云端编译 APK（免配置本地环境）

如果您的电脑未安装庞大的 Android Studio 或 JDK，可以使用我们已为您配置好的 GitHub Actions 全自动云端编译：

1. 在 GitHub 上创建一个新的仓库（公开或私有均可）；
2. 将当前 `smoke-tracker` 项目的代码推送到该 GitHub 仓库；
3. GitHub Actions 会自动触发 `.github/workflows/build-apk.yml` 脚本：
   - 云端 Ubuntu 容器会自动配置 JDK 17 与 Android SDK；
   - 自动运行 Gradle 编译出 APK；
4. 编译耗时约 2~3 分钟，完成后在 GitHub 仓库的 **`Actions`** 选项卡中，点击对应的构建任务，在 **`Artifacts`**（产物）区域直接点击下载 **`清息控烟-app-debug.zip`**，解压即可得到手机可直接安装的 `.apk` 安装包！

---

## 方案三：使用 PWABuilder 网页端一键生成 APK（最快捷 1 分钟搞定）

本项目同时具备 100% 纯本地离线 PWA 特性：

1. 将 `www` 目录部署到任何免费静态网页托管服务（如 Vercel、Netlify 或 GitHub Pages）；
2. 访问微软官方 PWA 打包平台：[https://www.pwabuilder.com/](https://www.pwabuilder.com/)；
3. 在输入框粘贴您的网址，点击 **`Start`**；
4. 页面通过 PWA 完整性测试后，点击 **`Package for Android`**；
5. 点击下载生成的已签名 APK 或 AAB，直接传到手机即可安装使用。

---

## 方案四：命令行一键编译（需本地配置 Java 17+）

如果您本地已配置好 `JAVA_HOME` 和 Android SDK 环境变量：
在项目根目录下直接双击运行：
`build-apk.bat`
完成后会自动生成并打开生成的 APK 所在文件夹。
