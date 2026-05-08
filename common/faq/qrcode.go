package faq

// QRFAQs returns FAQs for QR code generator by language.
func QRFAQs(lang string) []FAQ {
	switch lang {
	case "en":
		return []FAQ{
			{Q: "Are the generated QR codes free?", A: "Yes, all QR codes generated on this tool are completely free. You can use them for personal or commercial purposes without any restrictions."},
			{Q: "Do the QR codes expire?", A: "No. Static QR codes never expire. As long as the destination content (e.g., the URL) remains valid, the QR code will keep working forever."},
			{Q: "Can I add my logo to the QR code?", A: "Yes! You can upload any image as a logo to embed in the center of your QR code. We recommend using high error correction level (Q or H) when adding logos."},
			{Q: "What image formats can I download?", A: "You can download in PNG (high-resolution 2048px), SVG (vector, infinite scale), JPG, and EPS (for professional printing)."},
			{Q: "What is the difference between QR code types?", A: "Different types encode different data: URL opens a website, vCard saves contact info, WiFi connects to a network, SMS sends a text, Email drafts a message, Bitcoin handles crypto payments, etc."},
			{Q: "How do I scan a QR code?", A: "On iOS and most Android devices, just open the camera app and point it at the QR code. A notification will appear to open the link or action. No app needed."},
		}
	case "ja":
		return []FAQ{
			{Q: "生成したQRコードは無料ですか？", A: "はい、本ツールで生成したすべてのQRコードは完全無料です。個人・商用を問わず制限なく使用できます。"},
			{Q: "QRコードに有効期限はありますか？", A: "ありません。静的QRコードは永久に有効です。リンク先のコンテンツ（URLなど）が有効である限り、QRコードは機能し続けます。"},
			{Q: "QRコードにロゴを追加できますか？", A: "はい！任意の画像をロゴとしてアップロードし、QRコードの中央に埋め込めます。ロゴ追加時は高い誤り訂正レベル（QまたはH）を推奨します。"},
			{Q: "どの画像形式でダウンロードできますか？", A: "PNG（高解像度2048px）・SVG（ベクター、無限スケール）・JPG・EPS（プロ印刷用）でダウンロードできます。"},
			{Q: "QRコードの種類による違いは？", A: "種類によってエンコードするデータが異なります：URLはWebサイトを開く、vCardは連絡先を保存、WiFiはネットワークに自動接続、SMSはテキスト送信、Emailはメール下書き作成、Bitcoinは仮想通貨決済など。"},
			{Q: "QRコードのスキャン方法は？", A: "iOSとほとんどのAndroid端末では、カメラアプリをQRコードに向けるだけでスキャンできます。専用アプリは不要です。"},
		}
	case "ko":
		return []FAQ{
			{Q: "생성된 QR 코드는 무료인가요?", A: "네, 이 도구에서 생성된 모든 QR 코드는 완전히 무료입니다. 개인 또는 상업적 목적으로 제한 없이 사용할 수 있습니다."},
			{Q: "QR 코드는 만료되나요?", A: "아니요. 정적 QR 코드는 만료되지 않습니다. 대상 콘텐츠(예: URL)가 유효한 한 QR 코드는 영구적으로 작동합니다."},
			{Q: "QR 코드에 로고를 추가할 수 있나요?", A: "네! 이미지를 업로드하여 QR 코드 중앙에 로고로 삽입할 수 있습니다. 로고 추가 시 높은 오류 수정 수준(Q 또는 H)을 권장합니다."},
			{Q: "어떤 이미지 형식으로 다운로드할 수 있나요?", A: "PNG(고해상도 2048px), SVG(벡터, 무한 확대), JPG, EPS(전문 인쇄용)로 다운로드할 수 있습니다."},
			{Q: "QR 코드 유형의 차이는 무엇인가요?", A: "유형마다 다른 데이터를 인코딩합니다: URL은 웹사이트 열기, vCard는 연락처 저장, WiFi는 네트워크 자동 연결, SMS는 문자 전송, Email은 메일 작성, Bitcoin은 암호화폐 결제 등."},
			{Q: "QR 코드를 스캔하는 방법은?", A: "iOS와 대부분의 Android 기기에서 카메라 앱을 QR 코드에 가져다 대면 됩니다. 별도 앱이 필요 없습니다."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Los códigos QR generados son gratuitos?", A: "Sí, todos los códigos QR generados con esta herramienta son completamente gratuitos. Puedes usarlos para uso personal o comercial sin restricciones."},
			{Q: "¿Los códigos QR tienen fecha de caducidad?", A: "No. Los códigos QR estáticos nunca caducan. Mientras el contenido de destino (como la URL) siga siendo válido, el código QR seguirá funcionando para siempre."},
			{Q: "¿Puedo añadir mi logo al código QR?", A: "¡Sí! Puedes subir cualquier imagen como logo para incrustarla en el centro del código QR. Recomendamos usar un nivel de corrección de errores alto (Q o H) al añadir logos."},
			{Q: "¿En qué formatos puedo descargar?", A: "Puedes descargar en PNG (alta resolución 2048px), SVG (vectorial, escala infinita), JPG y EPS (para impresión profesional)."},
			{Q: "¿Cuál es la diferencia entre los tipos de código QR?", A: "Distintos tipos codifican distintos datos: URL abre un sitio web, vCard guarda contacto, WiFi conecta a una red, SMS envía un texto, Email redacta un mensaje, Bitcoin gestiona pagos cripto, etc."},
			{Q: "¿Cómo escaneo un código QR?", A: "En iOS y la mayoría de Android, abre la cámara y apúntala al código QR. Aparecerá una notificación para abrir el enlace o acción. No necesitas ninguna app."},
		}
	default: // zh
		return []FAQ{
			{Q: "生成的二维码免费吗？", A: "是的，本工具生成的所有二维码完全免费，可用于个人或商业用途，无任何限制。"},
			{Q: "二维码会过期吗？", A: "不会。静态二维码永久有效，只要目标内容（如网址）依然可访问，二维码就会一直有效。"},
			{Q: "可以在二维码中加入 Logo 吗？", A: "可以！你可以上传任意图片作为 Logo 嵌入到二维码中央。添加 Logo 时建议使用较高的纠错级别（Q 或 H）。"},
			{Q: "可以下载哪些格式？", A: "支持下载 PNG（高清 2048px）、SVG（矢量图，无限缩放）、JPG 以及 EPS（专业印刷用）。"},
			{Q: "各种类型的二维码有什么区别？", A: "不同类型编码不同内容：URL 打开网站、vCard 保存联系人、WiFi 自动连接网络、短信预设文字、邮件预填内容、比特币用于加密货币支付等。"},
			{Q: "如何扫描二维码？", A: "在 iOS 和大多数 Android 设备上，只需打开相机 App 对准二维码即可。无需安装专门的扫码 App。"},
		}
	}
}
