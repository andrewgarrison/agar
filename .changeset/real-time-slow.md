---
'@agar/core': patch
---

Keep jelly physics in real time down to 10 fps (it used to slow down below 20 fps), so on a slow device a popover's jelly still finishes shrinking before the closing panel hides.
