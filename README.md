# Safari VideoBar

A userscript for iOS Safari that gives videos on any website a fixed bottom control bar, plus X-style (Twitter) seek gestures.

Tap the ⛶ button at the top-right of a video to enter page fullscreen. The system controls are replaced by a progress bar pinned to the bottom of the screen. In the normal inline view, the site's own controls are left alone.

## Install

You need an iPhone or iPad with Safari and the free [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) app, which runs the script.

1. Install **Userscripts** from the App Store.
2. Open the Userscripts app once and follow its setup. It asks you to choose a folder where it will keep your scripts (the app has a button for this).
3. Turn the extension on: Settings → Safari → Extensions → Userscripts → On (on newer iOS: Settings → Apps → Safari → Extensions). Set its website access to **Allow** for all websites, otherwise it can't see videos.
4. In Safari, open the install link below. The page shows the script's source code, which is expected. Tap the **aA** menu in the address bar, choose **Userscripts**, and tap **Install**.

**Install link:** <https://raw.githubusercontent.com/dinosaur65/safarivideobar/main/SafariVideoBar.user.js>

5. Check it works: open any page with a video and reload it. A small **⛶** button should appear in the top-right corner of the video. Tap it to enter fullscreen.

## Gestures in fullscreen

| Gesture | What it does |
| --- | --- |
| Single tap | Show or hide the control bar (auto-hides after 3.5 s while playing) |
| Double-tap left or right | Seek back or forward 10 s. Keep tapping the same side to add 10 s each time (20, 30, 40…). It ends after 0.8 s without a tap |
| Double-tap middle | Play or pause |
| Press and swipe left or right | The progress follows your finger and jumps when you let go. A full-screen swipe is about 5% of the video length, min 1 min, max 5 min |
| Swipe up | Lets Safari collapse the address bar (works best in landscape) |

## Troubleshooting

- **No ⛶ button:** reload the page, then tap **aA** and check that Userscripts is allowed on this site and Safari VideoBar is listed as active. The video must be visible on screen and at least 200 × 100 px.
- **Controls doubled up or behaving oddly:** you may have another video-control userscript or extension running on the same page. Turn the others off.
- **Address bar won't collapse:** swipe up in fullscreen (landscape works best), or choose **Hide Toolbar** in the aA menu first.
- **It breaks a particular site:** add that site's domain to `EXCLUDE_HOSTS` (see Settings) and please open an issue.

## Update and uninstall

- **Update:** the script has an update URL, so Userscripts can check for new versions. You can also open the install link again and reinstall. An update replaces the script file, so any settings you edited go back to the defaults.
- **Uninstall or pause:** turn the script off in the Userscripts popup, or delete `SafariVideoBar.user.js` from your Userscripts folder (for example in the Files app).

## Settings

The defaults work for most people. To change them, open `SafariVideoBar.user.js` in your Userscripts folder (with the Files app or a text editor), edit the constants at the top, and save.

| Name | Meaning | Default |
| --- | --- | --- |
| `SEEK_STEP` | Seconds added per tap | `10` |
| `SEEK_WINDOW` | Max gap between taps in a streak (ms) | `800` |
| `SWIPE_RATIO`, `SWIPE_MIN`, `SWIPE_MAX` | Speed and limits for swipe seeking | `0.05`, `60`, `300` |
| `SCRUB_LIVE` | `true` to preview the frame while swiping | `false` |
| `SPEEDS` | Playback speed steps | `0.75, 1, 1.25, 1.5, 2` |
| `EXCLUDE_HOSTS` | Sites to skip, e.g. `['youtube.com']` | `[]` |

## Notes

- **Privacy:** the script makes no network requests and doesn't collect, store or send any data. It only looks for video elements on the pages you open.
- **Permissions:** it matches every website (`*://*/*`) so it can find videos anywhere. Use `EXCLUDE_HOSTS` for sites you want it to skip.
- **Language:** on-screen text (the swipe-up hint and the seek counter) follows your device language. English, 简体中文, 繁體中文, 日本語 and 한국어 are built in; everything else falls back to English. To add a language, add an entry to the `I18N` table at the top of the script.
- **Testing:** it has not been tested on every device or site. If something misbehaves, please open an issue with your device, iOS version and the site.

## License

MIT, see [LICENSE](LICENSE).

---

# Safari VideoBar（中文说明）

给 iOS Safari 里所有网站的视频加一个固定在底部的控制条，并支持仿 X 的手势。

点视频右上角的 ⛶ 进入网页全屏后，系统控制条会换成底部进度条；小窗状态仍然用网站原来的控制条。

## 安装

需要一台装有 Safari 的 iPhone 或 iPad，以及免费的 [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) App，脚本靠它运行。

1. 在 App Store 安装 **Userscripts**。
2. 打开一次 Userscripts App，按提示完成设置：它会让你选一个文件夹来存放脚本（App 里有对应的按钮）。
3. 打开扩展：设置 → Safari → 扩展 → Userscripts → 开启（较新的 iOS 里是 设置 → App → Safari → 扩展）。把网站访问权限设为对所有网站**允许**，否则它看不到视频。
4. 在 Safari 里打开下面的安装链接。页面里显示的是脚本源码，这是正常的。点地址栏的 **aA** 菜单，选 **Userscripts**，再点**安装**。

**安装链接：** <https://raw.githubusercontent.com/dinosaur65/safarivideobar/main/SafariVideoBar.user.js>

5. 检查是否生效：打开任意有视频的网页并刷新，视频右上角应该出现一个小的 **⛶** 按钮，点它进入全屏。

## 全屏时的手势

- **单击**：显示或隐藏控制条，播放时 3.5 秒后自动隐藏。
- **双击左侧或右侧**：后退或快进 10 秒；紧接着继续点同一侧，每点一下再加 10 秒，停手 0.8 秒后结束。
- **双击中间**：播放或暂停。
- **按住左右滑动**：进度跟着手指走，松手后跳转。滑过一整屏约等于视频时长的 5%，最少 1 分钟，最多 5 分钟。
- **向上轻扫**：让 Safari 收起地址栏，横屏时效果最好。

## 常见问题

- **看不到 ⛶ 按钮：** 刷新页面，点 **aA** 检查 Userscripts 是否允许访问这个网站、Safari VideoBar 是否处于启用状态。视频需要在屏幕上可见，且不小于 200 × 100 像素。
- **控制条重复或表现异常：** 可能同一页面上还有别的视频控制类脚本或扩展，把其他的关掉。
- **地址栏收不起来：** 全屏时向上轻扫（横屏效果最好），或先在 aA 菜单里选**隐藏工具栏**。
- **某个网站被它搞坏了：** 把该网站域名写进 `EXCLUDE_HOSTS`（见下面的设置），并欢迎提 issue。

## 更新和卸载

- **更新：** 脚本带有更新地址，Userscripts 可以检查新版本；也可以重新打开安装链接再安装一次。更新会替换脚本文件，你改过的设置会恢复成默认值。
- **卸载或暂停：** 在 Userscripts 弹窗里把脚本关掉，或者从 Userscripts 文件夹里删除 `SafariVideoBar.user.js`（比如用“文件”App）。

## 设置

默认设置适合大多数人。想改的话，用“文件”App 或文本编辑器打开 Userscripts 文件夹里的 `SafariVideoBar.user.js`，修改开头的常量并保存：`SEEK_STEP`（每次跳几秒）、`SEEK_WINDOW`（连续点击间隔）、`SWIPE_RATIO` / `SWIPE_MIN` / `SWIPE_MAX`（滑动快进）、`SCRUB_LIVE`、`SPEEDS`（倍速档位）、`EXCLUDE_HOSTS`（不想使用的网站）。

## 说明

- **隐私：** 脚本不发起任何网络请求，也不收集、保存或发送任何数据，只会在你打开的网页里查找视频元素。
- **权限：** 脚本匹配所有网站，这样才能在任何地方找到视频。不想在某个网站使用，就把域名写进 `EXCLUDE_HOSTS`。
- **语言：** 画面上的提示文字（向上轻扫的提示和快进秒数）会跟随设备语言，内置英文、简体中文、繁體中文、日本語、한국어，其他语言显示英文。想加语言，在脚本开头的 `I18N` 表里加一项即可。
- **测试：** 还没有在所有设备和网站上测试过。遇到问题欢迎提 issue，请写上设备、iOS 版本和网站。
