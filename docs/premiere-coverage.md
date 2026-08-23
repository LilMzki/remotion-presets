# Premiere Pro 26.0 対応表

この文書は、`presetRegistry`に登録されている全228プリセットを、参照元のカテゴリごとに一覧化したものです。

本プロジェクトはAdobeの非公式プロジェクトで、Adobeとの提携・承認関係はありません。Premiere Pro 26.0の名称と分類を機能上の参照点にし、用途、見た目、主要な調整概念をRemotionで扱えるよう独立に実装しています。Adobe製品のコード、プリセットファイル、UI、画像・動画・音声素材は使用していません。

対象は映像エフェクト、映像トランジション、Animation、Textです。音声、Obsolete、Removed、PremiereのGUI編集機能は対象外です。

## 集計

| 区分                                   | `equivalent` | `approximate` |   独自 |    合計 |
| -------------------------------------- | -----------: | ------------: | -----: | ------: |
| Current video effects                  |            0 |            90 |      0 |      90 |
| Current transitions / Animation / Text |            0 |            81 |      0 |      81 |
| Legacy                                 |            0 |            33 |      0 |      33 |
| Compound presets                       |            0 |             0 |     24 |      24 |
| **合計**                               |        **0** |       **204** | **24** | **228** |

レジストリ上の`kind`はeffect 101、transition 95、animation 17、text 9、look 6です。`renderMode`分類はdom 91、canvas2d 30、webgl 107です。

> [!NOTE]
> `renderMode`は目標とする処理特性と将来の専用実装を表すメタデータです。現行版の実バックエンドは、effects系が共有Canvas 2Dエンジン、transition系が14種類の共有DOM presentation、文字・ルック・要素アニメーションが共有DOM/CSSエンジンです。`webgl`分類が現行版でWebGL shaderを実行するという意味ではありません。

## 再現度の読み方

- `approximate`: Premiereの編集意図を試せる、レンダー可能で決定的な近似。v0.1.0では204件すべてが共有Canvas 2D engine、共有DOM/CSS engine、または共有transition familyを使うため、この区分です。内容解析を必要としない項目も含みます。
- `equivalent`: 専用アルゴリズム、主要パラメータ、代表的な入力での視覚検証がそろった項目へ将来付与する区分です。v0.1.0では該当項目がありません。
- Compound: Premiereの単一項目との対応を持たない、本プロジェクト独自の高レベル複合プリセット。

v0.1.0は、228種類の高レベルな選択肢とAPIを先に利用可能にする土台です。Premiere参照204件は、IDごとに完全に独立したアルゴリズムを持つという意味ではありません。今後、専用実装と視覚検証を追加できた項目だけを`equivalent`へ昇格します。

各IDの説明、調整項目、目標render modeは`getPresetMetadata(id)`またはStudioカタログから確認できます。

## Current video effects（90）

### Adjust（4）

| Premiere名（日本語名）       | プリセットID       | 再現度      |
| ---------------------------- | ------------------ | ----------- |
| Extract（抽出）              | `extract`          | approximate |
| Levels（レベル）             | `levels`           | approximate |
| Lighting Effects（照明効果） | `lighting-effects` | approximate |
| ProcAmp（プロセスアンプ）    | `procamp`          | approximate |

### Blur & Sharpen（8）

| Premiere名（日本語名）                                 | プリセットID               | 再現度      |
| ------------------------------------------------------ | -------------------------- | ----------- |
| Bokeh Blur（ボケブラー）                               | `bokeh-blur`               | approximate |
| Compound Blur（コンパウンドブラー）                    | `compound-blur`            | approximate |
| Directional Blur（方向ブラー）                         | `directional-blur-effect`  | approximate |
| Focus Blur（フォーカスブラー）                         | `focus-blur`               | approximate |
| Gaussian Blur（ガウスブラー）                          | `gaussian-blur`            | approximate |
| Reduce Interlace Flicker（インターレースちらつき低減） | `reduce-interlace-flicker` | approximate |
| Sharpen（シャープ）                                    | `sharpen`                  | approximate |
| Unsharp Mask（アンシャープマスク）                     | `unsharp-mask`             | approximate |

### Color Correction（6）

| Premiere名（日本語名）                        | プリセットID          | 再現度      |
| --------------------------------------------- | --------------------- | ----------- |
| ASC CDL（ASC CDL）                            | `asc-cdl`             | approximate |
| Brightness & Contrast（明るさ・コントラスト） | `brightness-contrast` | approximate |
| Lumetri Color（Lumetriカラー）                | `lumetri-color`       | approximate |
| Tint（色合い）                                | `tint`                | approximate |
| Video Limiter（ビデオリミッター）             | `video-limiter`       | approximate |
| Vignette（ビネット）                          | `vignette`            | approximate |

### Distort（8）

| Premiere名（日本語名）                             | プリセットID         | 再現度      |
| -------------------------------------------------- | -------------------- | ----------- |
| Corner Pin（コーナーピン）                         | `corner-pin`         | approximate |
| Lens Distortion（レンズディストーション）          | `lens-distortion`    | approximate |
| Mirror（ミラー）                                   | `mirror-effect`      | approximate |
| Spherize（球面化）                                 | `spherize`           | approximate |
| Turbulent Displace（タービュレントディスプレイス） | `turbulent-displace` | approximate |
| Twirl（ねじれ）                                    | `twirl`              | approximate |
| Warp Stabilizer（ワープスタビライザー）            | `warp-stabilizer`    | approximate |
| Wave Warp（波形ワープ）                            | `wave-warp`          | approximate |

### Generate（1）

| Premiere名（日本語名）                | プリセットID          | 再現度      |
| ------------------------------------- | --------------------- | ----------- |
| 4-Color Gradient（4色グラデーション） | `four-color-gradient` | approximate |

### Image Control（7）

| Premiere名（日本語名）            | プリセットID       | 再現度      |
| --------------------------------- | ------------------ | ----------- |
| Black & White（白黒）             | `black-white`      | approximate |
| Channel Mix（チャンネルミックス） | `channel-mix`      | approximate |
| Color Pass（カラーパス）          | `color-pass`       | approximate |
| Color Replace（カラー置換）       | `color-replace`    | approximate |
| Gamma Correction（ガンマ補正）    | `gamma-correction` | approximate |
| Invert（反転）                    | `invert`           | approximate |
| Rounded Crop（角丸クロップ）      | `rounded-crop`     | approximate |

### Immersive Video（11）

| Premiere名（日本語名）                       | プリセットID               | 再現度      |
| -------------------------------------------- | -------------------------- | ----------- |
| VR Blur（VRブラー）                          | `vr-blur`                  | approximate |
| VR Chromatic Aberrations（VR色収差）         | `vr-chromatic-aberrations` | approximate |
| VR Color Gradients（VRカラーグラデーション） | `vr-color-gradients`       | approximate |
| VR De-Noise（VRノイズ除去）                  | `vr-de-noise`              | approximate |
| VR Digital Glitch（VRデジタルグリッチ）      | `vr-digital-glitch`        | approximate |
| VR Fractal Noise（VRフラクタルノイズ）       | `vr-fractal-noise`         | approximate |
| VR Glow（VRグロー）                          | `vr-glow`                  | approximate |
| VR Plane to Sphere（VR平面から球面）         | `vr-plane-to-sphere`       | approximate |
| VR Projection（VR投影）                      | `vr-projection`            | approximate |
| VR Rotate Sphere（VR球面回転）               | `vr-rotate-sphere`         | approximate |
| VR Sharpen（VRシャープ）                     | `vr-sharpen`               | approximate |

### Keying（6）

| Premiere名（日本語名）                | プリセットID      | 再現度      |
| ------------------------------------- | ----------------- | ----------- |
| Alpha Adjust（アルファ調整）          | `alpha-adjust`    | approximate |
| Color Key（カラーキー）               | `color-key`       | approximate |
| Logo Cutout（ロゴ切り抜き）           | `logo-cutout`     | approximate |
| Luma Key（ルミナンスキー）            | `luma-key`        | approximate |
| Track Matte Key（トラックマットキー） | `track-matte-key` | approximate |
| Ultra Key（Ultraキー）                | `ultra-key`       | approximate |

### Lights & Glows（7）

| Premiere名（日本語名）                    | プリセットID      | 再現度      |
| ----------------------------------------- | ----------------- | ----------- |
| Echo Glow（エコーグロー）                 | `echo-glow`       | approximate |
| Edge Glow（エッジグロー）                 | `edge-glow`       | approximate |
| Glint（グリント）                         | `glint`           | approximate |
| Light Leaks（ライトリーク）               | `light-leaks`     | approximate |
| RGB Split（RGBスプリット）                | `rgb-split`       | approximate |
| Volumetric Rays（ボリューメトリックレイ） | `volumetric-rays` | approximate |
| Wonder Glow（ワンダーグロー）             | `wonder-glow`     | approximate |

### Noise & Grain（1）

| Premiere名（日本語名） | プリセットID | 再現度      |
| ---------------------- | ------------ | ----------- |
| Noise（ノイズ）        | `noise`      | approximate |

### Perspective（3）

| Premiere名（日本語名）          | プリセットID  | 再現度      |
| ------------------------------- | ------------- | ----------- |
| Basic 3D（基本3D）              | `basic-3d`    | approximate |
| Drop Shadow（ドロップシャドウ） | `drop-shadow` | approximate |
| Long Shadow（ロングシャドウ）   | `long-shadow` | approximate |

### Stylize（7）

| Premiere名（日本語名）            | プリセットID    | 再現度      |
| --------------------------------- | --------------- | ----------- |
| Brush Strokes（ブラシストローク） | `brush-strokes` | approximate |
| Color Emboss（カラーエンボス）    | `color-emboss`  | approximate |
| Find Edges（エッジ検出）          | `find-edges`    | approximate |
| Mosaic（モザイク）                | `mosaic-effect` | approximate |
| Posterize（ポスタライズ）         | `posterize`     | approximate |
| Roughen Edges（ラフエッジ）       | `roughen-edges` | approximate |
| Strobe Light（ストロボライト）    | `strobe-light`  | approximate |

### Time（1）

| Premiere名（日本語名）             | プリセットID     | 再現度      |
| ---------------------------------- | ---------------- | ----------- |
| Posterize Time（ポスタライズ時間） | `posterize-time` | approximate |

`posterize-time`の現行実装は入力フレームを過去時刻に差し替えません。Remotionの単一`EffectDescriptor`は過去のsourceフレームを選択できないため、v0.1.0では決定的な段階状の明るさ・コントラスト・彩度の量子化で視覚的に近似します。実際のフレーム間引きは、ロードマップ0.3のsource-time adapterで実装予定です。

### Transform（13）

| Premiere名（日本語名）           | プリセットID      | 再現度      |
| -------------------------------- | ----------------- | ----------- |
| 3D Rotate（3D回転）              | `rotate-3d`       | approximate |
| Auto Reframe（オートリフレーム） | `auto-reframe`    | approximate |
| Camera Shake（カメラシェイク）   | `camera-shake`    | approximate |
| Grow（グロウ）                   | `grow`            | approximate |
| Horizontal Flip（水平反転）      | `horizontal-flip` | approximate |
| Move（移動）                     | `move`            | approximate |
| Offset（オフセット）             | `offset`          | approximate |
| Shrink（シュリンク）             | `shrink`          | approximate |
| Spacer（スペーサー）             | `spacer`          | approximate |
| Spin（スピン）                   | `spin`            | approximate |
| Transform（トランスフォーム）    | `transform`       | approximate |
| Vertical Flip（垂直反転）        | `vertical-flip`   | approximate |
| Wiggle（ウィグル）               | `wiggle`          | approximate |

### Transition（1）

| Premiere名（日本語名）                | プリセットID           | 再現度      |
| ------------------------------------- | ---------------------- | ----------- |
| Gradient Wipe（グラデーションワイプ） | `gradient-wipe-effect` | approximate |

### Utility（6）

| Premiere名（日本語名）                                          | プリセットID                | 再現度      |
| --------------------------------------------------------------- | --------------------------- | ----------- |
| Auto Align（自動整列）                                          | `auto-align`                | approximate |
| Cineon Converter（Cineonコンバーター）                          | `cineon-converter`          | approximate |
| Clone（クローン）                                               | `clone`                     | approximate |
| Metadata & Timecode Burn-in（メタデータ・タイムコード焼き込み） | `metadata-timecode-burn-in` | approximate |
| Simple Text（シンプルテキスト）                                 | `simple-text`               | approximate |
| Stroke（ストローク）                                            | `stroke`                    | approximate |

## Current transitions / Animation / Text（81）

### Animation（8）

| Premiere名（日本語名）                | プリセットID    | 再現度      |
| ------------------------------------- | --------------- | ----------- |
| Block Motion（ブロックモーション）    | `block-motion`  | approximate |
| Flip Motion（フリップモーション）     | `flip-motion`   | approximate |
| Fold Motion（フォールドモーション）   | `fold-motion`   | approximate |
| Pop Motion（ポップモーション）        | `pop-motion`    | approximate |
| Pull Motion（プルモーション）         | `pull-motion`   | approximate |
| Spin Motion（スピンモーション）       | `spin-motion`   | approximate |
| Spring Motion（スプリングモーション） | `spring-motion` | approximate |
| Travel Motion（トラベルモーション）   | `travel-motion` | approximate |

### Dissolve（11）

| Premiere名（日本語名）               | プリセットID        | 再現度      |
| ------------------------------------ | ------------------- | ----------- |
| Additive Dissolve（加算ディゾルブ）  | `additive-dissolve` | approximate |
| Blur Dissolve（ブラーディゾルブ）    | `blur-dissolve`     | approximate |
| Burn Alpha（バーンアルファ）         | `burn-alpha`        | approximate |
| Cross Dissolve（クロスディゾルブ）   | `cross-dissolve`    | approximate |
| Dip to Black（ディップトゥブラック） | `dip-to-black`      | approximate |
| Dip to Color（ディップトゥカラー）   | `dip-to-color`      | approximate |
| Dip to White（ディップトゥホワイト） | `dip-to-white`      | approximate |
| Film Dissolve（フィルムディゾルブ）  | `film-dissolve`     | approximate |
| Luma Fade（ルミナンスフェード）      | `luma-fade`         | approximate |
| Morph Cut（モルフカット）            | `morph-cut`         | approximate |
| Mosaic（モザイクトランジション）     | `mosaic-transition` | approximate |

### Grunge & Distort（10）

| Premiere名（日本語名）                        | プリセットID        | 再現度      |
| --------------------------------------------- | ------------------- | ----------- |
| Chaos（カオス）                               | `chaos`             | approximate |
| Earthquake（アースクエイク）                  | `earthquake`        | approximate |
| Flicker（フリッカー）                         | `flicker`           | approximate |
| Glass（ガラス）                               | `glass`             | approximate |
| Glitch（グリッチ）                            | `glitch`            | approximate |
| Grunge（グランジ）                            | `grunge`            | approximate |
| Kaleidoscope（カレイドスコープ）              | `kaleidoscope`      | approximate |
| Liquid Distortion（リキッドディストーション） | `liquid-distortion` | approximate |
| TV Power（TVパワー）                          | `tv-power`          | approximate |
| VHS Damage（VHSダメージ）                     | `vhs-damage`        | approximate |

### Immersive Video（8）

| Premiere名（日本語名）                     | プリセットID        | 再現度      |
| ------------------------------------------ | ------------------- | ----------- |
| VR Chroma Leaks（VRクロマリーク）          | `vr-chroma-leaks`   | approximate |
| VR Gradient Wipe（VRグラデーションワイプ） | `vr-gradient-wipe`  | approximate |
| VR Iris Wipe（VRアイリスワイプ）           | `vr-iris-wipe`      | approximate |
| VR Light Leaks（VRライトリーク）           | `vr-light-leaks`    | approximate |
| VR Light Rays（VRライトレイ）              | `vr-light-rays`     | approximate |
| VR Mobius Zoom（VRメビウスズーム）         | `vr-mobius-zoom`    | approximate |
| VR Random Blocks（VRランダムブロック）     | `vr-random-blocks`  | approximate |
| VR Spherical Blur（VRスフェリカルブラー）  | `vr-spherical-blur` | approximate |

### Lights & Blurs（16）

| Premiere名（日本語名）         | プリセットID                  | 再現度      |
| ------------------------------ | ----------------------------- | ----------- |
| Burn Chroma（クロマバーン）    | `burn-chroma`                 | approximate |
| Chroma Leak（クロマリーク）    | `chroma-leak`                 | approximate |
| Cross Zoom（クロスズーム）     | `cross-zoom`                  | approximate |
| Directional Blur（方向ブラー） | `directional-blur-transition` | approximate |
| Flare（フレア）                | `flare`                       | approximate |
| Flash（フラッシュ）            | `flash`                       | approximate |
| Glow（グロー）                 | `glow`                        | approximate |
| Lens Blur（レンズブラー）      | `lens-blur`                   | approximate |
| Light Leak（ライトリーク）     | `light-leak`                  | approximate |
| Light Sweep（ライトスイープ）  | `light-sweep`                 | approximate |
| Phosphor（フォスファー）       | `phosphor`                    | approximate |
| Radial Blur（放射状ブラー）    | `radial-blur`                 | approximate |
| Ray（レイ）                    | `ray`                         | approximate |
| Solarize（ソラリゼーション）   | `solarize`                    | approximate |
| Stripe（ストライプ）           | `stripe`                      | approximate |
| Zoom Blur（ズームブラー）      | `zoom-blur`                   | approximate |

### Slide（7）

| Premiere名（日本語名）      | プリセットID | 再現度      |
| --------------------------- | ------------ | ----------- |
| 3D Roll（3Dロール）         | `roll-3d`    | approximate |
| Film Roll（フィルムロール） | `film-roll`  | approximate |
| Push（プッシュ）            | `push`       | approximate |
| Roll（ロール）              | `roll`       | approximate |
| Split（スプリット）         | `split`      | approximate |
| Stretch（ストレッチ）       | `stretch`    | approximate |
| Whip（ウィップ）            | `whip`       | approximate |

### Smart Tools（3）

| Premiere名（日本語名）               | プリセットID    | 再現度      |
| ------------------------------------ | --------------- | ----------- |
| Motion Camera（モーションカメラ）    | `motion-camera` | approximate |
| Motion Tween（モーショントゥイーン） | `motion-tween`  | approximate |
| Shape Flow（シェイプフロー）         | `shape-flow`    | approximate |

### Text（2）

| Premiere名（日本語名）                | プリセットID    | 再現度      |
| ------------------------------------- | --------------- | ----------- |
| Text Animator（テキストアニメーター） | `text-animator` | approximate |
| Typewriter（タイプライター）          | `typewriter`    | approximate |

### Transformers（7）

| Premiere名（日本語名）    | プリセットID        | 再現度      |
| ------------------------- | ------------------- | ----------- |
| 3D Spin（3Dスピン）       | `spin-3d`           | approximate |
| Frame（フレーム）         | `frame`             | approximate |
| Louver（ルーバー）        | `louver`            | approximate |
| Mirror（ミラー）          | `mirror-transition` | approximate |
| Page Peel（ページピール） | `page-peel`         | approximate |
| Slice（スライス）         | `slice`             | approximate |
| Wave（ウェーブ）          | `wave`              | approximate |

### Wipe（9）

| Premiere名（日本語名）           | プリセットID   | 再現度      |
| -------------------------------- | -------------- | ----------- |
| Clock Wipe（クロックワイプ）     | `clock-wipe`   | approximate |
| Linear Wipe（リニアワイプ）      | `linear-wipe`  | approximate |
| Neon Wipe（ネオンワイプ）        | `neon-wipe`    | approximate |
| Panel Wipe（パネルワイプ）       | `panel-wipe`   | approximate |
| Plateau Wipe（プラトーワイプ）   | `plateau-wipe` | approximate |
| Radial Wipe（ラジアルワイプ）    | `radial-wipe`  | approximate |
| Soft Wipe（ソフトワイプ）        | `soft-wipe`    | approximate |
| Star Wipe（スターワイプ）        | `star-wipe`    | approximate |
| Stretch Wipe（ストレッチワイプ） | `stretch-wipe` | approximate |

## Legacy（33）

LegacyはCurrentと別の安定IDを持ちます。たとえば`cross-dissolve`と`legacy-cross-dissolve`は別項目です。

### Video Effects（12）

| Premiere名（日本語名）                              | プリセットID              | 再現度      |
| --------------------------------------------------- | ------------------------- | ----------- |
| Alpha Glow（アルファグロー）                        | `legacy-alpha-glow`       | approximate |
| Block Dissolve（ブロックディゾルブ）                | `legacy-block-dissolve`   | approximate |
| Camera Blur（カメラブラー）                         | `legacy-camera-blur`      | approximate |
| Crop（クロップ）                                    | `legacy-crop`             | approximate |
| Directional Blur (Legacy)（方向ブラー（レガシー）） | `legacy-directional-blur` | approximate |
| Edge Feather（エッジのぼかし）                      | `legacy-edge-feather`     | approximate |
| Gaussian Blur (Legacy)（ガウスブラー（レガシー））  | `legacy-gaussian-blur`    | approximate |
| Linear Wipe (Legacy)（リニアワイプ（レガシー））    | `legacy-linear-wipe`      | approximate |
| Magnify (Legacy)（拡大（レガシー））                | `legacy-magnify`          | approximate |
| Mosaic (Legacy)（モザイク（レガシー））             | `legacy-mosaic`           | approximate |
| Ramp（ランプ）                                      | `legacy-ramp`             | approximate |
| Replicate（反復）                                   | `legacy-replicate`        | approximate |

### Video Transitions（21）

| Premiere名（日本語名）                                   | プリセットID                   | 再現度      |
| -------------------------------------------------------- | ------------------------------ | ----------- |
| Additive Dissolve (Legacy)（加算ディゾルブ（レガシー）） | `legacy-additive-dissolve`     | approximate |
| Barn Doors（バーンドア）                                 | `legacy-barn-doors`            | approximate |
| Center Split（中央分割）                                 | `legacy-center-split`          | approximate |
| Clock Wipe (Legacy)（時計ワイプ（レガシー））            | `legacy-clock-wipe`            | approximate |
| Cross Dissolve (Legacy)（クロスディゾルブ（レガシー））  | `legacy-cross-dissolve`        | approximate |
| Cross Zoom (Legacy)（クロスズーム（レガシー））          | `legacy-cross-zoom`            | approximate |
| Dip to Black (Legacy)（黒へディップ（レガシー））        | `legacy-dip-to-black`          | approximate |
| Dip to White (Legacy)（白へディップ（レガシー））        | `legacy-dip-to-white`          | approximate |
| Film Dissolve (Legacy)（フィルムディゾルブ（レガシー）） | `legacy-film-dissolve`         | approximate |
| Inset（インセット）                                      | `legacy-inset`                 | approximate |
| Iris Box（アイリス（ボックス））                         | `legacy-iris-box`              | approximate |
| Iris Cross（アイリス（クロス））                         | `legacy-iris-cross`            | approximate |
| Iris Diamond（アイリス（ダイヤモンド））                 | `legacy-iris-diamond`          | approximate |
| Iris Round（アイリス（円形））                           | `legacy-iris-round`            | approximate |
| Non-Additive Dissolve（非加算ディゾルブ）                | `legacy-non-additive-dissolve` | approximate |
| Push (Legacy)（プッシュ（レガシー））                    | `legacy-push`                  | approximate |
| Radial Wipe (Legacy)（放射状ワイプ（レガシー））         | `legacy-radial-wipe`           | approximate |
| Slide (Legacy)（スライド（レガシー））                   | `legacy-slide`                 | approximate |
| Split (Legacy)（分割（レガシー））                       | `legacy-split`                 | approximate |
| Whip (Legacy)（ウィップ（レガシー））                    | `legacy-whip`                  | approximate |
| Wipe（ワイプ）                                           | `legacy-wipe`                  | approximate |

## Compound presets（24）

CompoundはPremiereの単一機能を写したものではなく、日常的な編集意図を1つのAPIへまとめた本プロジェクト独自のプリセットです。

### Text（6）

| English（日本語名）                                      | プリセットID           | kind |
| -------------------------------------------------------- | ---------------------- | ---- |
| Golden Text（黄金の文字）                                | `golden-text`          | text |
| Neon Text（ネオン文字）                                  | `neon-text`            | text |
| Chrome Text（クローム文字）                              | `chrome-text`          | text |
| Glass Text（ガラス文字）                                 | `glass-text`           | text |
| Kinetic Word Cascade（キネティック・ワード・カスケード） | `kinetic-word-cascade` | text |
| Scramble Reveal Text（スクランブル文字リビール）         | `scramble-reveal-text` | text |

### Entrance animation（6）

| English（日本語名）                             | プリセットID         | kind      |
| ----------------------------------------------- | -------------------- | --------- |
| Offscreen Slide In（画面外からスライドイン）    | `offscreen-slide-in` | animation |
| Elastic Pop In（弾むポップイン）                | `elastic-pop-in`     | animation |
| Blur Rise In（ぼかし上昇イン）                  | `blur-rise-in`       | animation |
| Masked Reveal（マスク・リビール）               | `masked-reveal`      | animation |
| Cinematic Zoom In（シネマティック・ズームイン） | `cinematic-zoom-in`  | animation |
| Paper Fold In（ペーパーフォールドイン）         | `paper-fold-in`      | animation |

### Looks（6）

| English（日本語名）                              | プリセットID         | kind |
| ------------------------------------------------ | -------------------- | ---- |
| Vintage Film（ビンテージ・フィルム）             | `vintage-film`       | look |
| Teal Orange Cinema（ティール＆オレンジ・シネマ） | `teal-orange-cinema` | look |
| Noir（ノワール）                                 | `noir`               | look |
| Bleach Bypass（ブリーチ・バイパス）              | `bleach-bypass`      | look |
| Dream Glow（ドリーム・グロー）                   | `dream-glow`         | look |
| VHS（VHS）                                       | `vhs`                | look |

### Editing / transitions（6）

| English（日本語名）                                   | プリセットID          | kind       |
| ----------------------------------------------------- | --------------------- | ---------- |
| Glitch Cut（グリッチ・カット）                        | `glitch-cut`          | transition |
| Film Burn Cut（フィルムバーン・カット）               | `film-burn-cut`       | transition |
| Light Leak Cut（ライトリーク・カット）                | `light-leak-cut`      | transition |
| Whip Pan Cut（ウィップパン・カット）                  | `whip-pan-cut`        | transition |
| Freeze Frame Punch（フリーズフレーム・パンチ）        | `freeze-frame-punch`  | animation  |
| Split Screen Reveal（スプリットスクリーン・リビール） | `split-screen-reveal` | transition |

## 特に大きな差分がある項目（11）

全204件が`approximate`です。その中でも、内容解析やAdobe固有処理のため差分が特に大きい11件を示します。

| ID                             | 近似する理由                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `warp-stabilizer`              | 動き解析と実際の安定化は未実装。静止素材へ揺れを加えず、固定オーバースキャンで安全に近似 |
| `auto-reframe`                 | 被写体検出とショット全体の追跡を必要とするため、決定的な再フレーミングで近似             |
| `auto-align`                   | 複数素材の内容解析と特徴点照合を必要とするため、決定的な整列表現で近似                   |
| `morph-cut`                    | 前後クリップの内容解析を必要とするため、決定的なワープ補間で近似                         |
| `legacy-alpha-glow`            | Premiere固有のアルファ境界処理を共有engineで近似                                         |
| `legacy-camera-blur`           | Premiere固有のカメラブラーを多段ブラー相当の処理で近似                                   |
| `legacy-magnify`               | Premiere固有の拡大境界と補間を共有engineで近似                                           |
| `legacy-cross-zoom`            | Premiere固有のズームサンプリングを共有transition familyで近似                            |
| `legacy-film-dissolve`         | Premiere固有色空間のディゾルブを線形合成相当の処理で近似                                 |
| `legacy-non-additive-dissolve` | Premiere固有の画素合成式を輝度ベースのブレンド相当で近似                                 |
| `legacy-whip`                  | Premiere固有のモーションブラーを方向性のある共有transition familyで近似                  |

## 対象外

- Audio Effects、Audio Transitionsなどの音声処理
- Premiere Pro 26.0の公式一覧でObsoleteまたはRemovedとされる項目
- Premiereのパネル、タイムライン、マスク編集UIなどのGUIそのもの
- Adobe固有ファイル形式との読み書き、`.prproj`やPremiereプリセットのimport／export
- Adobe提供のstock素材、フォント、LUT、テンプレート、生成AIサービス

## 検証方法

レジストリテストで次を固定しています。

- 合計228件、Current参照171件、Legacy参照33件、Compound 24件
- IDと生成export名に重複がなく、IDがkebab-caseであること
- 日英表示名、日本語説明、調整項目、既定durationが欠落していないこと
- Compound以外はPremiere参照を持ち、CompoundはPremiere参照を持たないこと
- Premiere参照204件がすべて`approximate`であること
- 初期品質基準15件が引き続き登録されていること

Studioの`PresetCatalog`、`PresetContactSheet`、`PresetSingle`で全IDを視覚確認できます。effects APIの実処理は`CanvasEffectSingle`で個別に確認できます。実装と本文の件数が異なる場合は、実行時の`presetRegistry`とテストを正としてください。

## 参照

- [Adobe Premiere Pro — List of effects and transitions](https://helpx.adobe.com/premiere/desktop/add-video-effects/effects-and-transitions-library/list-of-effects-and-transitions.html)
- [Remotion Effects](https://www.remotion.dev/docs/effects)
- [Remotion Transitions](https://www.remotion.dev/docs/transitions/transitionseries)
- [このライブラリのAPIガイド](api.md)
