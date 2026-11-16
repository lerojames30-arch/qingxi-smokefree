@echo off
chcp 65001 >nul
echo ========================================================
echo       清息控烟 - Android APK 一键构建脚本
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] 同步最新前端 Web 资产至 Android 原生工程...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 同步资产失败，请确认已运行 npm install。
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] 检查构建环境 (Java JDK 与 Android SDK)...
where java >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [提示] 检测到当前电脑未配置 JAVA_HOME 或 java 命令。
    echo.
    echo 推荐方案：
    echo 方案 A (推荐): 打开 Android Studio 直接打开当前目录下的 android 文件夹，点击 Build - Build APK。
    echo 方案 B (零门槛): 推送至 GitHub 使用内置的 GitHub Actions 自动构建出 APK。
    echo.
    pause
    exit /b 1
)

echo [3/3] 开始调用 Gradle 编译 Android APK...
cd android
call gradlew.bat assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo [构建成功!] APK 文件已输出至：
    echo android\app\build\outputs\apk\debug\app-debug.apk
    echo ========================================================
    explorer /select,"app\build\outputs\apk\debug\app-debug.apk"
) else (
    echo [错误] Gradle 构建失败，请检查报错日志或在 Android Studio 中查看详情。
)

pause
