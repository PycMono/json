package faq

// CompeteFAQs returns AI Compete FAQs by language.
func CompeteFAQs(lang string) []FAQ {
	switch lang {
	case "zh":
		return []FAQ{
			{Q: "AI 竞品分析助手是如何工作的？", A: "您只需输入您的产品网址或一段产品描述，系统会通过 AI 实时搜索互联网，从营销策略、产品特性、定价模型、目标受众、用户口碑、公司信息、SWOT 和战略建议八个维度，对您指定的竞品进行全面分析，并以结构化报告的形式呈现，整个过程通常只需 1-3 分钟。"},
			{Q: "我可以分析多少个竞品？", A: "目前每次分析最多支持 5 个竞品。您可以使用 AI 推荐功能，让系统根据您的产品自动发现市场上的主要竞争对手，也可以手动输入竞品网址或名称。建议先从 2-3 个最核心的竞品开始，获得最清晰的对比洞察。"},
			{Q: "分析结果的准确性如何保证？", A: "本工具通过 AI 结合实时网络搜索来获取竞品的最新公开信息，包括官网、定价页、产品文档、App Store 评价以及 G2/Capterra 等评测平台的用户反馈。AI 会对这些信息进行综合分析并标注依据，但由于网络信息存在滞后性，建议将结果作为参考起点，再结合人工验证进行深度判断。"},
			{Q: "分析报告支持导出吗？", A: "支持。分析完成后，您可以一键将完整报告导出为 Markdown 或 PDF 格式，内容包含八大维度的详细分析和竞品对比表格，可以直接粘贴到 Notion、Confluence 或其他文档工具中使用，也可以复制后发送给团队成员共享。"},
			{Q: "我的产品信息和竞品数据会被保存吗？", A: "不会。您输入的产品描述和竞品信息仅在当次分析请求中使用。分析完成后，服务器不会保留任何您的输入内容或生成的分析结果。所有数据仅在您的浏览器会话期间存在，关闭页面后即消失，请放心使用。"},
		}
	case "ja":
		return []FAQ{
			{Q: "AI競合分析アシスタントはどのように機能しますか？", A: "製品のURLまたは説明を入力するだけで、システムがAIを使用してリアルタイムでインターネットを検索し、マーケティング戦略、製品機能、価格モデル、ターゲット層、顧客センチメント、企業情報、SWOT分析、戦略提案の8つの観点から、指定した競合他社を包括的に分析します。通常1〜3分で完了します。"},
			{Q: "何社の競合他社を分析できますか？", A: "現在、1回の分析で最大5社の競合他社をサポートしています。AI推奨機能を使用すると、製品に基づいて主要な競合他社を自動的に発見できます。また、競合他社のURLや名前を手動で入力することもできます。最初は2〜3社の主要な競合他社から始めることをお勧めします。"},
			{Q: "分析結果の精度はどのように保証されますか？", A: "このツールはAIとリアルタイムのウェブ検索を組み合わせて、公式サイト、価格ページ、製品ドキュメント、App Storeのレビュー、G2やCapterraなどのプラットフォームからの最新情報を取得します。AIはこれらの情報を総合的に分析しますが、情報に遅延が生じる可能性があるため、結果を参考として活用し、さらに人工的な検証を行うことをお勧めします。"},
			{Q: "分析レポートはエクスポートできますか？", A: "はい、対応しています。分析が完了したら、完全なレポートをMarkdownまたはPDF形式でワンクリックでエクスポートできます。内容には8つの分析ディメンションと競合比較表が含まれており、Notion、Confluenceなどのドキュメントツールに直接貼り付けることができます。"},
			{Q: "製品情報や競合データは保存されますか？", A: "いいえ、保存されません。入力した製品の説明と競合情報は、現在の分析リクエストにのみ使用されます。分析完了後、サーバーはいかなる入力内容や生成された分析結果も保持しません。すべてのデータはブラウザセッション中にのみ存在し、ページを閉じると消えます。"},
		}
	case "ko":
		return []FAQ{
			{Q: "AI 경쟁사 분석 도우미는 어떻게 작동하나요?", A: "제품 URL이나 설명을 입력하기만 하면 시스템이 AI를 사용하여 실시간으로 인터넷을 검색하고, 마케팅 전략, 제품 특성, 가격 모델, 타겟 고객, 사용자 감성, 기업 정보, SWOT 분석, 전략 제안 등 8가지 차원에서 지정한 경쟁사를 종합 분석합니다. 전체 과정은 보통 1-3분이 소요됩니다."},
			{Q: "몇 개의 경쟁사를 분석할 수 있나요?", A: "현재 분석당 최대 5개의 경쟁사를 지원합니다. AI 추천 기능을 사용하면 제품을 기반으로 주요 경쟁사를 자동으로 발견할 수 있으며, 경쟁사 URL이나 이름을 직접 입력할 수도 있습니다. 처음에는 2-3개의 핵심 경쟁사부터 시작하는 것을 권장합니다."},
			{Q: "분석 결과의 정확성은 어떻게 보장되나요?", A: "이 도구는 AI와 실시간 웹 검색을 결합하여 공식 웹사이트, 가격 페이지, G2, Capterra 등 플랫폼의 최신 정보를 수집합니다. AI가 이 정보를 종합 분석하지만 정보 지연이 있을 수 있으므로 결과를 참고 자료로 활용하고 추가적인 수동 검증을 권장합니다."},
			{Q: "분석 보고서를 내보낼 수 있나요?", A: "네, 지원합니다. 분석이 완료되면 클릭 한 번으로 전체 보고서를 Markdown 또는 PDF 형식으로 내보낼 수 있습니다. 8가지 분석 차원과 경쟁사 비교 표가 포함되어 있으며, Notion, Confluence 등 문서 도구에 직접 붙여넣기하여 사용할 수 있습니다."},
			{Q: "제품 정보와 경쟁사 데이터가 저장되나요?", A: "아니요, 저장되지 않습니다. 입력한 제품 설명과 경쟁사 정보는 현재 분석 요청에만 사용됩니다. 분석 완료 후 서버는 입력 내용이나 생성된 분석 결과를 보관하지 않습니다. 모든 데이터는 브라우저 세션 동안에만 존재하며 페이지를 닫으면 사라집니다."},
		}
	case "spa":
		return []FAQ{
			{Q: "¿Cómo funciona el asistente de análisis de competidores con IA?", A: "Solo necesita ingresar la URL de su producto o una descripción, y el sistema utilizará IA para buscar en Internet en tiempo real, analizando a sus competidores desde ocho dimensiones: estrategias de marketing, características del producto, modelos de precios, público objetivo, sentimiento del cliente, información de la empresa, análisis SWOT y recomendaciones estratégicas. El proceso suele tomar entre 1 y 3 minutos."},
			{Q: "¿Cuántos competidores puedo analizar?", A: "Actualmente se admiten hasta 5 competidores por análisis. Puede usar la función de recomendación de IA para descubrir automáticamente a los principales competidores del mercado según su producto, o ingresar manualmente las URLs o nombres de los competidores. Se recomienda comenzar con los 2 o 3 competidores más importantes para obtener información más clara."},
			{Q: "¿Cómo se garantiza la precisión de los resultados del análisis?", A: "Esta herramienta combina IA con búsqueda web en tiempo real para obtener la información pública más reciente de los competidores, incluyendo sitios web oficiales, páginas de precios, documentación del producto y reseñas de plataformas como G2 y Capterra. Aunque la IA analiza y cita estas fuentes, se recomienda usar los resultados como punto de partida y complementarlos con verificación manual."},
			{Q: "¿Se pueden exportar los informes de análisis?", A: "Sí. Una vez completado el análisis, puede exportar el informe completo en formato Markdown o PDF con un solo clic. El contenido incluye análisis detallados de las ocho dimensiones y tablas comparativas de competidores, que pueden pegarse directamente en Notion, Confluence u otras herramientas de documentación."},
			{Q: "¿Se guardarán los datos de mi producto y los competidores?", A: "No. La información que ingrese se utiliza únicamente para el análisis actual. Una vez completado, el servidor no conserva ningún contenido de entrada ni los resultados generados. Todos los datos existen solo durante la sesión del navegador y desaparecen al cerrar la página, garantizando total privacidad."},
		}
	default: // en
		return []FAQ{
			{Q: "How does the AI competitive analysis assistant work?", A: "Simply enter your product URL or a short description, and our system uses AI to search the web in real time. It then analyzes your competitors across eight dimensions: marketing strategies, product features, pricing models, target audience, customer sentiment, company info, SWOT analysis, and strategic recommendations — all delivered as a structured report, typically within 1 to 3 minutes."},
			{Q: "How many competitors can I analyze at once?", A: "You can analyze up to 5 competitors per session. Use the AI suggestion feature to automatically discover your top market rivals based on your product, or manually enter competitor URLs or names. We recommend starting with 2 to 3 core competitors to get the clearest, most actionable comparative insights before expanding your analysis."},
			{Q: "How accurate are the analysis results?", A: "The tool uses AI combined with live web search to pull the latest publicly available information about your competitors, including their official websites, pricing pages, product documentation, App Store reviews, and user feedback from platforms like G2 and Capterra. AI synthesizes and cites these sources, but since web data can lag, treat results as a solid starting point and validate key findings manually."},
			{Q: "Can I export the analysis report?", A: "Yes. Once the analysis is complete, you can export the full report to Markdown or PDF format with one click. The export includes all eight analysis dimensions and side-by-side comparison tables, ready to paste into Notion, Confluence, or any other documentation tool — or share directly with your team."},
			{Q: "Is my product information or competitor data stored anywhere?", A: "No. Your product description and competitor inputs are used only for the current analysis request. After the analysis completes, our server retains no input content or generated results. All data exists only during your browser session and disappears when you close the page, ensuring full privacy."},
		}
	}
}
