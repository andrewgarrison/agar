---
'@agar/core': patch
---

`JellyBody.release(target)` (and `moveTo`) now ignores a target the body is already heading for, instead of restarting the move. Before, repeating a leftward move's target read as a move to the right: the back edge raced the front one and squeezed the jelly to a blob halfway across. A move with no sideways distance also keeps its direction.
