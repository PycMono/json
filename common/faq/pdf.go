package faq

// PDFFAQs returns FAQ entries for a specific PDF tool
func PDFFAQs(lang, tool string) []FAQ {
	switch tool {
	case "reorder":
		return pdfReorderFAQs(lang)
	case "extract-text":
		return pdfExtractTextFAQs(lang)
	case "merge":
		return pdfMergeFAQs(lang)
	case "split":
		return pdfSplitFAQs(lang)
	case "to-image":
		return pdfToImageFAQs(lang)
	case "watermark":
		return pdfWatermarkFAQs(lang)
	case "encrypt":
		return pdfEncryptFAQs(lang)
	case "compress":
		return pdfCompressFAQs(lang)
	default:
		return nil
	}
}

func pdfReorderFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{"如何重排PDF页面？", "导入PDF后，系统会渲染每页缩略图。拖拽缩略图即可调整页面顺序，完成后点击下载即可获得重新排列的PDF文件。"},
			{"我的PDF文件安全吗？", "完全安全。所有处理均在浏览器中本地完成，文件全程留在您的设备内，不经过任何网络传输。处理完成后文件数据会自动清除。"},
			{"支持多大的PDF文件？", "最大支持50MB的PDF文件。对于较大的文件，渲染缩略图可能需要更多时间。"},
			{"重排后PDF质量会降低吗？", "不会。页面重排仅调整页面顺序，在PDF结构层级执行，不会对内容进行任何重新编码或压缩，文件质量完全保持不变，体积也不会变化。"},
			{"可以删除某些页面吗？", "可以。点击缩略图右上角的删除按钮即可移除不需要的页面，如误扫的空白页或重复页。"},
			{"可以反转整个文档的页面顺序吗？", "可以。点击一键反转按钮，即可将整个PDF的页面顺序颠倒，适用于双面扫描正反面错乱等场景。"},
		}
	case "ja":
		return []FAQ{
			{"PDFページを並び替えるには？", "PDFをアップロード後、各ページのサムネイルが表示されます。サムネイルをドラッグしてページ順序を変更し、ダウンロードボタンをクリックするだけです。"},
			{"PDFファイルは安全ですか？", "完全に安全です。すべての処理はブラウザ上でローカルに行われ、ファイルがサーバーにアップロードされることはありません。"},
			{"どのくらいのサイズのPDFに対応していますか？", "最大50MBのPDFファイルに対応しています。大きなファイルの場合、サムネイルのレンダリングに時間がかかる場合があります。"},
			{"並び替え後PDFの品質は低下しますか？", "いいえ。ページの並び替えは順序のみを変更し、PDFの内容は再エンコードや圧縮されないため、品質は完全に保持されます。"},
			{"特定のページを削除できますか？", "はい。サムネイル右上の削除ボタンをクリックして不要なページを削除できます。"},
		}
	case "ko":
		return []FAQ{
			{"PDF 페이지를 재정렬하려면?", "PDF를 업로드하면 각 페이지의 썸네일이 렌더링됩니다. 썸네일을 드래그하여 페이지 순서를 변경한 후 다운로드 버튼을 클릭하세요."},
			{"PDF 파일이 안전한가요?", "완전히 안전합니다. 모든 처리는 브라우저에서 로컬로 이루어지며, 파일이 서버에 업로드되지 않습니다."},
			{"얼마나 큰 PDF 파일을 지원하나요?", "최대 50MB의 PDF 파일을 지원합니다. 큰 파일의 경우 썸네일 렌더링에 더 많은 시간이 필요할 수 있습니다."},
			{"재정렬 후 PDF 품질이 저하되나요?", "아니요. 페이지 재정렬은 순서만 변경하며 PDF 콘텐츠를 재인코딩하지 않으므로 품질이 완벽하게 유지됩니다."},
			{"특정 페이지를 삭제할 수 있나요?", "네. 썸네일 오른쪽 상단의 삭제 버튼을 클릭하여 불필요한 페이지를 제거할 수 있습니다."},
		}
	case "spa":
		return []FAQ{
			{"¿Cómo reordenar páginas del PDF?", "Después de subir el PDF, se renderizarán miniaturas de cada página. Arrastra las miniaturas para ajustar el orden y haz clic en descargar."},
			{"¿Es seguro mi archivo PDF?", "Completamente seguro. Todo el procesamiento se realiza localmente en tu navegador. Los archivos nunca se suben a ningún servidor."},
			{"¿Qué tamaño de PDF se soporta?", "Se admiten archivos PDF de hasta 50 MB. Para archivos grandes, la renderización de miniaturas puede tardar más."},
			{"¿La calidad del PDF disminuye?", "No. La reordenación solo ajusta el orden de las páginas sin recodificar el contenido, por lo que la calidad se mantiene intacta."},
			{"¿Puedo eliminar páginas específicas?", "Sí. Haz clic en el botón de eliminar en la esquina superior derecha de la miniatura para quitar páginas no deseadas."},
		}
	default:
		return []FAQ{
			{"How do I reorder PDF pages?", "Upload your PDF and thumbnails will be rendered for each page. Drag the thumbnails to rearrange the page order, then click download to get your reordered PDF."},
			{"Is my PDF file secure?", "Absolutely. All processing happens locally in your browser — your files are never uploaded to any server. File data is automatically cleared after processing."},
			{"What size PDF files are supported?", "PDF files up to 50 MB are supported. For larger files, thumbnail rendering may take additional time."},
			{"Does reordering reduce PDF quality?", "No. Page reordering only adjusts the sequence of pages without re-encoding any content, so the original quality is fully preserved."},
			{"Can I delete specific pages?", "Yes. Click the remove button in the top-right corner of any thumbnail to delete unwanted pages."},
		}
	}
}

func pdfExtractTextFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{"如何从PDF中提取文字？", "上传PDF文件后，点击提取文字按钮。系统会自动识别并提取每一页的文字内容，您可以复制或下载为TXT文件。"},
			{"支持扫描版PDF吗？", "本工具使用PDF.js提取文本图层，适用于原生PDF。对于扫描版PDF（图片型），建议先使用OCR工具进行文字识别。"},
			{"提取的文字准确吗？", "对于原生PDF，提取的文字与原文完全一致。准确度取决于PDF中是否包含可选择的文本图层。"},
			{"可以指定提取特定页面吗？", "可以。在设置中输入页码范围（如1-5, 8, 11-13）即可只提取指定页面的文字。"},
			{"我的文件会被保存吗？", "不会。所有处理在浏览器本地完成，文件不会上传到服务器。关闭页面后数据自动清除。"},
		}
	case "ja":
		return []FAQ{
			{"PDFからテキストを抽出するには？", "PDFファイルをアップロードし、「テキスト抽出」ボタンをクリックするだけです。各ページのテキストが自動的に抽出されます。"},
			{"スキャンしたPDFに対応していますか？", "このツールはPDF.jsを使用してテキストレイヤーを抽出するため、ネイティブPDFに適しています。スキャンPDFにはOCRツールをお勧めします。"},
			{"抽出されたテキストは正確ですか？", "ネイティブPDFの場合、抽出されたテキストは原文と完全に一致します。正確さはPDFにテキストレイヤーが含まれているかによって異なります。"},
			{"特定のページだけ抽出できますか？", "はい。設定でページ範囲（例：1-5, 8, 11-13）を指定して、特定ページのテキストのみを抽出できます。"},
			{"ファイルは保存されますか？", "いいえ。すべての処理はブラウザでローカルに行われます。ページを閉じるとデータは自動的に消去されます。"},
		}
	case "ko":
		return []FAQ{
			{"PDF에서 텍스트를 추출하려면?", "PDF 파일을 업로드하고 '텍스트 추출' 버튼을 클릭하세요. 각 페이지의 텍스트가 자동으로 추출됩니다."},
			{"스캔한 PDF를 지원하나요?", "이 도구는 PDF.js를 사용하여 텍스트 레이어를 추출하므로 네이티브 PDF에 적합합니다. 스캔한 PDF에는 OCR 도구를 권장합니다."},
			{"추출된 텍스트가 정확한가요?", "네이티브 PDF의 경우 추출된 텍스트가 원문과 완전히 일치합니다. 정확도는 PDF에 선택 가능한 텍스트 레이어가 포함되어 있는지에 따라 다릅니다."},
			{"특정 페이지만 추출할 수 있나요?", "네. 설정에서 페이지 범위(예: 1-5, 8, 11-13)를 지정하여 특정 페이지의 텍스트만 추출할 수 있습니다."},
			{"파일이 저장되나요?", "아니요. 모든 처리는 브라우저에서 로컬로 이루어집니다. 페이지를 닫으면 데이터가 자동으로 삭제됩니다."},
		}
	case "spa":
		return []FAQ{
			{"¿Cómo extraer texto de un PDF?", "Sube tu archivo PDF y haz clic en 'Extraer texto'. El sistema identificará y extraerá automáticamente el texto de cada página."},
			{"¿Soporta PDFs escaneados?", "Esta herramienta usa PDF.js para extraer la capa de texto, ideal para PDFs nativos. Para PDFs escaneados, te recomendamos usar una herramienta OCR."},
			{"¿Es preciso el texto extraído?", "Para PDFs nativos, el texto extraído es idéntico al original. La precisión depende de si el PDF contiene una capa de texto seleccionable."},
			{"¿Puedo extraer páginas específicas?", "Sí. Ingresa el rango de páginas en la configuración (ej: 1-5, 8, 11-13) para extraer solo las páginas deseadas."},
			{"¿Se guardan mis archivos?", "No. Todo el procesamiento se realiza localmente en tu navegador. Los datos se eliminan automáticamente al cerrar la página."},
		}
	default:
		return []FAQ{
			{"How do I extract text from a PDF?", "Upload your PDF file and click the 'Extract Text' button. The system will automatically identify and extract text from each page."},
			{"Does it support scanned PDFs?", "This tool uses PDF.js to extract the text layer, which works best for native PDFs. For scanned PDFs (image-based), we recommend using an OCR tool first."},
			{"Is the extracted text accurate?", "For native PDFs, the extracted text matches the original exactly. Accuracy depends on whether the PDF contains a selectable text layer."},
			{"Can I extract specific pages only?", "Yes. Enter a page range in the settings (e.g., 1-5, 8, 11-13) to extract text from only those pages."},
			{"Are my files saved?", "No. All processing happens locally in your browser. Data is automatically cleared when you close the page."},
		}
	}
}

func pdfMergeFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{"如何合并多个PDF文件？", "上传多个PDF文件后，可以通过拖拽调整文件顺序。设置输出文件名后点击合并按钮即可生成一个合并后的PDF文件。"},
			{"最多可以合并多少个文件？", "没有固定限制，但建议每次合并不超过20个文件以确保最佳性能。所有处理在浏览器中完成，性能取决于您的设备。"},
			{"合并后文件质量会降低吗？", "不会。PDF合并在文件级别操作，不会对内容进行重新编码，因此所有原始质量、书签和表单字段都会被保留。"},
			{"可以调整合并顺序吗？", "可以。上传文件后，通过拖拽文件行即可调整合并顺序。也可以删除不需要的文件。"},
			{"支持加密的PDF文件吗？", "如果PDF文件有密码保护，需要先解密才能合并。请先使用PDF解密工具去除密码保护。"},
		}
	case "ja":
		return []FAQ{
			{"複数のPDFを結合するには？", "複数のPDFファイルをアップロードし、ドラッグで順序を調整します。出力ファイル名を設定して「結合」ボタンをクリックするだけです。"},
			{"最大いくつのファイルを結合できますか？", "固定の制限はありませんが、最適なパフォーマンスのために一度に20ファイル以下を推奨します。"},
			{"結合後の品質は低下しますか？", "いいえ。PDF結合はファイルレベルで行われ、コンテンツは再エンコードされないため、品質が完全に保持されます。"},
			{"結合順序を変更できますか？", "はい。ファイルをアップロード後、ドラッグで結合順序を変更できます。不要なファイルは削除も可能です。"},
			{"暗号化されたPDFに対応していますか？", "パスワード保護されたPDFは、まず復号化する必要があります。PDF暗号化解除ツールをご使用ください。"},
		}
	case "ko":
		return []FAQ{
			{"여러 PDF를 병합하려면?", "여러 PDF 파일을 업로드하고 드래그하여 순서를 조정합니다. 출력 파일 이름을 설정한 후 '병합' 버튼을 클릭하세요."},
			{"최대 몇 개의 파일을 병합할 수 있나요?", "고정 제한은 없지만, 최적의 성능을 위해 한 번에 20개 이하의 파일을 권장합니다."},
			{"병합 후 품질이 저하되나요?", "아니요. PDF 병합은 파일 수준에서 이루어지며 콘텐츠를 재인코딩하지 않으므로 품질이 완벽하게 유지됩니다."},
			{"병합 순서를 변경할 수 있나요?", "네. 파일 업로드 후 드래그하여 병합 순서를 변경할 수 있습니다. 불필요한 파일도 삭제 가능합니다."},
			{"암호화된 PDF를 지원하나요?", "암호로 보호된 PDF는 먼저 복호화해야 합니다. PDF 암호화 해제 도구를 사용하세요."},
		}
	case "spa":
		return []FAQ{
			{"¿Cómo combinar múltiples PDFs?", "Sube varios archivos PDF y ajusta el orden arrastrando. Configura el nombre del archivo de salida y haz clic en 'Combinar'."},
			{"¿Cuántos archivos puedo combinar?", "No hay un límite fijo, pero recomendamos no más de 20 archivos por vez para un rendimiento óptimo."},
			{"¿La calidad disminuye al combinar?", "No. La combinación de PDFs opera a nivel de archivo sin recodificar contenido, preservando toda la calidad original."},
			{"¿Puedo cambiar el orden de combinación?", "Sí. Después de subir los archivos, arrastra las filas para ajustar el orden. También puedes eliminar archivos no deseados."},
			{"¿Soporta PDFs cifrados?", "Los PDFs protegidos con contraseña deben descifrarse primero. Usa la herramienta de descifrado de PDF antes de combinar."},
		}
	default:
		return []FAQ{
			{"How do I merge multiple PDFs?", "Upload multiple PDF files and arrange them by dragging. Set the output filename and click 'Merge' to generate a single combined PDF."},
			{"How many files can I merge?", "There's no fixed limit, but we recommend keeping it under 20 files per session for optimal performance."},
			{"Does merging reduce quality?", "No. PDF merging operates at the file level without re-encoding content, so all original quality is preserved."},
			{"Can I change the merge order?", "Yes. After uploading files, drag the file rows to rearrange the merge order. You can also remove unwanted files."},
			{"Does it support encrypted PDFs?", "Password-protected PDFs need to be decrypted first. Use the PDF decryption tool before merging."},
		}
	}
}

func pdfSplitFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{"如何拆分PDF文件？", "上传PDF后，选择拆分模式：按页码范围、每N页拆分或提取单页。设置完成后点击拆分即可获得多个PDF文件。"},
			{"拆分后的文件以什么格式下载？", "如果拆分为多个文件，会打包成ZIP下载。如果只产生一个文件，直接下载PDF。"},
			{"可以按页码范围拆分吗？", "可以。在设置中输入页码范围（如1-3, 4-7, 8-10），每个范围会生成一个单独的PDF文件。"},
			{"支持提取单个页面吗？", "支持。选择提取单页模式，每一页都会被提取为一个独立的PDF文件，方便单独使用。"},
			{"拆分会影响PDF质量吗？", "不会。拆分操作仅提取指定页面，不进行任何重新编码，原始质量完全保持不变。"},
		}
	case "ja":
		return []FAQ{
			{"PDFを分割するには？", "PDFをアップロードし、分割モード（ページ範囲、Nページごと、または1ページずつ）を選択して分割ボタンをクリックします。"},
			{"分割後のファイルはどうダウンロードされますか？", "複数のファイルに分割された場合はZIPで、1つのファイルの場合はPDFとして直接ダウンロードされます。"},
			{"ページ範囲で分割できますか？", "はい。設定でページ範囲（例：1-3, 4-7, 8-10）を入力すると、各範囲が別々のPDFファイルになります。"},
			{"1ページずつ抽出できますか？", "はい。「1ページずつ」モードを選択すると、各ページが独立したPDFファイルとして抽出されます。"},
			{"分割により品質は低下しますか？", "いいえ。分割操作は指定ページを抽出するだけで、再エンコードは行わないため、品質は完全に保持されます。"},
		}
	case "ko":
		return []FAQ{
			{"PDF를 분할하려면?", "PDF를 업로드하고 분할 모드(페이지 범위, N페이지마다, 또는 개별 페이지)를 선택한 후 분할 버튼을 클릭하세요."},
			{"분할된 파일은 어떻게 다운로드되나요?", "여러 파일로 분할된 경우 ZIP으로, 하나의 파일인 경우 PDF로 직접 다운로드됩니다."},
			{"페이지 범위로 분할할 수 있나요?", "네. 설정에서 페이지 범위(예: 1-3, 4-7, 8-10)를 입력하면 각 범위가 별도의 PDF 파일이 됩니다."},
			{"개별 페이지를 추출할 수 있나요?", "네. '개별 페이지' 모드를 선택하면 각 페이지가 독립적인 PDF 파일로 추출됩니다."},
			{"분할 후 품질이 저하되나요?", "아니요. 분할 작업은 지정된 페이지를 추출만 하며 재인코딩하지 않으므로 품질이 완벽하게 유지됩니다."},
		}
	case "spa":
		return []FAQ{
			{"¿Cómo dividir un PDF?", "Sube el PDF y elige el modo de división: por rangos de páginas, cada N páginas o páginas individuales."},
			{"¿Cómo se descargan los archivos divididos?", "Si se generan múltiples archivos, se descargan como ZIP. Si es un solo archivo, se descarga directamente como PDF."},
			{"¿Puedo dividir por rangos de páginas?", "Sí. Ingresa rangos en la configuración (ej: 1-3, 4-7, 8-10) y cada rango se convertirá en un PDF separado."},
			{"¿Puedo extraer páginas individuales?", "Sí. Selecciona el modo 'Páginas individuales' y cada página se extraerá como un PDF independiente."},
			{"¿La división afecta la calidad?", "No. La división solo extrae las páginas especificadas sin recodificar, manteniendo la calidad original intacta."},
		}
	default:
		return []FAQ{
			{"How do I split a PDF?", "Upload your PDF and choose a split mode: by page ranges, every N pages, or extract single pages. Click split to get your separated PDFs."},
			{"How are split files downloaded?", "Multiple files are packaged as a ZIP download. A single file downloads directly as a PDF."},
			{"Can I split by page ranges?", "Yes. Enter page ranges in settings (e.g., 1-3, 4-7, 8-10) and each range becomes a separate PDF file."},
			{"Can I extract individual pages?", "Yes. Select 'Extract single pages' mode and each page will be extracted as an independent PDF file."},
			{"Does splitting affect quality?", "No. Splitting only extracts specified pages without re-encoding, preserving the original quality completely."},
		}
	}
}

func pdfToImageFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{"如何将PDF转换为图片？", "上传PDF文件后，设置输出格式（PNG/JPEG）、分辨率（DPI）和页码范围，点击转换即可将每页PDF转为高清图片。"},
			{"支持哪些输出格式？", "支持PNG（无损）和JPEG（体积更小）两种格式。PNG适合需要高质量的场景，JPEG适合需要小文件体积的场景。"},
			{"最大支持多少DPI？", "支持72到300 DPI。72 DPI适合屏幕查看，150 DPI适合日常使用，300 DPI适合打印输出。"},
			{"转换后的图片如何下载？", "可以选择将所有图片打包为ZIP文件下载，也可以单独保存每张图片。转换后会有预览网格展示所有图片。"},
			{"支持批量转换吗？", "支持。一次上传即可将整个PDF的所有页面（或指定页面范围）全部转换为图片。"},
		}
	case "ja":
		return []FAQ{
			{"PDFを画像に変換するには？", "PDFをアップロードし、出力形式（PNG/JPEG）、解像度（DPI）、ページ範囲を設定して変換ボタンをクリックします。"},
			{"どの出力形式に対応していますか？", "PNG（ロスレス）とJPEG（サイズが小さい）の2つの形式に対応しています。"},
			{"最大DPIはどれくらいですか？", "72から300 DPIに対応しています。72 DPIは画面表示用、300 DPIは印刷用に適しています。"},
			{"変換された画像はどうダウンロードされますか？", "すべての画像をZIPファイルとして一括ダウンロードするか、個別に保存できます。"},
			{"一括変換に対応していますか？", "はい。一度のアップロードでPDFの全ページ（または指定ページ範囲）を画像に変換できます。"},
		}
	case "ko":
		return []FAQ{
			{"PDF를 이미지로 변환하려면?", "PDF를 업로드하고 출력 형식(PNG/JPEG), 해상도(DPI), 페이지 범위를 설정한 후 변환 버튼을 클릭하세요."},
			{"어떤 출력 형식을 지원하나요?", "PNG(무손실)와 JPEG(파일 크기가 작음) 두 가지 형식을 지원합니다."},
			{"최대 DPI는 얼마인가요?", "72~300 DPI를 지원합니다. 72 DPI는 화면 보기용, 300 DPI는 인쇄용에 적합합니다."},
			{"변환된 이미지는 어떻게 다운로드되나요?", "모든 이미지를 ZIP 파일로 일괄 다운로드하거나 개별적으로 저장할 수 있습니다."},
			{"일괄 변환이 지원되나요?", "네. 한 번의 업로드로 전체 PDF의 모든 페이지(또는 지정된 페이지 범위)를 이미지로 변환할 수 있습니다."},
		}
	case "spa":
		return []FAQ{
			{"¿Cómo convertir PDF a imágenes?", "Sube el PDF, configura el formato de salida (PNG/JPEG), resolución (DPI) y rango de páginas, luego haz clic en convertir."},
			{"¿Qué formatos de salida se soportan?", "Se soportan PNG (sin pérdidas) y JPEG (tamaño más pequeño)."},
			{"¿Cuál es el DPI máximo?", "Se soportan de 72 a 300 DPI. 72 DPI para pantalla, 300 DPI para impresión."},
			{"¿Cómo se descargan las imágenes?", "Puedes descargar todas las imágenes como archivo ZIP o guardarlas individualmente."},
			{"¿Soporta conversión por lotes?", "Sí. Una sola carga convierte todas las páginas del PDF (o un rango específico) a imágenes."},
		}
	default:
		return []FAQ{
			{"How do I convert PDF to images?", "Upload your PDF, set the output format (PNG/JPEG), resolution (DPI), and page range, then click convert to generate high-quality images from each page."},
			{"What output formats are supported?", "PNG (lossless) and JPEG (smaller file size) are both supported. PNG is best for quality, JPEG for smaller files."},
			{"What's the maximum DPI?", "DPI ranges from 72 to 300. 72 DPI for screen viewing, 150 DPI for general use, and 300 DPI for print output."},
			{"How are converted images downloaded?", "You can package all images as a ZIP file or save individual images. A preview grid shows all converted pages."},
			{"Does it support batch conversion?", "Yes. Upload once to convert all pages (or a specified range) of the PDF to images in one go."},
		}
	}
}

func pdfWatermarkFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{"如何给PDF添加水印？", "上传PDF后，选择文字或图片水印类型，设置字体大小、颜色、透明度、旋转角度和位置，点击应用即可。"},
			{"支持哪些水印类型？", "支持文字水印和图片水印两种类型。文字水印可自定义内容、字体大小、颜色；图片水印支持PNG/SVG等格式。"},
			{"如何控制水印透明度？", "通过透明度滑块设置5%-100%的不透明度。通常建议使用20%-40%的透明度，既可见又不影响正文阅读。"},
			{"可以指定水印应用到特定页面吗？", "可以。在设置中输入页码范围（如1-5），水印将只应用到指定页面。留空则应用到所有页面。"},
			{"支持9点定位吗？", "支持。可以在左上、中上、右上、左中、正中、右中、左下、中下、右下9个位置中选择水印放置位置。"},
		}
	case "ja":
		return []FAQ{
			{"PDFに透かしを追加するには？", "PDFをアップロードし、テキストまたは画像の透かしタイプを選択し、フォントサイズ、色、不透明度、回転、位置を設定します。"},
			{"どの透かしタイプに対応していますか？", "テキスト透かしと画像透かしの両方に対応しています。テキストは内容・サイズ・色をカスタマイズできます。"},
			{"透かしの透明度はどう設定しますか？", "不透明度スライダーで5%-100%を設定できます。通常、本文の読みやすさを保つため20%-40%を推奨します。"},
			{"特定のページにのみ透かしを追加できますか？", "はい。設定でページ範囲を指定すると、そのページにのみ透かしが適用されます。"},
			{"9点配置に対応していますか？", "はい。左上、中央上、右上など9つの配置位置から選択できます。"},
		}
	case "ko":
		return []FAQ{
			{"PDF에 워터마크를 추가하려면?", "PDF를 업로드하고 텍스트 또는 이미지 워터마크 유형을 선택한 후 크기, 색상, 투명도, 회전, 위치를 설정하세요."},
			{"어떤 워터마크 유형을 지원하나요?", "텍스트 워터마크와 이미지 워터마크 모두 지원합니다. 텍스트는 내용, 크기, 색상을 커스터마이즈할 수 있습니다."},
			{"투명도는 어떻게 설정하나요?", "불투명도 슬라이더로 5%-100%를 설정할 수 있습니다. 본문 가독성을 위해 20%-40%를 권장합니다."},
			{"특정 페이지에만 워터마크를 적용할 수 있나요?", "네. 설정에서 페이지 범위를 지정하면 해당 페이지에만 워터마크가 적용됩니다."},
			{"9포인트 배치를 지원하나요?", "네. 좌상, 중상, 우상 등 9개의 배치 위치 중 선택할 수 있습니다."},
		}
	case "spa":
		return []FAQ{
			{"¿Cómo añadir una marca de agua al PDF?", "Sube el PDF, elige texto o imagen como tipo de marca, configura tamaño, color, opacidad, rotación y posición."},
			{"¿Qué tipos de marca de agua se soportan?", "Se soportan marcas de agua de texto e imagen. El texto es personalizable en contenido, tamaño y color."},
			{"¿Cómo controlo la opacidad?", "Usa el control deslizante para ajustar del 5% al 100%. Recomendamos 20%-40% para que sea visible sin afectar la lectura."},
			{"¿Puedo aplicar la marca a páginas específicas?", "Sí. Especifica un rango de páginas en la configuración para aplicar la marca solo a esas páginas."},
			{"¿Soporta posicionamiento de 9 puntos?", "Sí. Puedes elegir entre 9 posiciones: superior izquierda, centro, inferior derecha, etc."},
		}
	default:
		return []FAQ{
			{"How do I add a watermark to a PDF?", "Upload your PDF, choose text or image watermark type, set font size, color, opacity, rotation, and position, then click apply."},
			{"What watermark types are supported?", "Both text and image watermarks are supported. Text watermarks allow custom content, size, and color. Image watermarks support PNG/SVG formats."},
			{"How do I control watermark opacity?", "Use the opacity slider to set 5%-100% transparency. We recommend 20%-40% for visibility without affecting readability."},
			{"Can I apply watermarks to specific pages?", "Yes. Enter a page range in settings to apply the watermark only to specified pages. Leave blank for all pages."},
			{"Does it support 9-point positioning?", "Yes. Choose from 9 positions: top-left, top-center, top-right, middle-left, center, middle-right, bottom-left, bottom-center, bottom-right."},
		}
	}
}

func pdfEncryptFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{"如何给PDF加密？", "上传PDF后，设置用户密码（打开PDF时需要输入）和可选的权限密码，配置权限选项后点击加密即可生成受保护的PDF。"},
			{"使用什么加密算法？", "使用AES-256加密算法，这是目前最安全的PDF加密标准，被广泛应用于商业和政府文档保护。"},
			{"用户密码和权限密码有什么区别？", "用户密码用于打开PDF文件；权限密码用于控制打印、复制、修改等操作权限。两者可以不同。"},
			{"可以控制哪些权限？", "可以控制打印、复制文本、修改文档、添加注释、填写表单、页面组装等6项权限。"},
			{"忘记密码怎么办？", "PDF加密是不可逆的，请务必妥善保管密码。如果忘记密码，将无法打开或恢复加密的PDF文件。"},
		}
	case "ja":
		return []FAQ{
			{"PDFを暗号化するには？", "PDFをアップロードし、ユーザーパスワードとオプションの権限パスワードを設定し、権限オプションを構成して暗号化をクリックします。"},
			{"どの暗号化アルゴリズムを使用していますか？", "AES-256暗号化を使用しています。これは現在利用可能な最も安全なPDF暗号化標準です。"},
			{"ユーザーパスワードと権限パスワードの違いは？", "ユーザーパスワードはPDFを開くため、権限パスワードは印刷・コピー・変更などの権限を制御するために使用します。"},
			{"どの権限を制御できますか？", "印刷、テキストコピー、文書変更、注釈追加、フォーム入力、ページアセンブリの6つの権限を制御できます。"},
			{"パスワードを忘れた場合は？", "PDF暗号化は不可逆的です。パスワードは必ず安全に保管してください。忘れた場合、暗号化されたPDFを開くことはできません。"},
		}
	case "ko":
		return []FAQ{
			{"PDF를 암호화하려면?", "PDF를 업로드하고 사용자 암호와 선택적 권한 암호를 설정한 후 권한 옵션을 구성하고 암호화를 클릭하세요."},
			{"어떤 암호화 알고리즘을 사용하나요?", "AES-256 암호화를 사용합니다. 현재 가장 안전한 PDF 암호화 표준입니다."},
			{"사용자 암호와 권한 암호의 차이는?", "사용자 암호는 PDF를 열 때 필요하고, 권한 암호는 인쇄, 복사, 수정 등의 권한을 제어하는 데 사용됩니다."},
			{"어떤 권한을 제어할 수 있나요?", "인쇄, 텍스트 복사, 문서 수정, 주석 추가, 양식 작성, 페이지 조립의 6가지 권한을 제어할 수 있습니다."},
			{"암호를 잊어버리면 어떻게 되나요?", "PDF 암호화는 되돌릴 수 없습니다. 암호는 반드시 안전하게 보관하세요. 잊어버리면 암호화된 PDF를 열 수 없습니다."},
		}
	case "spa":
		return []FAQ{
			{"¿Cómo cifrar un PDF?", "Sube el PDF, configura la contraseña de usuario y opcionalmente la de permisos, ajusta las opciones y haz clic en cifrar."},
			{"¿Qué algoritmo de cifrado se usa?", "Se usa cifrado AES-256, el estándar más seguro actualmente disponible para documentos PDF."},
			{"¿Cuál es la diferencia entre las contraseñas?", "La contraseña de usuario abre el PDF; la de permisos controla impresión, copia, modificación, etc."},
			{"¿Qué permisos puedo controlar?", "Puedes controlar impresión, copia de texto, modificación, anotaciones, formularios y ensamblaje de páginas."},
			{"¿Qué pasa si olvido la contraseña?", "El cifrado es irreversible. Guarda tu contraseña de forma segura. Si la olvidas, no podrás abrir el PDF."},
		}
	default:
		return []FAQ{
			{"How do I encrypt a PDF?", "Upload your PDF, set a user password (to open the PDF) and an optional owner password, configure permissions, and click encrypt."},
			{"What encryption algorithm is used?", "AES-256 encryption is used — the most secure PDF encryption standard widely adopted for commercial and government documents."},
			{"What's the difference between user and owner passwords?", "The user password is required to open the PDF. The owner password controls permissions like printing, copying, and modifying."},
			{"What permissions can I control?", "You can control 6 permissions: printing, text copying, document modification, annotations, form filling, and page assembly."},
			{"What if I forget the password?", "PDF encryption is irreversible. Store your password securely. If forgotten, the encrypted PDF cannot be opened or recovered."},
		}
	}
}

func pdfCompressFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{"如何压缩PDF文件？", "上传PDF后，选择压缩级别（屏幕72DPI、电子书150DPI或打印300DPI），点击压缩即可减小文件大小。"},
			{"压缩后质量会明显下降吗？", "取决于压缩级别。屏幕模式压缩率最高但质量降低较明显；打印模式几乎不影响视觉质量但压缩率较低。"},
			{"压缩的原理是什么？", "通过重新编码PDF中的嵌入图片（降低分辨率和质量）并移除不必要的元数据来减小文件大小。"},
			{"支持哪些压缩选项？", "支持三个压缩级别、移除文档元数据和展平表单字段选项。可以根据需求灵活选择。"},
			{"最大支持多大的文件？", "支持最大50MB的PDF文件。压缩在浏览器中完成，大文件可能需要较长处理时间。"},
		}
	case "ja":
		return []FAQ{
			{"PDFを圧縮するには？", "PDFをアップロードし、圧縮レベル（画面72DPI、電子書籍150DPI、または印刷300DPI）を選択して圧縮をクリックします。"},
			{"圧縮後の品質はどうなりますか？", "圧縮レベルによって異なります。画面モードは圧縮率が高いですが品質低下が目立ちます。印刷モードは視覚品質への影響が最小限です。"},
			{"圧縮の仕組みは？", "PDF内の埋め込み画像を再エンコード（解像度と品質を低下）し、不要なメタデータを削除してファイルサイズを削減します。"},
			{"どの圧縮オプションがありますか？", "3つの圧縮レベル、メタデータ削除、フォームフィールドのフラット化オプションがあります。"},
			{"最大ファイルサイズは？", "最大50MBのPDFファイルに対応しています。大きなファイルは処理に時間がかかる場合があります。"},
		}
	case "ko":
		return []FAQ{
			{"PDF를 압축하려면?", "PDF를 업로드하고 압축 수준(화면 72DPI, 전자책 150DPI, 또는 인쇄 300DPI)을 선택한 후 압축을 클릭하세요."},
			{"압축 후 품질이 크게 저하되나요?", "압축 수준에 따라 다릅니다. 화면 모드는 압축률이 높지만 품질 저하가 뚜렷합니다. 인쇄 모드는 시각적 품질에 거의 영향을 주지 않습니다."},
			{"압축 원리는 무엇인가요?", "PDF 내의 임베디드 이미지를 재인코딩(해상도와 품질 저하)하고 불필요한 메타데이터를 제거하여 파일 크기를 줄입니다."},
			{"어떤 압축 옵션이 있나요?", "세 가지 압축 수준, 메타데이터 제거, 양식 필드 평면화 옵션이 있습니다."},
			{"최대 파일 크기는 얼마인가요?", "최대 50MB의 PDF 파일을 지원합니다. 큰 파일은 처리 시간이 더 걸릴 수 있습니다."},
		}
	case "spa":
		return []FAQ{
			{"¿Cómo comprimir un PDF?", "Sube el PDF, elige el nivel de compresión (72 DPI pantalla, 150 DPI eBook, o 300 DPI impresión) y haz clic en comprimir."},
			{"¿La calidad disminuye notablemente?", "Depende del nivel. El modo pantalla tiene mayor compresión pero más pérdida visual. El modo impresión apenas afecta la calidad."},
			{"¿Cómo funciona la compresión?", "Se recodifican las imágenes embebidas (reduciendo resolución y calidad) y se eliminan metadatos innecesarios."},
			{"¿Qué opciones de compresión hay?", "Tres niveles de compresión, eliminación de metadatos y aplanamiento de campos de formulario."},
			{"¿Cuál es el tamaño máximo?", "Se soportan archivos PDF de hasta 50 MB. Archivos grandes pueden tardar más en procesarse."},
		}
	default:
		return []FAQ{
			{"How do I compress a PDF?", "Upload your PDF, choose a compression level (Screen 72 DPI, eBook 150 DPI, or Printer 300 DPI), and click compress to reduce file size."},
			{"Does compression significantly reduce quality?", "It depends on the level. Screen mode has the highest compression with noticeable quality loss. Printer mode barely affects visual quality."},
			{"How does compression work?", "By re-encoding embedded images in the PDF (reducing resolution and quality) and stripping unnecessary metadata to reduce file size."},
			{"What compression options are available?", "Three compression levels, strip document metadata, and flatten form fields options are available."},
			{"What's the maximum file size?", "PDF files up to 50 MB are supported. Larger files may take longer to process in the browser."},
		}
	}
}
