package faq

// ImgCompressFAQs returns FAQs for image compression tool
func ImgCompressFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "图片会上传到服务器吗？", A: "不会。压缩全程在您的浏览器内完成，使用 Canvas API 和 WebAssembly 技术，图片文件不会发送到任何服务器。"},
			{Q: "支持哪些图片格式？", A: "支持所有主流图片格式，包括 JPG/JPEG、PNG、WebP、GIF、BMP、TIFF 等，所有格式都可以压缩和转换。"},
			{Q: "压缩效果大概有多少？", A: "JPEG 通常可压缩 40–80%，PNG 可压缩 50–90%，具体效果因图片内容而异。可调整质量滑块在文件大小与画质之间取得平衡。"},
			{Q: "有文件数量或大小限制吗？", A: "每张图片最大 10MB，每次最多同时处理 20 张，无每日/每月次数限制，完全免费。"},
			{Q: "可以批量转换图片格式吗？", A: "可以。在压缩的同时选择目标格式（JPG/PNG/WebP），所有图片会在压缩时一并转换，无需额外操作。"},
		}
	case "ja":
		return []FAQ{
			{Q: "画像はサーバーにアップロードされますか？", A: "いいえ。圧縮はすべてブラウザ内でCanvas APIとWebAssemblyを使用して行われます。画像ファイルはいかなるサーバーにも送信されません。"},
			{Q: "対応している画像形式は？", A: "JPG/JPEG、PNG、WebP、GIF、BMP、TIFFなどすべての主要形式に対応。すべての形式を圧縮・変換できます。"},
			{Q: "どれくらい圧縮できますか？", A: "JPEGは通常40〜80%、PNGは50〜90%削減できます。品質スライダーでファイルサイズと画質のバランスを調整できます。"},
			{Q: "ファイル数やサイズの制限はありますか？", A: "1ファイル最大10MB、同時に最大20枚まで処理可能。毎日・毎月の利用制限はなく、完全無料です。"},
			{Q: "一括で形式変換できますか？", A: "はい。圧縮と同時に出力形式（JPG/PNG/WebP）を選択すれば、すべての画像が自動的に変換されます。"},
		}
	case "ko":
		return []FAQ{
			{Q: "이미지가 서버에 업로드되나요?", A: "아니요. 모든 압축은 Canvas API와 WebAssembly를 사용하여 브라우저 내에서 완전히 처리됩니다. 이미지 파일은 어떤 서버에도 전송되지 않습니다."},
			{Q: "어떤 이미지 형식을 지원하나요?", A: "JPG/JPEG, PNG, WebP, GIF, BMP, TIFF 등 모든 주요 형식을 지원합니다. 모든 형식을 압축하고 변환할 수 있습니다."},
			{Q: "압축 효과는 얼마나 됩니까?", A: "JPEG는 일반적으로 40~80%, PNG는 50~90% 줄일 수 있습니다. 품질 슬라이더로 파일 크기와 화질의 균형을 조절하세요."},
			{Q: "파일 수나 크기 제한이 있나요?", A: "파일당 최대 10MB, 한 번에 최대 20장 처리 가능. 일별·월별 이용 제한 없이 완전 무료입니다."},
			{Q: "일괄 형식 변환이 가능한가요?", A: "네. 압축과 동시에 출력 형식(JPG/PNG/WebP)을 선택하면 모든 이미지가 자동으로 변환됩니다."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Las imágenes se suben al servidor?", A: "No. Toda la compresión se realiza en tu navegador usando la API Canvas y WebAssembly. Tus archivos de imagen nunca se envían a ningún servidor."},
			{Q: "¿Qué formatos de imagen son compatibles?", A: "Todos los formatos principales: JPG/JPEG, PNG, WebP, GIF, BMP, TIFF y más. Todos pueden comprimirse y convertirse."},
			{Q: "¿Cuánto se pueden comprimir las imágenes?", A: "Normalmente un 40–80% para JPEG y 50–90% para PNG. Los resultados varían según el contenido. Ajusta el control deslizante para equilibrar tamaño y calidad."},
			{Q: "¿Hay límite de archivos o tamaño?", A: "Hasta 10 MB por archivo y 20 imágenes a la vez. Sin límite diario ni mensual. Completamente gratis."},
			{Q: "¿Se puede convertir el formato en lote?", A: "Sí. Al comprimir, elige el formato de salida (JPG/PNG/WebP) y todas las imágenes se convierten automáticamente al mismo tiempo."},
		}
	default:
		return []FAQ{
			{Q: "Is image compression done on the server?", A: "No. All compression happens entirely in your browser using Canvas API and WebAssembly. Your images are never uploaded to any server."},
			{Q: "What formats are supported?", A: "All major formats: JPG/JPEG, PNG, WebP, GIF, BMP, TIFF and more. All can be compressed and converted."},
			{Q: "How much can images be compressed?", A: "Typically 40–80% for JPEG and 50–90% for PNG. Results vary by image content. Adjust the quality slider to balance file size and visual quality."},
			{Q: "Is there a file size or count limit?", A: "Up to 10 MB per file, 20 images at once, no daily or monthly limit. Completely free."},
			{Q: "Can I batch convert image formats?", A: "Yes. While compressing, choose your output format (JPG/PNG/WebP) and all images convert automatically at the same time."},
		}
	}
}

// ImgResizeFAQs returns FAQs for image resize tool
func ImgResizeFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "支持哪些图片格式？", A: "支持 JPG/JPEG、PNG 和 WebP 的输入与输出。调整大小的同时还可以转换图片格式，无需额外操作。"},
			{Q: "调整大小后画质会受影响吗？", A: "缩小图片通常能很好地保持画质。放大图片会有一定程度的画质损失。您可以通过质量滑块（适用于 JPG 和 WebP）在文件大小和画质之间取得平衡。"},
			{Q: "如何保持图片宽高比？", A: "默认启用宽高比锁定（宽高输入框之间显示链条图标）。点击链条图标可解锁，独立输入宽度和高度，适合创意裁剪或特殊格式需求。"},
			{Q: "像素、百分比和预设三种模式有何区别？", A: "像素模式用于指定精确的输出尺寸（如 1920×1080）；百分比模式按原图比例缩放（如 50% 即缩小一半）；预设模式提供常用社交媒体尺寸，一键应用，无需手动计算。"},
			{Q: "调整大小的操作安全吗？图片会上传到服务器吗？", A: "完全安全。调整大小的操作全程在您的浏览器内完成，使用 Canvas API 技术处理，图片文件不会发送到任何服务器，完全保护您的隐私。"},
			{Q: "输出格式有哪些选择？", A: "可选保持原格式、转为 JPG（兼容性最广）、转为 PNG（无损高质量）或转为 WebP（文件体积最小）。JPG 和 WebP 还支持质量滑块，方便您精细控制文件大小。"},
		}
	case "ja":
		return []FAQ{
			{Q: "対応している画像形式は？", A: "JPG/JPEG・PNG・WebPの入出力に対応。リサイズと同時に形式変換も可能です。"},
			{Q: "リサイズ後に画質は劣化しますか？", A: "縮小は画質をよく保ちます。拡大は多少の劣化が生じます。品質スライダー（JPG・WebP）でサイズと画質のバランスを調整できます。"},
			{Q: "アスペクト比を維持するには？", A: "デフォルトでアスペクト比ロックが有効です（幅・高さ入力間にチェーンアイコン）。クリックでロック解除し、独立した値を入力できます。"},
			{Q: "ピクセル・パーセンテージ・プリセットの違いは？", A: "ピクセルモードは正確な出力サイズを指定します。パーセンテージモードは元の割合でスケーリングします。プリセットモードはSNS向けの定番サイズをワンクリックで適用できます。"},
			{Q: "画像はサーバーに送信されますか？", A: "送信されません。すべての処理はCanvas APIを使用してブラウザ内で完結します。画像ファイルはいかなるサーバーにも送信されません。"},
			{Q: "出力形式はどれを選べますか？", A: "元の形式を維持・JPG（最大互換性）・PNG（ロスレス品質）・WebP（最小ファイルサイズ）から選択できます。JPGとWebPは品質スライダーでファイルサイズと画質のバランスを調整できます。"},
		}
	case "ko":
		return []FAQ{
			{Q: "어떤 이미지 형식을 지원하나요?", A: "JPG/JPEG, PNG, WebP 입출력을 지원합니다. 크기 조정과 동시에 형식 변환도 가능합니다."},
			{Q: "크기 조정 후 화질이 저하되나요?", A: "축소는 화질을 잘 유지합니다. 확대 시 약간의 품질 손실이 발생할 수 있습니다. 품질 슬라이더(JPG/WebP)로 파일 크기와 화질의 균형을 조절하세요."},
			{Q: "가로세로 비율을 유지하려면?", A: "기본적으로 비율 잠금이 활성화되어 있습니다(너비·높이 입력 사이의 체인 아이콘). 클릭하여 잠금 해제하면 독립적인 값을 입력할 수 있습니다."},
			{Q: "픽셀·퍼센트·프리셋 모드의 차이는?", A: "픽셀 모드는 정확한 출력 크기를 지정합니다. 퍼센트 모드는 원본 비율로 크기를 조절합니다. 프리셋 모드는 SNS 맞춤 크기를 한 번에 적용합니다."},
			{Q: "이미지가 서버에 업로드되나요?", A: "아니요. 모든 처리는 Canvas API를 사용하여 브라우저 내에서 완전히 이루어집니다. 이미지 파일은 어떤 서버에도 전송되지 않습니다."},
			{Q: "출력 형식은 어떤 것을 선택할 수 있나요?", A: "원본 유지, JPG(최대 호환성), PNG(무손실 품질), WebP(가장 작은 파일)를 선택할 수 있습니다. JPG·WebP는 품질 슬라이더로 파일 크기와 화질을 세밀하게 조절할 수 있습니다."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Qué formatos de imagen son compatibles?", A: "JPG/JPEG, PNG y WebP son compatibles tanto para entrada como para salida. También puedes convertir entre formatos mientras redimensionas."},
			{Q: "¿Se pierde calidad al redimensionar?", A: "Reducir el tamaño generalmente preserva bien la calidad. Al ampliar puede producirse alguna pérdida. El control deslizante de calidad (JPG/WebP) te permite equilibrar tamaño y calidad."},
			{Q: "¿Cómo mantengo la relación de aspecto?", A: "El bloqueo de relación de aspecto está activado por defecto (icono de cadena entre ancho y alto). Haz clic para desbloquear e introducir valores independientes."},
			{Q: "¿Cuál es la diferencia entre píxeles, porcentaje y presets?", A: "El modo Píxeles especifica dimensiones exactas de salida. El modo Porcentaje escala la imagen en relación al tamaño original. El modo Presets aplica tamaños habituales de redes sociales con un solo clic."},
			{Q: "¿Se sube el archivo al servidor al redimensionar?", A: "No. Todo el procesamiento se realiza localmente en tu navegador usando la API Canvas. Los archivos de imagen nunca se envían a ningún servidor."},
			{Q: "¿Qué formatos de salida puedo elegir?", A: "Puedes mantener el formato original, convertir a JPG (máxima compatibilidad), PNG (calidad sin pérdidas) o WebP (archivo más pequeño). Para JPG y WebP, el control de calidad permite ajustar el equilibrio entre tamaño y fidelidad visual."},
		}
	default:
		return []FAQ{
			{Q: "What image formats are supported?", A: "JPG/JPEG, PNG, and WebP are supported for both input and output. You can also convert between formats while resizing in a single step."},
			{Q: "Will resizing affect image quality?", A: "Scaling down generally preserves quality well. When scaling up, some quality loss is expected. You can adjust the output quality slider (for JPG and WebP) to balance file size and visual quality."},
			{Q: "How do I keep the aspect ratio?", A: "The aspect ratio lock is enabled by default (shown as a chain icon between width and height). Click the chain icon to unlock and enter custom width and height independently."},
			{Q: "What is the difference between Pixels, Percentage and Preset modes?", A: "Pixel mode lets you specify exact output dimensions. Percentage mode scales the image relative to its original size. Preset mode applies common social media sizes with a single click — no manual calculation needed."},
			{Q: "Are my images uploaded to a server?", A: "No. All processing is done entirely in your browser using the Canvas API. Your images are never uploaded to any server, ensuring complete privacy."},
			{Q: "What output formats can I choose?", A: "You can keep the original format, convert to JPG (widest compatibility), PNG (lossless quality), or WebP (smallest file size). A quality slider is available for JPG and WebP to fine-tune the file-size-to-quality trade-off."},
		}
	}
}

// ImgMetadataFAQs returns FAQs for image metadata viewer
func ImgMetadataFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "图片会上传到服务器吗？", A: "不会。元数据提取完全在您的浏览器内完成，使用 exifr.js 库进行解析，图片文件不会发送到任何服务器，完全保护您的隐私。"},
			{Q: "支持哪些图片格式？", A: "支持 JPEG/JPG、PNG、WebP、TIFF 和 HEIC/HEIF 格式。EXIF 数据最常见于数码相机和智能手机拍摄的 JPEG 文件。"},
			{Q: "可以查看哪些元数据？", A: "可查看 EXIF 数据（相机品牌/型号、光圈、快门速度、ISO、焦距、拍摄时间）、GPS 位置（经纬度、海拔）、IPTC 数据（版权、作者、关键词、描述）以及 XMP 数据（评级、软件、色彩空间）。"},
			{Q: "为什么某些元数据缺失？", A: "社交媒体平台、即时通讯软件或图片编辑器可能会在处理图片时自动删除元数据。从 Instagram、微信等平台下载的图片，大部分 EXIF 数据已被删除。"},
			{Q: "可以在地图上看到 GPS 位置吗？", A: "可以。如果图片包含 GPS 坐标，我们会显示一个嵌入式 OpenStreetMap 预览地图，精确显示照片的拍摄地点。"},
			{Q: "如何导出元数据？", A: "分析完成后，可将元数据导出为 JSON（结构化数据）、CSV（表格格式）或 TXT（人类可读报告）。多张图片时，可打包下载全部结果为 ZIP。"},
		}
	case "ja":
		return []FAQ{
			{Q: "画像はサーバーにアップロードされますか？", A: "いいえ。メタデータ抽出はexifr.jsライブラリを使用してブラウザ内で完全に処理されます。画像ファイルはいかなるサーバーにも送信されません。"},
			{Q: "対応している画像形式は？", A: "JPEG/JPG・PNG・WebP・TIFF・HEIC/HEIFに対応。EXIFデータはデジタルカメラやスマートフォンで撮影したJPEGファイルに最も多く含まれています。"},
			{Q: "どんなメタデータを確認できますか？", A: "EXIFデータ（カメラメーカー/モデル・絞り・シャッタースピード・ISO・焦点距離・撮影日時）・GPS位置情報（緯度・経度・高度）・IPTCデータ（著作権・作者・キーワード）・XMPデータ（評価・ソフト・色空間）を表示できます。"},
			{Q: "一部のメタデータが見当たらないのはなぜ？", A: "SNSプラットフォーム・メッセージアプリ・画像編集ソフトが処理時にメタデータを削除する場合があります。Instagram等からダウンロードした画像はほとんどのEXIFデータが削除されています。"},
			{Q: "GPS位置情報をマップで確認できますか？", A: "はい。GPS座標が含まれる画像にはOpenStreetMapのインタラクティブプレビューが表示され、撮影場所を正確に確認できます。"},
			{Q: "メタデータをエクスポートするには？", A: "解析後、JSON（構造化データ）・CSV（スプレッドシート用）・TXT（人間が読みやすい形式）でエクスポートできます。複数画像はZIPにまとめてダウンロード可能です。"},
		}
	case "ko":
		return []FAQ{
			{Q: "이미지가 서버에 업로드되나요?", A: "아니요. 메타데이터 추출은 exifr.js 라이브러리를 사용하여 브라우저에서 완전히 처리됩니다. 이미지 파일은 어떤 서버에도 전송되지 않습니다."},
			{Q: "어떤 이미지 형식을 지원하나요?", A: "JPEG/JPG, PNG, WebP, TIFF, HEIC/HEIF를 지원합니다. EXIF 데이터는 디지털 카메라와 스마트폰으로 촬영한 JPEG 파일에 가장 많이 포함되어 있습니다."},
			{Q: "어떤 메타데이터를 볼 수 있나요?", A: "EXIF 데이터(카메라 제조사/모델, 조리개, 셔터 속도, ISO, 초점 거리, 촬영 날짜), GPS 위치(위도, 경도, 고도), IPTC 데이터(저작권, 작성자, 키워드), XMP 데이터(평점, 소프트웨어, 색 공간)를 확인할 수 있습니다."},
			{Q: "일부 메타데이터가 없는 이유는?", A: "SNS 플랫폼, 메시지 앱, 이미지 편집기가 처리 시 메타데이터를 삭제할 수 있습니다. Instagram 등에서 다운로드한 이미지는 대부분의 EXIF 데이터가 제거되어 있습니다."},
			{Q: "지도에서 GPS 위치를 볼 수 있나요?", A: "네. GPS 좌표가 포함된 이미지에는 OpenStreetMap 인터랙티브 미리보기가 표시되어 촬영 위치를 정확히 확인할 수 있습니다."},
			{Q: "메타데이터를 내보내려면?", A: "분석 후 JSON(구조화 데이터), CSV(스프레드시트 형식), TXT(읽기 쉬운 보고서)로 내보낼 수 있습니다. 여러 이미지는 ZIP으로 일괄 다운로드할 수 있습니다."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿La imagen se sube al servidor?", A: "No. La extracción de metadatos se realiza completamente en tu navegador usando la biblioteca exifr.js. Los archivos de imagen nunca se envían a ningún servidor."},
			{Q: "¿Qué formatos de imagen son compatibles?", A: "JPEG/JPG, PNG, WebP, TIFF y HEIC/HEIF. Los datos EXIF se encuentran más comúnmente en archivos JPEG de cámaras digitales y smartphones."},
			{Q: "¿Qué metadatos puedo ver?", A: "Datos EXIF (marca/modelo de cámara, apertura, velocidad de obturación, ISO, longitud focal, fecha/hora), ubicación GPS (latitud, longitud, altitud), datos IPTC (copyright, autor, palabras clave) y datos XMP (valoración, software, espacio de color)."},
			{Q: "¿Por qué faltan algunos metadatos?", A: "Las redes sociales, apps de mensajería o editores de imagen pueden eliminar metadatos al procesar las fotos. Las imágenes descargadas de Instagram u otras plataformas suelen tener la mayoría de datos EXIF eliminados."},
			{Q: "¿Puedo ver la ubicación GPS en un mapa?", A: "Sí. Si la imagen contiene coordenadas GPS, mostramos un mapa interactivo de OpenStreetMap que indica exactamente dónde se tomó la foto."},
			{Q: "¿Cómo exporto los metadatos?", A: "Tras el análisis, puedes exportar como JSON (datos estructurados), CSV (formato hoja de cálculo) o TXT (informe legible). Para varias imágenes, descarga todos los resultados como un ZIP."},
		}
	default:
		return []FAQ{
			{Q: "Is my image uploaded to a server?", A: "No. All metadata extraction is performed entirely in your browser using the exifr.js library. Your images are never sent to any server, ensuring complete privacy."},
			{Q: "What image formats are supported?", A: "JPEG/JPG, PNG, WebP, TIFF, and HEIC/HEIF are supported. EXIF data is most commonly embedded in JPEG files from digital cameras and smartphones."},
			{Q: "What metadata can I see?", A: "You can view EXIF data (camera make/model, aperture, shutter speed, ISO, focal length, date/time), GPS location (latitude, longitude, altitude with map preview), IPTC data (copyright, author, keywords, caption), and XMP data (rating, software, color space)."},
			{Q: "Why is some metadata missing?", A: "Metadata can be stripped by social media platforms, messaging apps, or photo editors. If you download a photo from Instagram or WhatsApp, most EXIF data will have been removed for privacy reasons."},
			{Q: "Can I see the GPS location on a map?", A: "Yes. If your image contains GPS coordinates, we display an interactive OpenStreetMap preview showing exactly where the photo was taken."},
			{Q: "How do I export the metadata?", A: "After analyzing your image, you can export the metadata as JSON (structured data), CSV (spreadsheet-compatible), or TXT (human-readable report). For multiple images, you can download all results as a ZIP file."},
		}
	}
}

// ImgToolboxFAQs returns FAQs for image toolbox sub-tools
// Supported tools: crop, convert-to-jpg, jpg-to-image, photo-editor, remove-bg, watermark, rotate
func ImgToolboxFAQs(lang, tool string) []FAQ {
	switch tool {
	case "crop":
		return imgCropFAQs(lang)
	case "convert-to-jpg":
		return imgConvertToJpgFAQs(lang)
	case "jpg-to-image":
		return imgJpgToImageFAQs(lang)
	case "photo-editor":
		return imgPhotoEditorFAQs(lang)
	case "remove-bg":
		return imgRemoveBgFAQs(lang)
	case "watermark":
		return imgWatermarkFAQs(lang)
	case "watermark-guide":
		return imgWatermarkGuideFAQs(lang)
	case "rotate":
		return imgRotateFAQs(lang)
	case "ocr":
		return imgOCRFAQs(lang)
	case "to-video":
		return imgToVideoFAQs(lang)
	case "to-pdf":
		return imgToPDFFAQs(lang)
	default:
		return imgCropFAQs(lang)
	}
}

func imgCropFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "支持哪些图片格式？", A: "支持 JPG、PNG、WEBP、GIF、BMP、SVG 等主流格式，上传后自动识别。"},
			{Q: "裁剪后图片质量会下降吗？", A: "不会。裁剪操作通过 Canvas 无损完成，输出画质与原图一致。"},
			{Q: "我的图片会上传到服务器吗？", A: "不会。所有处理均在您的浏览器本地完成，图片文件不会离开您的设备。"},
			{Q: "可以批量裁剪多张图片吗？", A: "支持！您可以一次上传多张图片，系统会按照相同的裁剪参数批量处理。"},
			{Q: "如何精确裁剪到指定尺寸？", A: "在选项面板中切换到「自定义尺寸」模式，输入目标宽高（像素）即可精确裁剪。"},
		}
	case "ja":
		return []FAQ{
			{Q: "対応している画像形式は？", A: "JPG・PNG・WebP・GIF・BMP・SVGなど主要形式に対応し、アップロード時に自動認識します。"},
			{Q: "切り抜き後に画質は落ちますか？", A: "いいえ。Canvas APIを使用した無損失処理で、出力画質は元の画像と同じです。"},
			{Q: "画像はサーバーにアップロードされますか？", A: "されません。すべての処理はブラウザ内でローカルに完結し、ファイルはデバイスを離れません。"},
			{Q: "複数の画像を一括切り抜きできますか？", A: "はい！複数ファイルをアップロードすると、同じ切り抜きパラメータが一括適用されます。"},
			{Q: "特定のサイズに正確に切り抜くには？", A: "「カスタムサイズ」モードに切り替え、目標の幅と高さ（ピクセル）を入力してください。"},
		}
	case "ko":
		return []FAQ{
			{Q: "어떤 이미지 형식을 지원하나요?", A: "JPG, PNG, WebP, GIF, BMP, SVG 등 주요 형식을 지원하며 업로드 시 자동 인식됩니다."},
			{Q: "자르기 후 화질이 저하되나요?", A: "아니요. Canvas API를 통한 무손실 처리로 출력 화질이 원본과 동일합니다."},
			{Q: "이미지가 서버에 업로드되나요?", A: "아니요. 모든 처리는 브라우저에서 로컬로 완료되며 파일이 기기를 벗어나지 않습니다."},
			{Q: "여러 이미지를 일괄 자를 수 있나요?", A: "네! 여러 파일을 업로드하면 동일한 자르기 설정이 일괄 적용됩니다."},
			{Q: "특정 크기로 정확히 자르려면?", A: "'사용자 지정 크기' 모드로 전환하고 목표 너비와 높이(픽셀)를 입력하세요."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Qué formatos de imagen son compatibles?", A: "JPG, PNG, WebP, GIF, BMP y SVG están soportados y se detectan automáticamente al subir."},
			{Q: "¿La calidad disminuye al recortar?", A: "No. El recorte se realiza sin pérdidas mediante Canvas API y la calidad de salida es idéntica al original."},
			{Q: "¿Mis imágenes se suben al servidor?", A: "Nunca. Todo el procesamiento ocurre localmente en tu navegador — los archivos no salen de tu dispositivo."},
			{Q: "¿Puedo recortar varias imágenes a la vez?", A: "¡Sí! Sube varios archivos y los mismos parámetros de recorte se aplicarán a todos en lote."},
			{Q: "¿Cómo recorto a un tamaño exacto en píxeles?", A: "Cambia al modo 'Tamaño personalizado' en el panel de opciones e introduce el ancho y alto objetivo en píxeles."},
		}
	default:
		return []FAQ{
			{Q: "What image formats can I crop?", A: "JPG, PNG, WEBP, GIF, BMP and SVG are all supported and auto-detected on upload."},
			{Q: "Will cropping reduce image quality?", A: "No. Cropping is performed losslessly via Canvas API and output quality matches the original."},
			{Q: "Are my images uploaded to your servers?", A: "Never. All processing happens locally in your browser — your files never leave your device."},
			{Q: "Can I crop multiple images at once?", A: "Yes! Upload multiple files and the same crop parameters will be applied to all of them in batch."},
			{Q: "How do I crop to an exact pixel size?", A: "Switch to 'Custom Size' mode in the options panel, enter your target width and height in pixels."},
		}
	}
}

func imgConvertToJpgFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "支持哪些格式转换为JPG？", A: "支持 PNG、WEBP、GIF、BMP、SVG 和 TIFF 转换为 JPG。"},
			{Q: "质量滑块有什么作用？", A: "控制 JPG 压缩级别。质量越高文件越大；质量越低文件越小但会有损失。"},
			{Q: "图片透明背景会保留吗？", A: "JPG 不支持透明度。透明区域默认填充为白色背景。"},
			{Q: "有文件大小限制吗？", A: "每个文件不超过 20MB，一次最多处理 30 个文件。"},
			{Q: "可以转换动态GIF吗？", A: "可以，但只会转换 GIF 的第一帧为静态 JPG。"},
		}
	case "ja":
		return []FAQ{
			{Q: "JPGに変換できる形式は？", A: "PNG・WebP・GIF・BMP・SVG・TIFFをJPGに変換できます。"},
			{Q: "品質スライダーの役割は？", A: "JPGの圧縮レベルを制御します。高品質ほどファイルが大きくなり、低品質ほど小さくなりますが画質が低下します。"},
			{Q: "透明背景は保持されますか？", A: "JPGは透明度に対応していません。透明部分はデフォルトで白背景で塗りつぶされます。"},
			{Q: "ファイルサイズ制限はありますか？", A: "1ファイル最大20MB、一度に最大30ファイルまで処理できます。"},
			{Q: "アニメーションGIFを変換できますか？", A: "はい。ただしGIFの最初のフレームのみが静止JPGとして変換されます。"},
		}
	case "ko":
		return []FAQ{
			{Q: "JPG로 변환할 수 있는 형식은?", A: "PNG, WebP, GIF, BMP, SVG, TIFF를 JPG로 변환할 수 있습니다."},
			{Q: "품질 슬라이더의 역할은?", A: "JPG 압축 수준을 조절합니다. 높은 품질일수록 파일이 크고, 낮은 품질일수록 작아지지만 품질이 저하됩니다."},
			{Q: "투명 배경이 유지되나요?", A: "JPG는 투명도를 지원하지 않습니다. 투명 영역은 기본적으로 흰색 배경으로 채워집니다."},
			{Q: "파일 크기 제한이 있나요?", A: "파일당 최대 20MB, 한 번에 최대 30개 파일을 처리할 수 있습니다."},
			{Q: "애니메이션 GIF를 변환할 수 있나요?", A: "네. 단, GIF의 첫 번째 프레임만 정적 JPG로 변환됩니다."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Qué formatos puedo convertir a JPG?", A: "PNG, WebP, GIF, BMP, SVG y TIFF se pueden convertir a JPG."},
			{Q: "¿Para qué sirve el control de calidad?", A: "Controla el nivel de compresión JPG. Mayor calidad significa archivos más grandes; menor calidad significa archivos más pequeños con algo de pérdida."},
			{Q: "¿Se conserva el fondo transparente?", A: "JPG no admite transparencia. Las áreas transparentes se rellenan con fondo blanco por defecto."},
			{Q: "¿Hay límite de tamaño de archivo?", A: "Hasta 20 MB por archivo y 30 archivos a la vez."},
			{Q: "¿Puedo convertir GIFs animados?", A: "Sí, pero solo se convertirá el primer fotograma del GIF como JPG estático."},
		}
	default:
		return []FAQ{
			{Q: "Which formats can I convert to JPG?", A: "PNG, WEBP, GIF, BMP, SVG and TIFF can all be converted to JPG."},
			{Q: "What does the quality slider do?", A: "It controls JPG compression level. Higher quality means larger file size; lower quality means smaller files with some loss."},
			{Q: "Will transparent backgrounds be preserved?", A: "JPG does not support transparency. Transparent areas will be filled with a white background by default."},
			{Q: "Is there a file size limit?", A: "Each file must be under 20MB, and you can process up to 30 files at once."},
			{Q: "Can I convert animated GIFs to JPG?", A: "Yes, but only the first frame of the GIF will be converted to a static JPG."},
		}
	}
}

func imgJpgToImageFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "JPG可以转换为哪些格式？", A: "可以将 JPG 转换为 PNG、WEBP、GIF、BMP 等格式。"},
			{Q: "哪种格式支持透明背景？", A: "PNG 和 WEBP 均支持透明背景，PNG 的兼容性更广泛。"},
			{Q: "WEBP是什么格式，有什么优势？", A: "WEBP 是 Google 开发的现代图片格式，在相同质量下比 JPG 体积更小。"},
			{Q: "转换会影响图片质量吗？", A: "转换为 PNG 是无损的。转换为 WEBP 在默认设置下质量损失极小。"},
			{Q: "可以批量转换多个JPG文件吗？", A: "支持！一次上传最多 30 个 JPG 文件，一键转换为您选择的格式。"},
		}
	case "ja":
		return []FAQ{
			{Q: "JPGをどの形式に変換できますか？", A: "JPGをPNG・WebP・GIF・BMPなどの形式に変換できます。"},
			{Q: "透明背景に対応している形式は？", A: "PNGとWebPが透明背景に対応しています。互換性を重視する場合はPNGをお選びください。"},
			{Q: "WebPとは何ですか？利点は？", A: "WebPはGoogleが開発した現代の画像形式で、同じ品質でJPGより小さいファイルサイズを実現します。"},
			{Q: "変換で画質は変わりますか？", A: "PNGへの変換はロスレスです。WebPへの変換はデフォルト設定で画質損失が極めて少ないです。"},
			{Q: "複数のJPGファイルを一括変換できますか？", A: "はい！最大30個のJPGファイルを一度にアップロードし、選択した形式に一括変換できます。"},
		}
	case "ko":
		return []FAQ{
			{Q: "JPG를 어떤 형식으로 변환할 수 있나요?", A: "JPG를 PNG, WebP, GIF, BMP 등의 형식으로 변환할 수 있습니다."},
			{Q: "투명 배경을 지원하는 형식은?", A: "PNG와 WebP 모두 투명 배경을 지원합니다. 최대 호환성을 위해서는 PNG를 선택하세요."},
			{Q: "WebP란 무엇이고 장점은?", A: "WebP는 Google이 개발한 현대적인 이미지 형식으로 동일한 품질에서 JPG보다 파일 크기가 작습니다."},
			{Q: "변환이 이미지 품질에 영향을 미치나요?", A: "PNG 변환은 무손실입니다. WebP 변환은 기본 설정에서 품질 손실이 최소화됩니다."},
			{Q: "여러 JPG 파일을 일괄 변환할 수 있나요?", A: "네! 최대 30개의 JPG 파일을 한 번에 업로드하여 선택한 형식으로 변환하세요."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿A qué formatos puedo convertir JPG?", A: "Puedes convertir JPG a PNG, WebP, GIF, BMP y más formatos."},
			{Q: "¿Qué formato es mejor para fondo transparente?", A: "PNG y WebP admiten transparencia. Elige PNG para máxima compatibilidad."},
			{Q: "¿Qué es WebP y por qué usarlo?", A: "WebP es un formato moderno de Google que ofrece mejor compresión que JPG manteniendo la calidad."},
			{Q: "¿La conversión afecta la calidad?", A: "La conversión a PNG es sin pérdidas. La conversión a WebP tiene pérdida mínima con la configuración predeterminada."},
			{Q: "¿Puedo convertir varios JPG a la vez?", A: "Sí, sube hasta 30 archivos JPG y conviértelos todos al formato elegido de una vez."},
		}
	default:
		return []FAQ{
			{Q: "Which formats can I convert JPG to?", A: "You can convert JPG to PNG, WEBP, GIF, BMP and more formats."},
			{Q: "Which format should I choose for transparency?", A: "PNG and WEBP both support transparency. Choose PNG for maximum compatibility."},
			{Q: "What is WEBP and why use it?", A: "WEBP is a modern format by Google that provides better compression than JPG while maintaining quality."},
			{Q: "Will converting change the image quality?", A: "Converting to PNG is lossless. Converting to WEBP may have minimal quality loss at default settings."},
			{Q: "Can I batch convert multiple JPG files?", A: "Yes, upload up to 30 JPG files and convert them all to your chosen format at once."},
		}
	}
}

func imgPhotoEditorFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "可以调整哪些图片参数？", A: "支持调整亮度、对比度、饱和度、锐化和模糊，拖动滑块实时预览。"},
			{Q: "可以在下载前预览效果吗？", A: "可以，Canvas 预览区会随着滑块实时更新（500ms防抖）。"},
			{Q: "如何重置所有调整？", A: "点击「重置」按钮，所有滑块恢复到默认中性值。"},
			{Q: "编辑会修改原始文件吗？", A: "不会。原始文件从不被修改，您下载的只是编辑后的副本。"},
			{Q: "可以批量编辑多张照片吗？", A: "支持！相同的调整参数会应用到所有上传的图片上。"},
		}
	case "ja":
		return []FAQ{
			{Q: "どのような写真パラメータを調整できますか？", A: "明るさ・コントラスト・彩度・シャープネス・ぼかしをスライダーでリアルタイム調整できます。"},
			{Q: "ダウンロード前に効果をプレビューできますか？", A: "はい。Canvasプレビューエリアがスライダー操作に合わせてリアルタイム更新されます（500ms デバウンス）。"},
			{Q: "すべての調整をリセットするには？", A: "「リセット」ボタンをクリックすると、すべてのスライダーがデフォルト値に戻ります。"},
			{Q: "編集で元のファイルは変更されますか？", A: "されません。元ファイルは常に変更されず、ダウンロードするのは編集後のコピーのみです。"},
			{Q: "複数の写真を一括編集できますか？", A: "はい！同じ調整パラメータがアップロードしたすべての画像に適用されます。"},
		}
	case "ko":
		return []FAQ{
			{Q: "어떤 이미지 파라미터를 조정할 수 있나요?", A: "밝기, 대비, 채도, 선명도, 블러를 슬라이더로 실시간 조정할 수 있습니다."},
			{Q: "다운로드 전에 효과를 미리 볼 수 있나요?", A: "네. Canvas 미리보기 영역이 슬라이더 조작에 따라 실시간 업데이트됩니다(500ms 디바운스)."},
			{Q: "모든 조정을 초기화하려면?", A: "'초기화' 버튼을 클릭하면 모든 슬라이더가 기본값으로 돌아갑니다."},
			{Q: "편집이 원본 파일을 수정하나요?", A: "아니요. 원본 파일은 절대 수정되지 않으며 편집된 사본만 다운로드됩니다."},
			{Q: "여러 사진을 일괄 편집할 수 있나요?", A: "네! 동일한 조정 설정이 업로드된 모든 이미지에 적용됩니다."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Qué parámetros de imagen puedo ajustar?", A: "Brillo, contraste, saturación, nitidez y desenfoque con control en tiempo real mediante sliders."},
			{Q: "¿Puedo previsualizar el efecto antes de descargar?", A: "Sí. El área de vista previa Canvas se actualiza en tiempo real al mover cualquier slider (500ms debounce)."},
			{Q: "¿Cómo restablecer todos los ajustes?", A: "Haz clic en 'Restablecer' y todos los sliders volverán a sus valores predeterminados neutrales."},
			{Q: "¿La edición modifica el archivo original?", A: "No. El archivo original nunca se modifica. Solo descargas la copia editada."},
			{Q: "¿Puedo editar varias fotos a la vez?", A: "¡Sí! Los mismos parámetros de ajuste se aplican a todas las imágenes subidas."},
		}
	default:
		return []FAQ{
			{Q: "What adjustments can I make to my photos?", A: "You can adjust brightness, contrast, saturation, sharpness and blur using real-time sliders."},
			{Q: "Can I preview changes before downloading?", A: "Yes, the canvas preview updates in real time as you move any slider (with a 500ms debounce)."},
			{Q: "Can I reset all adjustments?", A: "Yes, click the 'Reset' button to restore all sliders to their default neutral values."},
			{Q: "Does editing affect the original file?", A: "No, your original file is never modified. You download only the edited version."},
			{Q: "Can I edit multiple photos at once?", A: "Yes, the same adjustment settings are applied to all uploaded photos in batch."},
		}
	}
}

func imgRemoveBgFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "AI抠图是如何工作的？", A: "我们使用基于 WebAssembly 的 AI 模型，完全在您的浏览器中运行，不会向任何服务器发送数据。"},
			{Q: "什么类型的图片效果最好？", A: "主体与背景对比清晰的图片效果最佳，如人像、产品图和 Logo。"},
			{Q: "处理需要多长时间？", A: "首次运行需下载 AI 模型（约10秒）。后续每张图片处理约需 2-5 秒。"},
			{Q: "输出格式是什么？", A: "输出为带透明背景的 PNG 文件，可直接用于任何背景。"},
			{Q: "图片大小有限制吗？", A: "每张图片建议不超过 20MB 以获得最佳性能，过大的图片可能会降低 AI 处理速度。"},
		}
	case "ja":
		return []FAQ{
			{Q: "AI背景除去はどのように機能しますか？", A: "WebAssemblyベースのAIモデルを使用し、完全にブラウザ内で動作します。いかなるサーバーにもデータを送信しません。"},
			{Q: "どんな画像が最も効果的ですか？", A: "被写体と背景のコントラストが明確な画像が最適です。人物・製品・ロゴ画像で優れた結果が得られます。"},
			{Q: "処理にどのくらい時間がかかりますか？", A: "初回はAIモデルのダウンロードが必要です（約10秒）。その後は1枚あたり2〜5秒で処理されます。"},
			{Q: "出力形式は何ですか？", A: "透明背景のPNGファイルとして出力され、どんな背景にも即座に使用できます。"},
			{Q: "画像サイズに制限はありますか？", A: "最良のパフォーマンスのために1枚20MB以下を推奨します。大きすぎる画像はAI処理が遅くなる場合があります。"},
		}
	case "ko":
		return []FAQ{
			{Q: "AI 배경 제거는 어떻게 작동하나요?", A: "WebAssembly 기반 AI 모델을 사용하여 브라우저에서 완전히 실행됩니다. 어떤 서버에도 데이터를 전송하지 않습니다."},
			{Q: "어떤 이미지가 가장 효과적인가요?", A: "피사체와 배경 간 대비가 명확한 이미지가 가장 좋습니다. 인물, 제품, 로고 이미지에서 훌륭한 결과를 얻을 수 있습니다."},
			{Q: "처리 시간이 얼마나 걸리나요?", A: "첫 번째 실행 시 AI 모델을 다운로드합니다(약 10초). 이후 각 이미지는 2~5초 안에 처리됩니다."},
			{Q: "출력 형식은 무엇인가요?", A: "투명 배경의 PNG 파일로 출력되어 어떤 배경에도 바로 사용할 수 있습니다."},
			{Q: "이미지 크기 제한이 있나요?", A: "최적의 성능을 위해 이미지당 20MB 이하를 권장합니다. 너무 큰 이미지는 AI 처리 속도가 느려질 수 있습니다."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Cómo funciona la eliminación de fondo por IA?", A: "Usamos un modelo de IA basado en WebAssembly que se ejecuta completamente en tu navegador sin enviar datos a ningún servidor."},
			{Q: "¿Qué tipo de imágenes dan mejores resultados?", A: "Las imágenes con contraste claro entre sujeto y fondo funcionan mejor. Retratos, productos y logos dan excelentes resultados."},
			{Q: "¿Cuánto tiempo tarda el procesamiento?", A: "La primera ejecución descarga el modelo de IA (unos 10 segundos). Las imágenes siguientes se procesan en 2-5 segundos cada una."},
			{Q: "¿En qué formato es la salida?", A: "La salida es un archivo PNG con fondo transparente, listo para usar sobre cualquier fondo."},
			{Q: "¿Hay límite de tamaño de imagen?", A: "Se recomienda menos de 20 MB por imagen para un rendimiento óptimo. Las imágenes demasiado grandes pueden ralentizar el procesamiento de IA."},
		}
	default:
		return []FAQ{
			{Q: "How does background removal work?", A: "We use an AI model powered by WebAssembly that runs entirely in your browser — no data is sent to any server."},
			{Q: "What types of images work best?", A: "Images with clear subject-background contrast work best. Portraits, products and logos give great results."},
			{Q: "How long does processing take?", A: "The first run downloads the AI model (about 10 seconds). Subsequent images process in 2–5 seconds each."},
			{Q: "What format is the output?", A: "The output is a PNG with a transparent background, ready to use on any background."},
			{Q: "Is there a limit on image size?", A: "Each image should be under 20MB for best performance. Larger images may slow down the AI model."},
		}
	}
}

func imgWatermarkFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "可以同时添加文字和图片水印吗？", A: "可以选择文字水印（自定义字体和颜色）或图片水印（上传您的Logo），两种模式独立使用。"},
			{Q: "如何选择水印位置？", A: "使用 3×3 位置网格，点击您想要的位置：左上、居中、右下等，非常直观。"},
			{Q: "可以调整水印透明度吗？", A: "可以，透明度滑块支持 10% 到 100% 的调节。"},
			{Q: "添加水印会影响图片质量吗？", A: "不会，水印渲染在图片副本的 Canvas 上，输出质量与原图一致。"},
			{Q: "可以批量添加水印吗？", A: "支持！上传多张图片，相同的水印设置会应用到所有图片上。"},
		}
	case "ja":
		return []FAQ{
			{Q: "テキストと画像の両方のウォーターマークを追加できますか？", A: "テキストウォーターマーク（カスタムフォント・色）または画像ウォーターマーク（ロゴをアップロード）を選択できます。2種類のモードは独立して使用します。"},
			{Q: "ウォーターマークの位置はどう選択しますか？", A: "3×3の位置グリッドで希望の位置をクリックします：左上・中央・右下など、直感的に操作できます。"},
			{Q: "ウォーターマークの透明度を調整できますか？", A: "はい。透明度スライダーで10%から100%の範囲で調整できます。"},
			{Q: "ウォーターマーク追加で画質は変わりますか？", A: "変わりません。ウォーターマークは画像コピーのCanvasにレンダリングされ、出力品質は元の画像と同じです。"},
			{Q: "複数の画像に一括でウォーターマークを追加できますか？", A: "はい！複数の画像をアップロードすると、同じウォーターマーク設定がすべてに適用されます。"},
		}
	case "ko":
		return []FAQ{
			{Q: "텍스트와 이미지 워터마크를 모두 추가할 수 있나요?", A: "텍스트 워터마크(커스텀 폰트와 색상) 또는 이미지 워터마크(로고 업로드)를 선택할 수 있습니다. 두 모드는 독립적으로 사용합니다."},
			{Q: "워터마크 위치는 어떻게 선택하나요?", A: "3×3 위치 격자에서 원하는 위치를 클릭합니다: 왼쪽 상단, 중앙, 오른쪽 하단 등 직관적으로 조작할 수 있습니다."},
			{Q: "워터마크 투명도를 조정할 수 있나요?", A: "네. 투명도 슬라이더로 10%부터 100%까지 조정할 수 있습니다."},
			{Q: "워터마크 추가가 이미지 품질에 영향을 미치나요?", A: "아니요. 워터마크는 이미지 복사본의 Canvas에 렌더링되며 출력 품질이 원본과 동일합니다."},
			{Q: "여러 이미지에 워터마크를 일괄 추가할 수 있나요?", A: "네! 여러 이미지를 업로드하면 동일한 워터마크 설정이 모두에 적용됩니다."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Puedo añadir marcas de agua de texto e imagen?", A: "Puedes elegir marca de agua de texto (fuente y color personalizados) o de imagen (sube tu logo). Ambos modos se usan de forma independiente."},
			{Q: "¿Cómo elijo la posición de la marca de agua?", A: "Usa la cuadrícula de posición 3×3 y haz clic donde quieras: arriba-izquierda, centro, abajo-derecha, etc. Muy intuitivo."},
			{Q: "¿Puedo ajustar la transparencia de la marca de agua?", A: "Sí. El slider de opacidad permite ajustar de 10% a 100%."},
			{Q: "¿Añadir la marca de agua afecta la calidad?", A: "No. La marca de agua se renderiza en el Canvas de una copia de la imagen y la calidad de salida es idéntica al original."},
			{Q: "¿Puedo añadir marcas de agua en lote?", A: "¡Sí! Sube varias imágenes y la misma configuración de marca de agua se aplicará a todas."},
		}
	default:
		return []FAQ{
			{Q: "Can I add both text and image watermarks?", A: "Yes, you can choose between text watermark (custom font and color) or image watermark (upload your logo)."},
			{Q: "How do I choose the watermark position?", A: "Use the 3×3 position grid to click where you want the watermark: top-left, center, bottom-right, etc."},
			{Q: "Can I adjust watermark transparency?", A: "Yes, the opacity slider lets you set transparency from 10% to 100%."},
			{Q: "Will the watermark affect image quality?", A: "No, watermarks are rendered on a Canvas copy of your image. The output quality is identical to the original."},
			{Q: "Can I batch watermark multiple images?", A: "Yes, upload multiple images and the same watermark settings will be applied to all of them."},
		}
	}
}

func imgWatermarkGuideFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "什么是图片水印？", A: "图片水印是放置在照片或图形顶部的可见覆盖层，用于标识所有权、保护版权或品牌内容。水印可以是文字（如公司名称或版权声明）或图片（如Logo）。"},
			{Q: "支持哪些图片格式？", A: "支持 JPG、PNG、WebP 等主流格式。所有处理在浏览器本地完成，无需上传服务器。"},
			{Q: "可以添加文字和图片水印吗？", A: "可以。您可以选择文字水印（自定义字体、大小和颜色）或图片水印（上传您的Logo），两种模式独立使用。"},
			{Q: "如何调整水印位置？", A: "使用 3×3 位置网格点击选择位置，或直接在预览画布上拖拽水印到任意位置。"},
			{Q: "批量水印会应用相同设置吗？", A: "是的。上传多张图片后，相同的水印设置会应用到所有图片上，适合电商商品图和摄影作品批量处理。"},
			{Q: "平铺水印能防止盗图吗？", A: "平铺水印可以增加盗用成本，但无法完全防止裁剪、覆盖或二次编辑。"},
			{Q: "图片会上传到服务器吗？", A: "不会。所有水印处理在浏览器本地完成，图片不会离开您的设备。"},
			{Q: "支持哪些输出格式？", A: "可以选择保留原格式，或导出为 JPG、PNG 或 WebP。JPG 和 WebP 支持质量调节。"},
		}
	case "ja":
		return []FAQ{
			{Q: "画像ウォーターマークとは何ですか？", A: "画像ウォーターマークは、写真やグラフィックの上に重ねる目に見えるマークで、所有権の識別、著作権の保護、またはブランドコンテンツの表示に使用されます。"},
			{Q: "どの画像形式をサポートしていますか？", A: "JPG、PNG、WebPなどの主要形式をサポートしています。すべての処理はブラウザ内でローカルに行われます。"},
			{Q: "テキストと画像のウォーターマークの両方を追加できますか？", A: "はい。テキストウォーターマーク（フォント、サイズ、色のカスタマイズ）または画像ウォーターマーク（ロゴのアップロード）を選択できます。"},
			{Q: "ウォーターマークの位置はどう調整しますか？", A: "3×3の位置グリッドでクリックするか、プレビューキャンバス上で直接ドラッグして任意の位置に配置できます。"},
			{Q: "一括ウォーターマークは同じ設定が適用されますか？", A: "はい。複数の画像をアップロードすると、同じウォーターマーク設定がすべてに適用されます。"},
			{Q: "タイル状のウォーターマークは画像の盗用を防げますか？", A: "タイル状のウォーターマークは不正使用のコストを高めますが、切り取りや上書きを完全に防ぐことはできません。"},
			{Q: "画像はサーバーにアップロードされますか？", A: "いいえ。すべての処理はブラウザ内でローカルに行われ、画像が外部に送信されることはありません。"},
			{Q: "どの出力形式がサポートされていますか？", A: "元の形式を保持するか、JPG、PNG、WebPにエクスポートできます。JPGとWebPは品質調整に対応しています。"},
		}
	case "ko":
		return []FAQ{
			{Q: "이미지 워터마크란 무엇인가요?", A: "이미지 워터마크는 사진이나 그래픽 위에 배치되는 가시적 마크로, 소유권 식별, 저작권 보호 또는 브랜드 콘텐츠를 위해 사용됩니다."},
			{Q: "어떤 이미지 형식을 지원하나요?", A: "JPG, PNG, WebP 등 주요 형식을 지원합니다. 모든 처리는 브라우저에서 로컬로 수행됩니다."},
			{Q: "텍스트와 이미지 워터마크를 모두 추가할 수 있나요?", A: "네. 텍스트 워터마크(글꼴, 크기, 색상 사용자 지정) 또는 이미지 워터마크(로고 업로드)를 선택할 수 있습니다."},
			{Q: "워터마크 위치는 어떻게 조정하나요?", A: "3×3 위치 격자를 클릭하거나 미리보기 캔버스에서 직접 드래그하여 원하는 위치에 배치할 수 있습니다."},
			{Q: "일괄 워터마크는 동일한 설정이 적용되나요?", A: "네. 여러 이미지를 업로드하면 동일한 워터마크 설정이 모두에 적용됩니다."},
			{Q: "타일 워터마크가 이미지 도용을 방지할 수 있나요?", A: "타일 워터마크는 무단 사용 비용을 높이지만, 자르기나 덮어쓰기를 완전히 방지할 수는 없습니다."},
			{Q: "이미지가 서버에 업로드되나요?", A: "아니요. 모든 처리는 브라우저에서 로컬로 수행되며 이미지가 외부로 전송되지 않습니다."},
			{Q: "어떤 출력 형식을 지원하나요?", A: "원래 형식을 유지하거나 JPG, PNG, WebP로 낳 시할 수 있습니다. JPG와 WebP는 품질 조절이 가능합니다."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Qué es una marca de agua de imagen?", A: "Una marca de agua de imagen es una superposición visible colocada sobre una foto o gráfico para identificar la propiedad, proteger derechos de autor o indicar contenido de marca."},
			{Q: "¿Qué formatos de imagen se admiten?", A: "Se admiten formatos principales como JPG, PNG y WebP. Todo el procesamiento se realiza localmente en tu navegador."},
			{Q: "¿Puedo añadir marcas de agua de texto e imagen?", A: "Sí. Puedes elegir entre marca de agua de texto (fuente, tamaño y color personalizados) o de imagen (subir tu logo)."},
			{Q: "¿Cómo ajusto la posición de la marca de agua?", A: "Usa la cuadrícula de posición 3×3 o arrastra directamente en el lienzo de vista previa a cualquier posición."},
			{Q: "¿La marca de agua por lotes aplica la misma configuración?", A: "Sí. Al subir varias imágenes, la misma configuración de marca de agua se aplica a todas."},
			{Q: "¿Las marcas de agua en mosaico previenen el robo de imágenes?", A: "Las marcas de agua en mosaico aumentan el costo de uso no autorizado, pero no pueden prevenir completamente el recorte o la edición."},
			{Q: "¿Las imágenes se suben a un servidor?", A: "No. Todo el procesamiento se realiza localmente en tu navegador; las imágenes nunca salen de tu dispositivo."},
			{Q: "¿Qué formatos de salida se admiten?", A: "Puedes mantener el formato original o exportar como JPG, PNG o WebP. JPG y WebP admiten ajuste de calidad."},
		}
	default:
		return []FAQ{
			{Q: "What is an image watermark?", A: "An image watermark is a visible overlay placed on top of a photo or graphic to identify ownership, protect copyright, or indicate brand content."},
			{Q: "What image formats are supported?", A: "Major formats like JPG, PNG, and WebP are supported. All processing happens locally in your browser."},
			{Q: "Can I add both text and image watermarks?", A: "Yes. You can choose between text watermark (custom font, size, and color) or image watermark (upload your logo)."},
			{Q: "How do I adjust watermark position?", A: "Use the 3×3 position grid or drag directly on the preview canvas to any position."},
			{Q: "Does batch watermark apply the same settings?", A: "Yes. When you upload multiple images, the same watermark settings apply to all of them."},
			{Q: "Can tile watermarks prevent image theft?", A: "Tile watermarks increase the cost of unauthorized use but cannot completely prevent cropping or editing."},
			{Q: "Are images uploaded to a server?", A: "No. All processing happens locally in your browser; images never leave your device."},
			{Q: "What output formats are supported?", A: "You can keep the original format or export as JPG, PNG, or WebP. JPG and WebP support quality adjustment."},
		}
	}
}

func imgRotateFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "只能旋转90度吗，还是可以旋转任意角度？", A: "支持任意角度旋转，在角度输入框中输入任意数字（如45°）即可精确旋转。"},
			{Q: "旋转后图片尺寸会变化吗？", A: "旋转90°/180°时宽高互换。其他角度旋转时，画布会扩展以容纳旋转后的图片，边缘填充白色。"},
			{Q: "可以水平和垂直翻转图片吗？", A: "可以，水平翻转和垂直翻转是独立操作，可与旋转组合使用。"},
			{Q: "可以批量旋转多张图片吗？", A: "支持！所有旋转和翻转设置会统一应用到所有上传的图片上。"},
			{Q: "旋转后输出什么格式？", A: "输出格式与输入保持一致（JPG保持JPG，PNG保持PNG）。"},
		}
	case "ja":
		return []FAQ{
			{Q: "90度以外の任意の角度で回転できますか？", A: "はい。角度入力欄に任意の値（例：45°）を入力すると精確に回転できます。"},
			{Q: "回転後に画像サイズは変わりますか？", A: "90°/180°回転時は幅と高さが入れ替わります。他の角度では回転後の画像に合わせてキャンバスが拡張され、端は白で塗りつぶされます。"},
			{Q: "水平・垂直に反転できますか？", A: "はい。水平反転と垂直反転は独立した操作で、回転と組み合わせて使用できます。"},
			{Q: "複数の画像を一括回転できますか？", A: "はい！すべての回転・反転設定が全アップロード画像に均一に適用されます。"},
			{Q: "回転後の出力形式は？", A: "入力と同じ形式で出力されます（JPGはJPG、PNGはPNGのまま）。"},
		}
	case "ko":
		return []FAQ{
			{Q: "90도 외에 임의 각도로 회전할 수 있나요?", A: "네. 각도 입력란에 원하는 값(예: 45°)을 입력하면 정확하게 회전됩니다."},
			{Q: "회전 후 이미지 크기가 변경되나요?", A: "90°/180° 회전 시 너비와 높이가 바뀝니다. 다른 각도에서는 회전된 이미지에 맞게 캔버스가 확장되고 가장자리는 흰색으로 채워집니다."},
			{Q: "수평 및 수직으로 뒤집을 수 있나요?", A: "네. 수평 뒤집기와 수직 뒤집기는 독립적인 작업으로 회전과 함께 사용할 수 있습니다."},
			{Q: "여러 이미지를 일괄 회전할 수 있나요?", A: "네! 모든 회전 및 뒤집기 설정이 업로드된 모든 이미지에 동일하게 적용됩니다."},
			{Q: "회전 후 출력 형식은?", A: "입력과 동일한 형식으로 출력됩니다(JPG는 JPG, PNG는 PNG 유지)."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Solo puedo rotar 90° o también ángulos arbitrarios?", A: "Puedes rotar cualquier ángulo. Escribe cualquier número en el campo de ángulo (p. ej. 45°) para rotación precisa."},
			{Q: "¿Cambia el tamaño de la imagen tras rotar?", A: "Al rotar 90°/180° el ancho y alto se intercambian. Para otros ángulos el lienzo se expande para contener la imagen rotada y los bordes se rellenan de blanco."},
			{Q: "¿Puedo voltear la imagen horizontal y verticalmente?", A: "Sí. El volteo horizontal y vertical son operaciones independientes combinables con la rotación."},
			{Q: "¿Puedo rotar varias imágenes a la vez?", A: "¡Sí! Todos los ajustes de rotación y volteo se aplican uniformemente a todas las imágenes subidas."},
			{Q: "¿En qué formato se descarga tras rotar?", A: "El formato de salida mantiene el mismo que la entrada (JPG sigue siendo JPG, PNG sigue siendo PNG)."},
		}
	default:
		return []FAQ{
			{Q: "Can I rotate by any angle, not just 90°?", A: "Yes, type any angle (e.g. 45°) in the angle input box for precise rotation."},
			{Q: "What happens to the canvas size after rotation?", A: "For angles other than 90°/180°, the canvas expands to fit the rotated image; edges are filled with white."},
			{Q: "Can I flip images horizontally and vertically?", A: "Yes, the Flip Horizontal and Flip Vertical buttons are independent from rotation and can be combined."},
			{Q: "Can I batch rotate multiple images?", A: "Yes, all rotation and flip settings are applied uniformly to all uploaded images."},
			{Q: "What is the output format after rotation?", A: "The output keeps the same format as the input (JPG stays JPG, PNG stays PNG, etc.)."},
		}
	}
}

func imgOCRFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "OCR 支持哪些图片格式？", A: "支持 JPG、PNG、WebP、BMP、TIFF、GIF 等常见图片格式，最大支持 5MB。"},
			{Q: "支持哪些语言的文字识别？", A: "支持 25+ 种语言，包括中文简繁体、英文、日文、韩文、法文、德文、西班牙文等。"},
			{Q: "图片会上传到服务器吗？", A: "图片会通过安全的 API 传输到 OCR 引擎进行识别，不会被存储，识别完成后立即删除。"},
			{Q: "识别结果可以编辑吗？", A: "可以！识别结果在可编辑的文本框中显示，您可以直接修改、复制或下载为 TXT 文件。"},
			{Q: "识别准确率如何？", A: "使用高精度 OCR 引擎，对于清晰的印刷文字准确率可达 95% 以上。手写文字和模糊图片准确率会降低。"},
		}
	case "ja":
		return []FAQ{
			{Q: "OCRはどの画像形式に対応していますか？", A: "JPG、PNG、WebP、BMP、TIFF、GIFなどの一般的な画像形式に対応し、最大5MBまでサポートします。"},
			{Q: "どの言語のテキスト認識に対応していますか？", A: "25以上の言語に対応：簡体字・繁体字中国語、英語、日本語、韓国語、フランス語、ドイツ語、スペイン語など。"},
			{Q: "画像はサーバーにアップロードされますか？", A: "画像は安全なAPIを通じてOCRエンジンに送信され、保存されず、認識完了後すぐに削除されます。"},
			{Q: "認識結果を編集できますか？", A: "はい！認識結果は編集可能なテキストボックスに表示され、直接修正・コピー・TXTファイルとしてダウンロードできます。"},
			{Q: "認識精度はどの程度ですか？", A: "高精度OCRエンジンを使用しており、鮮明な印刷テキストで95%以上の精度を達成します。手書きや不鮮明な画像では精度が下がる場合があります。"},
		}
	case "ko":
		return []FAQ{
			{Q: "OCR은 어떤 이미지 형식을 지원하나요?", A: "JPG, PNG, WebP, BMP, TIFF, GIF 등 일반적인 이미지 형식을 지원하며 최대 5MB까지 가능합니다."},
			{Q: "어떤 언어의 텍스트 인식을 지원하나요?", A: "25개 이상의 언어를 지원합니다: 중국어 간체/번체, 영어, 일본어, 한국어, 프랑스어, 독일어, 스페인어 등."},
			{Q: "이미지가 서버에 업로드되나요?", A: "이미지는 보안 API를 통해 OCR 엔진으로 전송되며 저장되지 않고 인식 완료 후 즉시 삭제됩니다."},
			{Q: "인식 결과를 편집할 수 있나요?", A: "네! 인식 결과는 편집 가능한 텍스트 상자에 표시되며 직접 수정, 복사, TXT 파일로 다운로드할 수 있습니다."},
			{Q: "인식 정확도는 어느 정도인가요?", A: "고정밀 OCR 엔진을 사용하여 선명한 인쇄 텍스트의 경우 95% 이상의 정확도를 달성합니다. 필기체나 흐린 이미지에서는 정확도가 낮아질 수 있습니다."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Qué formatos de imagen soporta el OCR?", A: "Soporta JPG, PNG, WebP, BMP, TIFF, GIF y otros formatos comunes, hasta un máximo de 5MB."},
			{Q: "¿Qué idiomas de texto puede reconocer?", A: "Soporta más de 25 idiomas: chino simplificado/tradicional, inglés, japonés, coreano, francés, alemán, español y más."},
			{Q: "¿Las imágenes se suben al servidor?", A: "Las imágenes se envían de forma segura al motor OCR para su reconocimiento, no se almacenan y se eliminan inmediatamente después."},
			{Q: "¿Puedo editar los resultados del reconocimiento?", A: "¡Sí! Los resultados aparecen en un cuadro de texto editable donde puede modificar, copiar o descargar como archivo TXT."},
			{Q: "¿Cuál es la precisión del reconocimiento?", A: "Usamos un motor OCR de alta precisión que logra más del 95% en texto impreso claro. La precisión puede disminuir con texto manuscrito o imágenes borrosas."},
		}
	default:
		return []FAQ{
			{Q: "What image formats does OCR support?", A: "It supports JPG, PNG, WebP, BMP, TIFF, GIF and other common image formats, up to 5MB."},
			{Q: "What languages can it recognize?", A: "25+ languages are supported: Chinese Simplified/Traditional, English, Japanese, Korean, French, German, Spanish and more."},
			{Q: "Are images uploaded to a server?", A: "Images are sent securely to the OCR engine for recognition. They are never stored and are deleted immediately after processing."},
			{Q: "Can I edit the recognized text?", A: "Yes! Results appear in an editable text area where you can modify, copy, or download as a TXT file."},
			{Q: "How accurate is the recognition?", A: "Using a high-accuracy OCR engine, clear printed text achieves 95%+ accuracy. Handwritten or blurry images may have lower accuracy."},
		}
	}
}

func imgToVideoFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "支持哪些图片格式？", A: "支持 JPG、PNG、WebP、GIF 等常见图片格式，最多可添加 50 张图片。"},
			{Q: "视频在服务器上生成吗？", A: "不是。视频完全在您的浏览器中通过 Canvas + MediaRecorder API 生成，图片不会上传到任何服务器。"},
			{Q: "支持哪些输出格式？", A: "支持 WebM 和 MP4 格式。WebM 文件更小推荐优先使用，MP4 兼容性更好。"},
			{Q: "可以添加转场效果吗？", A: "支持淡入淡出、滑动、缩放和无转场（直接切换）四种效果，可自定义转场时长。"},
			{Q: "生成的视频分辨率是多少？", A: "支持 480p、720p（HD）和 1080p（Full HD）三种分辨率，16:9 宽屏比例输出。"},
		}
	case "ja":
		return []FAQ{
			{Q: "対応している画像形式は？", A: "JPG、PNG、WebP、GIFなどの一般的な画像形式に対応し、最大50枚まで追加できます。"},
			{Q: "動画はサーバーで生成されますか？", A: "いいえ。動画はブラウザ内でCanvas + MediaRecorder APIを使用して完全に生成され、画像はサーバーにアップロードされません。"},
			{Q: "対応している出力形式は？", A: "WebMとMP4形式に対応しています。WebMはファイルサイズが小さく推奨、MP4は互換性が高いです。"},
			{Q: "トランジション効果は追加できますか？", A: "フェード、スライド、ズーム、なし（カット）の4種類の効果に対応し、トランジション時間もカスタマイズできます。"},
			{Q: "生成される動画の解像度は？", A: "480p、720p（HD）、1080p（Full HD）の3種類の解像度に対応し、16:9ワイドスクリーンで出力されます。"},
		}
	case "ko":
		return []FAQ{
			{Q: "어떤 이미지 형식을 지원하나요?", A: "JPG, PNG, WebP, GIF 등 일반적인 이미지 형식을 지원하며 최대 50장까지 추가할 수 있습니다."},
			{Q: "동영상이 서버에서 생성되나요?", A: "아니요. 동영상은 브라우저에서 Canvas + MediaRecorder API로 완전히 생성되며 이미지가 서버에 업로드되지 않습니다."},
			{Q: "어떤 출력 형식을 지원하나요?", A: "WebM과 MP4 형식을 지원합니다. WebM은 파일 크기가 작아 권장되며 MP4는 호환성이 높습니다."},
			{Q: "전환 효과를 추가할 수 있나요?", A: "페이드, 슬라이드, 줌, 없음(컷)의 4가지 효과를 지원하며 전환 시간도 커스터마이즈할 수 있습니다."},
			{Q: "생성된 동영상의 해상도는?", A: "480p, 720p(HD), 1080p(Full HD)의 3가지 해상도를 지원하며 16:9 와이드스크린으로 출력됩니다."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Qué formatos de imagen son compatibles?", A: "JPG, PNG, WebP, GIF y otros formatos comunes. Puedes añadir hasta 50 imágenes."},
			{Q: "¿El vídeo se genera en el servidor?", A: "No. El vídeo se genera completamente en tu navegador usando Canvas + MediaRecorder API. Las imágenes nunca se suben a ningún servidor."},
			{Q: "¿Qué formatos de salida están disponibles?", A: "WebM y MP4. WebM produce archivos más pequeños (recomendado), MP4 tiene mayor compatibilidad."},
			{Q: "¿Puedo añadir efectos de transición?", A: "Sí: fundido, deslizamiento, zoom y sin transición (corte directo). La duración de la transición es personalizable."},
			{Q: "¿Qué resolución tiene el vídeo generado?", A: "480p, 720p (HD) y 1080p (Full HD) en proporción 16:9 panorámica."},
		}
	default:
		return []FAQ{
			{Q: "What image formats are supported?", A: "JPG, PNG, WebP, GIF and other common formats. You can add up to 50 images."},
			{Q: "Is the video generated on a server?", A: "No. The video is generated entirely in your browser using Canvas + MediaRecorder API. Images never leave your device."},
			{Q: "What output formats are available?", A: "WebM and MP4. WebM produces smaller files (recommended), MP4 has wider compatibility."},
			{Q: "Can I add transition effects?", A: "Yes: Fade, Slide, Zoom, and None (cut). Transition duration is customizable."},
			{Q: "What resolution is the output video?", A: "480p, 720p (HD), or 1080p (Full HD) in 16:9 widescreen ratio."},
		}
	}
}

func imgToPDFFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "支持哪些图片格式转 PDF？", A: "支持 JPG、PNG、WebP、GIF、BMP 等常见格式，最多可合并 50 张图片到一个 PDF 文件，一次上传多选即可批量添加。"},
			{Q: "图片会上传到服务器吗？隐私安全吗？", A: "不会。PDF 完全在您的浏览器中通过 jsPDF 库本地生成，图片从不离开您的设备，无服务器、无数据留存，适合处理合同、证件等敏感文件。"},
			{Q: "可以自定义 PDF 页面大小和方向吗？", A: "支持 A3、A4、A5、Letter、Legal 五种标准纸张尺寸，以及「适应图片」自动匹配模式，横版竖版均可选择，满足打印和屏幕阅读两种场景。"},
			{Q: "如何调整图片在 PDF 中的显示效果？", A: "提供三种适应模式：保持比例（推荐，不裁切内容）、填充整页（可能裁剪边缘）、原始尺寸（按像素原大输出）。还可设置 0/5/10/20mm 四档边距和 50–100% 的图片质量。"},
			{Q: "可以调整图片在 PDF 中的页面顺序吗？", A: "可以！上传后直接在图片网格中拖拽缩略图即可调整顺序，编号实时更新，PDF 页面将严格按照网格中的顺序生成，不会自动排序。"},
			{Q: "图片质量设置为多少合适？会影响清晰度吗？", A: "默认 90% 的质量下视觉效果与原图几乎无差异，文件体积比 100% 设置小约 20–30%。对于手机拍摄的 JPG 照片，85–90% 已足够清晰；只有将质量降至 70% 以下时，才会出现明显的模糊和色彩损失。"},
		}
	case "ja":
		return []FAQ{
			{Q: "PDFに変換できる画像形式は？", A: "JPG・PNG・WebP・GIF・BMPなどに対応し、最大50枚を1つのPDFにまとめることができます。複数ファイルの同時選択やドラッグ＆ドロップにも対応しています。"},
			{Q: "画像はサーバーにアップロードされますか？", A: "されません。PDFはブラウザ内でjsPDFライブラリを使って完全にローカル生成されます。ファイルはデバイスを離れないため、契約書や個人情報を含む画像も安心して使えます。"},
			{Q: "PDFのページサイズと向きをカスタマイズできますか？", A: "A3・A4・A5・Letter・Legalの5種類の標準用紙サイズと「画像に合わせる」自動モードに対応。縦向き・横向きもページ全体に一括設定できます。"},
			{Q: "PDF内での画像の表示方法を調整できますか？", A: "3つのフィットモードがあります：アスペクト比を維持（推奨・切り抜きなし）、ページ全体にフィル（端が切れる場合あり）、オリジナルサイズ。余白（0/5/10/20mm）と画質（50〜100%）も設定可能です。"},
			{Q: "PDF内のページ順序を変更できますか？", A: "はい。アップロード後にサムネイルをドラッグ＆ドロップするだけで順序が変わり、番号も自動更新されます。最終PDFはグリッドに表示された順序通りに生成されます。"},
			{Q: "画質設定はどのくらいが適切ですか？", A: "デフォルトの90%では視覚的な差はほぼなく、100%設定より20〜30%ファイルサイズが小さくなります。スマートフォンで撮影したJPEGは元からある程度圧縮されているため、85〜90%で十分です。70%以下にすると細部のぼやけが目立ちはじめます。"},
		}
	case "ko":
		return []FAQ{
			{Q: "PDF로 변환할 수 있는 이미지 형식은?", A: "JPG, PNG, WebP, GIF, BMP 등을 지원하며 최대 50장을 하나의 PDF로 합칠 수 있습니다. 파일 여러 개를 한 번에 선택하거나 드래그 앤 드롭으로 추가할 수 있습니다."},
			{Q: "이미지가 서버에 업로드되나요? 개인정보는 안전한가요?", A: "아니요. PDF는 브라우저에서 jsPDF 라이브러리로 완전히 로컬 생성됩니다. 파일이 기기를 벗어나지 않으므로 계약서, 신분증 등 민감한 문서도 안심하고 처리할 수 있습니다."},
			{Q: "PDF 페이지 크기와 방향을 설정할 수 있나요?", A: "A3, A4, A5, Letter, Legal 5가지 표준 용지 크기와 '이미지에 맞추기' 자동 모드를 지원합니다. 세로/가로 방향도 전체 페이지에 일괄 적용할 수 있습니다."},
			{Q: "PDF 안에서 이미지 표시 방식을 조정할 수 있나요?", A: "3가지 맞춤 모드를 제공합니다: 비율 유지(권장·잘림 없음), 페이지 채우기(가장자리 잘릴 수 있음), 원본 크기. 여백(0/5/10/20mm)과 이미지 품질(50~100%)도 조정 가능합니다."},
			{Q: "이미지 순서를 변경할 수 있나요?", A: "네! 업로드 후 썸네일을 드래그 앤 드롭하면 순서가 바뀌고 번호가 자동으로 업데이트됩니다. 최종 PDF는 그리드에 표시된 순서 그대로 생성됩니다."},
			{Q: "이미지 품질은 어느 정도로 설정하는 게 좋나요?", A: "기본값 90%에서는 시각적 차이가 거의 없으면서 파일 크기가 100% 설정보다 20~30% 작습니다. 스마트폰으로 촬영한 JPEG 사진은 이미 압축되어 있으므로 85~90%면 충분합니다. 70% 이하로 낮추면 세부 묘사가 흐려지기 시작합니다."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Qué formatos de imagen puedo convertir a PDF?", A: "JPG, PNG, WebP, GIF, BMP y más. Puedes combinar hasta 50 imágenes en un solo PDF, seleccionando varios archivos a la vez o arrastrándolos directamente."},
			{Q: "¿Las imágenes se suben al servidor? ¿Es seguro para documentos privados?", A: "No. El PDF se genera completamente en tu navegador con jsPDF — las imágenes nunca salen de tu dispositivo. Ideal para contratos, documentos de identidad o cualquier archivo sensible."},
			{Q: "¿Puedo personalizar el tamaño de página y la orientación del PDF?", A: "Sí. A3, A4, A5, Letter, Legal y el modo automático 'Ajustar a imagen'. También puedes elegir orientación vertical u horizontal para todas las páginas."},
			{Q: "¿Cómo controlo cómo se ve la imagen en el PDF?", A: "Tres modos: mantener proporción (recomendado, sin recortes), rellenar página (puede recortar bordes) y tamaño original. También configuras márgenes (0/5/10/20mm) y calidad de imagen (50–100%)."},
			{Q: "¿Puedo cambiar el orden de las imágenes antes de generar el PDF?", A: "Sí. Arrastra y suelta las miniaturas para reordenarlas. Los números se actualizan automáticamente y el PDF respeta exactamente el orden que establezcas, sin reordenamientos automáticos."},
			{Q: "¿Se pierde calidad al convertir imágenes a PDF?", A: "Solo si reduces el control de calidad por debajo del 100%. Con el 90% predeterminado, la diferencia visual es imperceptible y el archivo pesa entre un 20–30% menos. Para fotos de móvil ya en JPEG, un ajuste de 85–90% produce el mismo resultado visual con archivos más ligeros."},
		}
	default:
		return []FAQ{
			{Q: "What image formats can I convert to PDF?", A: "JPG, PNG, WebP, GIF, BMP and other common formats are all supported. You can combine up to 50 images into a single PDF — select multiple files at once or drag and drop a whole folder."},
			{Q: "Are my images uploaded to a server? Is it safe for sensitive documents?", A: "No. The PDF is built entirely in your browser using the jsPDF library — your files never leave your device. There is no server, no data retention, and no upload at any point, making it safe for contracts, ID scans, or any confidential material."},
			{Q: "Can I customize the PDF page size and orientation?", A: "Yes. Choose from A3, A4, A5, Letter, Legal, or the automatic 'Fit to Image' mode that sizes each page to match its image. Portrait and landscape orientation can be set globally across all pages."},
			{Q: "How can I control how images are displayed in the PDF?", A: "Three fit modes are available: Contain (maintain aspect ratio — recommended, no cropping), Fill (covers the full page, may crop edges), and Original Size (no scaling). You can also set margins at 0, 5, 10, or 20mm and adjust image quality from 50% to 100%."},
			{Q: "Can I reorder the images before generating the PDF?", A: "Yes. Drag and drop any thumbnail in the image grid to reorder it — the numbering updates automatically. The final PDF follows the grid order exactly, with no automatic sorting or rearrangement."},
			{Q: "Does image quality decrease when converting to PDF?", A: "Only if you lower the quality slider. At the default 90% setting, the visual difference is imperceptible while the file is roughly 20–30% smaller than at 100%. For phone photos that are already JPEG, 85–90% quality produces identical-looking output at a more manageable file size."},
		}
	}
}

func imgRotateGuideFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "什么是在线图片旋转工具？", A: "在线图片旋转工具是一种无需安装软件即可在浏览器中旋转、翻转和调整图片方向的工具。您可以直接上传图片，选择旋转角度或翻转方向，然后下载处理后的图片。"},
			{Q: "如何向左或向右旋转图片 90°？", A: "上传图片后，点击「向左旋转 90°」或「向右旋转 90°」按钮即可。这是最常用的照片方向修正方式，适合处理手机拍摄的方向错误的照片。"},
			{Q: "什么是 EXIF Orientation？为什么照片方向会显示错误？", A: "EXIF Orientation 是存储在照片元数据中的方向信息。部分相机和手机通过此信息记录拍摄时的方向，但不同软件读取方式不同，可能导致照片在某些平台显示横着或倒置。使用我们的工具旋转后重新导出可以修正此问题。"},
			{Q: "水平翻转和垂直翻转有什么区别？", A: "水平翻转会左右镜像图片（像照镜子一样），垂直翻转会上下颠倒图片。它们不是旋转，而是镜像变换，适合修正自拍镜像或创造特殊视觉效果。"},
			{Q: "自定义角度旋转后为什么会有空白边缘？", A: "当图片旋转非 90° 倍数的角度时，原画布无法完全容纳旋转后的图片，因此会自动扩展画布并在空白区域填充背景色。您可以选择白色、黑色、透明或自定义颜色作为背景。"},
			{Q: "可以批量旋转多张图片吗？", A: "可以。一次上传最多 30 张图片，所有旋转和翻转设置会统一应用到每张图片上，处理完成后可以一键打包下载为 ZIP 文件。"},
			{Q: "JPG、PNG、WebP 旋转后有什么区别？", A: "JPG 适合照片类图片，但不支持透明背景；PNG 支持透明背景且无损，适合设计稿和图标；WebP 文件体积最小且支持透明，适合网页使用。旋转后可根据需要选择输出格式。"},
			{Q: "图片会上传到服务器吗？", A: "不会。所有旋转和翻转处理均在您的浏览器本地通过 Canvas API 完成，图片文件不会发送到任何服务器，完全保护您的隐私。"},
			{Q: "旋转会影响图片清晰度吗？", A: "90°、180°、270° 的旋转通常不会影响清晰度。自定义角度旋转需要重新采样，可能产生极轻微的模糊，但在正常观看距离下几乎察觉不到。"},
			{Q: "如何修正手机照片的方向问题？", A: "如果手机照片在某些平台显示方向不对，建议先查看照片的 EXIF 方向信息，然后使用我们的旋转工具按正确方向旋转后重新导出。导出后的图片将包含正确的像素方向，不再依赖 EXIF 信息。"},
		}
	case "ja":
		return []FAQ{
			{Q: "オンライン画像回転ツールとは何ですか？", A: "オンライン画像回転ツールは、ソフトウェアをインストールせずにブラウザ内で画像を回転、反転、方向調整できるツールです。画像をアップロードして角度や反転方向を選び、処理後の画像をダウンロードできます。"},
			{Q: "画像を左右に90度回転するには？", A: "画像をアップロード後、「左に90度回転」または「右に90度回転」ボタンをクリックしてください。これは最も一般的な写真の方向修正方法で、スマートフォンで撮影した方向がおかしい写真の修正に適しています。"},
			{Q: "EXIF Orientationとは何ですか？なぜ写真の方向がおかしくなるのですか？", A: "EXIF Orientationは、写真のメタデータに保存されている方向情報です。一部のカメラやスマートフォンが撮影時の方向をこの情報で記録しますが、ソフトウェアによって読み取り方が異なるため、特定のプラットフォームで横向きや上下逆さまに表示されることがあります。当ツールで回転して再エクスポートすれば修正できます。"},
			{Q: "水平反転と垂直反転の違いは何ですか？", A: "水平反転は画像を左右に鏡像化します（鏡を見るように）。垂直反転は画像を上下に反転させます。これらは回転ではなく鏡像変換で、自撮りの鏡像修正や特殊な視覚効果の作成に適しています。"},
			{Q: "カスタム角度回転後に空白の端ができるのはなぜですか？", A: "90度の倍数以外の角度で画像を回転すると、元のキャンバスでは回転後の画像を完全に収容できないため、キャンバスが自動的に拡張され、空白部分に背景色が塗られます。白、黒、透明、またはカスタムカラーを背景として選択できます。"},
			{Q: "複数の画像を一括回転できますか？", A: "はい。一度に最大30枚の画像をアップロードでき、すべての回転・反転設定が各画像に均一に適用されます。処理完了後、ZIPファイルとして一括ダウンロードも可能です。"},
			{Q: "JPG、PNG、WebPで回転後の違いは何ですか？", A: "JPGは写真に適していますが、透明背景をサポートしません。PNGは透明背景をサポートし無損失で、デザイン原稿やアイコンに適しています。WebPはファイルサイズが最も小さく透明もサポートし、ウェブ使用に最適です。回転後は必要に応じて出力形式を選択できます。"},
			{Q: "画像はサーバーにアップロードされますか？", A: "いいえ。すべての回転・反転処理はブラウザ内でCanvas APIを使用してローカルに完結します。画像ファイルはいかなるサーバーにも送信されず、プライバシーを完全に保護します。"},
			{Q: "回転は画像の鮮明度に影響しますか？", A: "90度、180度、270度の回転は通常鮮明度に影響しません。カスタム角度の回転は再サンプリングが必要なため、わずかなぼやけが生じる可能性がありますが、通常の視聴距離ではほとんど気づきません。"},
			{Q: "スマートフォンの写真の方向問題を修正するには？", A: "スマートフォンの写真が特定のプラットフォームで方向がおかしい場合は、まず写真のEXIF方向情報を確認し、当ツールで正しい方向に回転して再エクスポートしてください。エクスポート後の画像は正しいピクセル方向を含み、EXIF情報に依存しなくなります。"},
		}
	case "ko":
		return []FAQ{
			{Q: "온라인 이미지 회전 도구란 무엇인가요?", A: "온라인 이미지 회전 도구는 소프트웨어를 설치하지 않고 브라우저에서 이미지를 회전, 뒤집기, 방향 조정할 수 있는 도구입니다. 이미지를 업로드하여 각도나 뒤집기 방향을 선택한 후 처리된 이미지를 다운로드할 수 있습니다."},
			{Q: "이미지를 좌우로 90도 회전하려면 어떻게 하나요?", A: "이미지를 업로드한 후 '왼쪽으로 90도 회전' 또는 '오른쪽으로 90도 회전' 버튼을 클릭하세요. 이것은 가장 일반적인 사진 방향 수정 방법으로, 스마트폰으로 촬영한 방향이 잘못된 사진을 수정하는 데 적합합니다."},
			{Q: "EXIF Orientation이란 무엇인가요? 왜 사진 방향이 잘못 표시되나요?", A: "EXIF Orientation은 사진 메타데이터에 저장된 방향 정보입니다. 일부 카메라와 스마트폰이 촬영 시 방향을 이 정보로 기록하지만, 소프트웨어에 따라 읽는 방식이 달라 특정 플랫폼에서 가로로 표시되거나 거꾸로 표시될 수 있습니다. 당사 도구로 회전하여 다시 내보내면 수정할 수 있습니다."},
			{Q: "수평 뒤집기와 수직 뒤집기의 차이는 무엇인가요?", A: "수평 뒤집기는 이미지를 좌우로 거울처럼 반전시킵니다. 수직 뒤집기는 이미지를 상하로 뒤집습니다. 이들은 회전이 아닌 반전 변환으로, 셀카 거울 수정이나 특수한 시각 효과를 만드는 데 적합합니다."},
			{Q: "사용자 지정 각도 회전 후 빈 가장자리가 생기는 이유는 무엇인가요?", A: "90도 배수가 아닌 각도로 이미지를 회전하면 원래 캔버스에서 회전된 이미지를 완전히 수용할 수 없으므로 캔버스가 자동으로 확장되고 빈 부분에 배경색이 채워집니다. 흰색, 검은색, 투명 또는 사용자 지정 색상을 배경으로 선택할 수 있습니다."},
			{Q: "여러 이미지를 일괄 회전할 수 있나요?", A: "네. 한 번에 최대 30장의 이미지를 업로드할 수 있으며, 모든 회전 및 뒤집기 설정이 각 이미지에 동일하게 적용됩니다. 처리 완료 후 ZIP 파일로 일괄 다운로드도 가능합니다."},
			{Q: "JPG, PNG, WebP 회전 후 차이점은 무엇인가요?", A: "JPG는 사진에 적합하지만 투명 배경을 지원하지 않습니다. PNG는 투명 배경을 지원하고 무손실로, 디자인 원고와 아이콘에 적합합니다. WebP는 파일 크기가 가장 작고 투명도도 지원하여 웹 사용에 최적입니다. 회전 후 필요에 따라 출력 형식을 선택할 수 있습니다."},
			{Q: "이미지가 서버에 업로드되나요?", A: "아니요. 모든 회전 및 뒤집기 처리는 Canvas API를 사용하여 브라우저 내에서 로컬로 완료됩니다. 이미지 파일은 어떤 서버에도 전송되지 않아 프라이버시를 완전히 보호합니다."},
			{Q: "회전은 이미지 선명도에 영향을 미치나요?", A: "90도, 180도, 270도 회전은 일반적으로 선명도에 영향을 주지 않습니다. 사용자 지정 각도 회전은 재샘플링이 필요하여 미세한 흐림이 발생할 수 있지만, 일반적인 시청 거리에서는 거의 느끼지 못합니다."},
			{Q: "스마트폰 사진의 방향 문제를 수정하려면 어떻게 해야 하나요?", A: "스마트폰 사진이 특정 플랫폼에서 방향이 잘못 표시되는 경우, 먼저 사진의 EXIF 방향 정보를 확인한 후 당사 도구로 올바른 방향으로 회전하여 다시 내보내세요. 내보낸 후의 이미지는 올바른 픽셀 방향을 포함하며 EXIF 정보에 의존하지 않습니다."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Qué es una herramienta de rotación de imágenes en línea?", A: "Una herramienta de rotación de imágenes en línea le permite rotar, voltear y ajustar la dirección de imágenes directamente en su navegador sin instalar software. Simplemente suba una imagen, elija el ángulo o dirección de volteo, y descargue la imagen procesada."},
			{Q: "¿Cómo giro una imagen 90° a la izquierda o derecha?", A: "Después de subir la imagen, haga clic en el botón 'Girar 90° a la izquierda' o 'Girar 90° a la derecha'. Esta es la forma más común de corregir la orientación de las fotos, ideal para arreglar fotos tomadas con el teléfono en la dirección incorrecta."},
			{Q: "¿Qué es EXIF Orientation? ¿Por qué la dirección de mi foto aparece incorrecta?", A: "EXIF Orientation es información de dirección almacenada en los metadatos de la foto. Algunas cámaras y teléfonos registran la dirección de captura mediante esta información, pero diferentes programas la leen de distintas formas, lo que puede hacer que la foto aparezca horizontal o invertida en ciertas plataformas. Puede corregirlo rotando y volviendo a exportar con nuestra herramienta."},
			{Q: "¿Cuál es la diferencia entre voltear horizontal y verticalmente?", A: "El volteo horizontal crea un espejo de la imagen de izquierda a derecha (como mirarse al espejo). El volteo vertical invierte la imagen de arriba a abajo. No son rotaciones sino transformaciones de espejo, útiles para corregir selfies en espejo o crear efectos visuales especiales."},
			{Q: "¿Por qué aparecen bordes en blanco después de rotar con un ángulo personalizado?", A: "Cuando se rota una imagen en un ángulo que no es múltiplo de 90°, el lienzo original no puede contener completamente la imagen rotada, por lo que el lienzo se expande automáticamente y las áreas vacías se rellenan con el color de fondo. Puede elegir blanco, negro, transparente o un color personalizado como fondo."},
			{Q: "¿Puedo rotar varias imágenes a la vez?", A: "Sí. Puede subir hasta 30 imágenes a la vez, y todos los ajustes de rotación y volteo se aplicarán uniformemente a cada imagen. Después del procesamiento, puede descargar todas como un archivo ZIP con un solo clic."},
			{Q: "¿Cuál es la diferencia entre JPG, PNG y WebP después de rotar?", A: "JPG es ideal para fotos pero no admite fondos transparentes. PNG admite transparencia y es sin pérdidas, ideal para diseños e iconos. WebP tiene el tamaño de archivo más pequeño y también admite transparencia, perfecto para uso web. Puede elegir el formato de salida según sus necesidades después de rotar."},
			{Q: "¿Las imágenes se suben a un servidor?", A: "No. Todo el procesamiento de rotación y volteo se realiza localmente en su navegador usando la API Canvas. Sus archivos de imagen nunca se envían a ningún servidor, garantizando su privacidad."},
			{Q: "¿La rotación afecta la claridad de la imagen?", A: "Las rotaciones de 90°, 180° y 270° generalmente no afectan la claridad. La rotación con ángulo personalizado requiere remuestreo, lo que puede producir un ligero desenfoque, pero es prácticamente imperceptible a la distancia de visualización normal."},
			{Q: "¿Cómo corrijo la orientación de las fotos de mi teléfono?", A: "Si las fotos de su teléfono aparecen con la orientación incorrecta en ciertas plataformas, primero verifique la información EXIF Orientation de la foto, luego use nuestra herramienta para rotarla a la dirección correcta y volver a exportarla. La imagen exportada contendrá la dirección de píxeles correcta y ya no dependerá de la información EXIF."},
		}
	default:
		return []FAQ{
			{Q: "What is an online image rotation tool?", A: "An online image rotation tool lets you rotate, flip, and adjust image direction directly in your browser without installing software. Simply upload an image, choose the rotation angle or flip direction, and download the processed image."},
			{Q: "How do I rotate an image 90° left or right?", A: "After uploading your image, click the 'Rotate 90° Left' or 'Rotate 90° Right' button. This is the most common way to fix photo orientation, ideal for correcting photos taken with your phone in the wrong direction."},
			{Q: "What is EXIF Orientation and why does my photo show the wrong direction?", A: "EXIF Orientation is direction information stored in a photo's metadata. Some cameras and phones record the capture direction using this info, but different software reads it differently, which can cause photos to appear sideways or upside-down on certain platforms. You can fix this by rotating and re-exporting with our tool."},
			{Q: "What is the difference between horizontal and vertical flip?", A: "Horizontal flip mirrors the image left-to-right (like looking in a mirror). Vertical flip turns the image upside-down. These are not rotations but mirror transformations, useful for correcting mirror selfies or creating special visual effects."},
			{Q: "Why do blank edges appear after custom angle rotation?", A: "When rotating an image by an angle that is not a multiple of 90°, the original canvas cannot fully contain the rotated image, so the canvas automatically expands and empty areas are filled with the background color. You can choose white, black, transparent, or a custom color as the background."},
			{Q: "Can I batch rotate multiple images?", A: "Yes. You can upload up to 30 images at once, and all rotation and flip settings will be applied uniformly to each image. After processing, you can download all results as a ZIP file with one click."},
			{Q: "What is the difference between JPG, PNG, and WebP after rotation?", A: "JPG is best for photos but does not support transparent backgrounds. PNG supports transparency and is lossless, ideal for designs and icons. WebP has the smallest file size and also supports transparency, making it perfect for web use. You can choose the output format based on your needs after rotating."},
			{Q: "Are images uploaded to a server?", A: "No. All rotation and flip processing is done entirely in your browser using the Canvas API. Your image files are never sent to any server, ensuring complete privacy."},
			{Q: "Does rotation affect image clarity?", A: "90°, 180°, and 270° rotations typically do not affect clarity. Custom angle rotation requires resampling, which may produce very slight blur, but it is practically imperceptible at normal viewing distances."},
			{Q: "How do I fix the orientation of phone photos?", A: "If your phone photos show the wrong orientation on certain platforms, first check the photo's EXIF Orientation info, then use our tool to rotate it to the correct direction and re-export. The exported image will contain the correct pixel direction and will no longer rely on EXIF information."},
		}
	}
}
