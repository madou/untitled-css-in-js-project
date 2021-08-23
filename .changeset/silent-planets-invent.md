---
'@compiled/webpack-loader': patch
---

Compiled now supports async chunked CSS. When components are code split and have unique styles only used in that chunk, its styles will be in their own style sheet.
