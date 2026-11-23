---
'@agar/core': patch
---

Draw jelly about 4× more cheaply on large surfaces, with identical pixels. Each body now draws only round its ring, and skips the per-pixel distance walk deep inside it. This matters most where WebGL runs in software (a blocklisted GPU), where a popover panel could drop to a few frames a second.
