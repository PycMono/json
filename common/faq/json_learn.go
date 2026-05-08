package faq

// JSONLearnFAQs returns FAQs for JSON learning hub by language.
func JSONLearnFAQs(lang string) []FAQ {
	// Chinese FAQ
	if lang == "zh" {
		return []FAQ{
			{Q: "json 的 JSON 教程适合完全零基础的人吗？", A: "完全适合。我们的入门路径从「什么是 JSON」讲起，用大量图解和可运行的代码示例，帮助零基础用户在 2 小时内掌握 JSON 核心概念。每篇文章都有难度标识，你可以按照入门 → 中级 → 高级的路径循序渐进。"},
			{Q: "这些教程覆盖哪些编程语言？", A: "覆盖 10 种主流语言：Python、JavaScript/Node.js、Java（Gson/Jackson）、Go、C#、PHP、Ruby、Rust（serde）、Swift 和 TypeScript。每种语言都有独立的深度教程，包含完整可运行的代码示例。"},
			{Q: "教程中的代码示例可以直接运行吗？", A: "是的。我们的教程内嵌了代码高亮和复制功能，JSON 相关的示例可以直接在 json 的 JSON 工具中验证和运行。你可以修改代码、实时查看结果，无需安装任何开发环境。"},
			{Q: "JSON 教程内容会持续更新吗？", A: "会。我们持续跟踪 JSON 生态的最新发展，包括新的 RFC 标准、JSON Schema 更新、安全最佳实践等。目前已有 53 篇教程，计划在 2026 年底扩展到 70+ 篇，新增 AI/大模型、边缘计算等前沿主题。"},
			{Q: "这些教程和 W3Schools、MDN 的 JSON 教程有什么不同？", A: "我们的教程更深入、更系统。W3Schools 侧重快速入门（约 15 篇），MDN 侧重 Web API 文档（约 8 篇）。我们提供 53+ 篇覆盖完整知识体系的教程，从基础语法到 JSON Schema、JSONPath、安全防御、性能优化，配备代码高亮、复制和中英文切换功能。"},
		}
	}
	// Japanese FAQ
	if lang == "ja" {
		return []FAQ{
			{Q: "jsonのJSONチュートリアルは完全な初心者でも大丈夫ですか？", A: "もちろんです。初心者向けのパスは「JSONとは何か」から始まり、図解と実行可能なコード例で、初心者でも2時間以内にJSONの核心概念を理解できます。各記事には難易度表示があり、入門→中級→上級の順で学習できます。"},
			{Q: "どのプログラミング言語をカバーしていますか？", A: "10の主要言語をカバーしています：Python、JavaScript/Node.js、Java（Gson/Jackson）、Go、C#、PHP、Ruby、Rust（serde）、Swift、TypeScript。各言語には独立した詳細なチュートリアルと、完全に実行可能なコード例が含まれています。"},
			{Q: "チュートリアルのコード例は実行できますか？", A: "はい。チュートリアルにはシンタックスハイライトとワンクリックコピー機能があります。JSON関連の例は、jsonのJSONツールで直接検証・テストでき、開発環境をインストールする必要はありません。"},
			{Q: "チュートリアルの内容は継続的に更新されますか？", A: "はい。新しいRFC標準、JSON Schemaの更新、セキュリティのベストプラクティスなど、JSONエコシステムの最新動向を追跡しています。現在53のチュートリアルがあり、2026年末までに70以上に拡張し、AI/LLMやエッジコンピューティングのトピックを追加する予定です。"},
			{Q: "W3SchoolsやMDNのJSONチュートリアルとどう違いますか？", A: "当サイトのチュートリアルはより深く、体系的です。W3Schoolsはクイックスタート（約15記事）、MDNはWeb APIドキュメント（約8記事）に焦点を当てています。当サイトは基礎構文からJSON Schema、JSONPath、セキュリティ、パフォーマンスまで完全な知識体系をカバーする53以上の記事を提供し、シンタックスハイライト、コピーボタン、バイリンガルサポートを備えています。"},
		}
	}
	// Korean FAQ
	if lang == "ko" {
		return []FAQ{
			{Q: "json의 JSON 튜토리얼은 완전 초보자도 이해할 수 있나요?", A: "물론입니다. 초보자 경로는 'JSON이란 무엇인가'부터 시작하여 다이어그램과 실행 가능한 코드 예제로 2시간 이내에 JSON 핵심 개념을 파악할 수 있습니다. 각 글에는 난이도 표시가 있으며, 입문 → 중급 → 고급 순서로 학습할 수 있습니다."},
			{Q: "어떤 프로그래밍 언어를 다루나요?", A: "10개의 주요 언어를 다룹니다: Python, JavaScript/Node.js, Java (Gson/Jackson), Go, C#, PHP, Ruby, Rust (serde), Swift, TypeScript. 각 언어에는 독립적인 심층 튜토리얼과 완전히 실행 가능한 코드 예제가 포함되어 있습니다."},
			{Q: "튜토리얼의 코드 예제를 직접 실행할 수 있나요?", A: "네. 튜토리얼에는 구문 강조와 원클릭 복사 기능이 있습니다. JSON 관련 예제는 개발 환경을 설치하지 않고도 json의 JSON 도구에서 직접 검증하고 테스트할 수 있습니다."},
			{Q: "튜토리얼 내용은 지속적으로 업데이트되나요?", A: "네. 새로운 RFC 표준, JSON Schema 업데이트, 보안 모범 사례 등 JSON 생태계의 최신 동향을 계속 추적하고 있습니다. 현재 53개의 튜토리얼이 있으며, 2026년 말까지 AI/LLM 및 엣지 컴퓨팅 주제를 포함하여 70개 이상으로 확장할 계획입니다."},
			{Q: "W3Schools나 MDN JSON 튜토리얼과 어떻게 다른가요?", A: "당사 튜토리얼은 더 깊고 체계적입니다. W3Schools는 빠른 시작(약 15개)에, MDN은 Web API 문서(약 8개)에 중점을 둡니다. 당사는 기본 구문부터 JSON Schema, JSONPath, 보안 및 성능까지 완전한 지식 체계를 다루는 53개 이상의 글을 제공하며, 구문 강조, 복사 버튼, 이중 언어 지원을 갖추고 있습니다."},
		}
	}
	// Spanish FAQ
	if lang == "spa" {
		return []FAQ{
			{Q: "¿Los tutoriales JSON de json son adecuados para principiantes completos?", A: "Absolutamente. Nuestra ruta para principiantes comienza desde '¿Qué es JSON?' con diagramas visuales y ejemplos de código ejecutables, ayudando a los principiantes a comprender los conceptos clave de JSON en 2 horas. Cada artículo tiene un indicador de dificultad, y puedes seguir la ruta principiante → intermedio → avanzado progresivamente."},
			{Q: "¿Qué lenguajes de programación cubren estos tutoriales?", A: "Cubrimos 10 lenguajes principales: Python, JavaScript/Node.js, Java (Gson/Jackson), Go, C#, PHP, Ruby, Rust (serde), Swift y TypeScript. Cada lenguaje tiene un tutorial dedicado con ejemplos de código completos y ejecutables."},
			{Q: "¿Puedo ejecutar los ejemplos de código en los tutoriales?", A: "Sí. Nuestros tutoriales incluyen resaltado de sintaxis y copia con un clic. Los ejemplos relacionados con JSON se pueden validar y probar directamente en las herramientas JSON de json sin necesidad de instalar ningún entorno de desarrollo."},
			{Q: "¿El contenido del tutorial se actualizará continuamente?", A: "Sí. Rastreamos continuamente los últimos desarrollos del ecosistema JSON, incluidos nuevos estándares RFC, actualizaciones de JSON Schema y mejores prácticas de seguridad. Actualmente tenemos 53 tutoriales y planeamos expandirnos a más de 70 para finales de 2026, cubriendo temas de IA/LLM y computación en el borde."},
			{Q: "¿En qué se diferencian de los tutoriales JSON de W3Schools o MDN?", A: "Nuestros tutoriales son más profundos y sistemáticos. W3Schools se centra en inicios rápidos (~15 artículos), MDN en documentación de Web API (~8 artículos). Nosotros proporcionamos más de 53 artículos que cubren el sistema de conocimiento completo, desde sintaxis básica hasta JSON Schema, JSONPath, seguridad y rendimiento, con resaltado de sintaxis, botones de copia y soporte bilingüe."},
		}
	}
	// English FAQ (default)
	return []FAQ{
		{Q: "Are json's JSON tutorials suitable for complete beginners?", A: "Absolutely. Our beginner path starts from 'What is JSON' with visual diagrams and runnable code examples, helping beginners grasp core JSON concepts within 2 hours. Each article has a difficulty indicator, and you can follow the beginner → intermediate → advanced path progressively."},
		{Q: "Which programming languages do these tutorials cover?", A: "We cover 10 mainstream languages: Python, JavaScript/Node.js, Java (Gson/Jackson), Go, C#, PHP, Ruby, Rust (serde), Swift and TypeScript. Each language has a dedicated in-depth tutorial with complete runnable code examples."},
		{Q: "Can I run the code examples in the tutorials?", A: "Yes. Our tutorials feature syntax highlighting and one-click copy. JSON-related examples can be validated and tested directly in json's JSON tools without installing any development environment."},
		{Q: "Will the tutorial content be continuously updated?", A: "Yes. We continuously track the latest JSON ecosystem developments, including new RFC standards, JSON Schema updates and security best practices. We currently have 53 tutorials and plan to expand to 70+ by end of 2026, covering AI/LLM and edge computing topics."},
		{Q: "How are these different from W3Schools or MDN JSON tutorials?", A: "Our tutorials are deeper and more systematic. W3Schools focuses on quick starts (~15 articles), MDN on Web API docs (~8 articles). We provide 53+ articles covering the complete knowledge system, from basic syntax to JSON Schema, JSONPath, security and performance, with syntax highlighting, copy buttons and bilingual support."},
	}
}
