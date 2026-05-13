package faq

// JSONDatasetsFAQs returns FAQs for JSON datasets page by language.
func JSONDatasetsFAQs(lang string) []FAQ {
	if lang == "zh" {
		return []FAQ{
			{Q: "这些 JSON 数据集可以免费用于商业项目吗？", A: "是的，所有数据集均采用开源授权，可免费用于个人和商业项目，无需注册或 API Key。"},
			{Q: "数据集多久更新一次？", A: "静态参考数据集（国家列表、HTTP 状态码等）几乎不会变动；动态类数据集每季度审核更新一次。"},
			{Q: "如何在代码中直接通过 URL 获取数据集？", A: "每个数据集都提供 Raw JSON URL（格式：ycjson.top/static/datasets/<slug>.json），可在 fetch/axios 中直接使用，已启用 CORS。"},
			{Q: "支持哪些下载格式？", A: "目前所有数据集均以标准 JSON 格式提供；CSV 和 YAML 导出格式即将支持。"},
			{Q: "我可以贡献自己的数据集吗？", A: "当然！请在 GitHub 提交 PR，附上数据来源、授权说明和字段文档，我们将在 48 小时内审核。"},
		}
	}
	if lang == "ja" {
		return []FAQ{
			{Q: "これらのJSONデータセットは商業プロジェクトで無料で使用できますか？", A: "はい、すべてのデータセットはオープンソースライセンスであり、個人および商業プロジェクトで無料で使用できます。登録やAPIキーは必要ありません。"},
			{Q: "データセットはどのくらいの頻度で更新されますか？", A: "静的参照データセット（国リスト、HTTPステータスコードなど）はほとんど変更されません。動的データセットは四半期ごとにレビューと更新が行われます。"},
			{Q: "コード内でURLを介してデータセットJSONを直接取得できますか？", A: "もちろんです。各データセットには ycjson.top/static/datasets/<slug>.json でRaw JSON URLがあります。CORSが有効になっているため、ブラウザおよびサーバーサイドのfetchで使用できます。"},
			{Q: "どのダウンロード形式がサポートされていますか？", A: "現在、すべてのデータセットは標準JSON形式で提供されています。CSVおよびYAMLエクスポート形式は近日公開予定です。"},
			{Q: "自分のデータセットを貢献できますか？", A: "はい！GitHubでPRを送信してください。データソース、ライセンス情報、フィールドドキュメントを添付してください。48時間以内にレビューします。"},
		}
	}
	if lang == "ko" {
		return []FAQ{
			{Q: "이 JSON 데이터셋을 상업 프로젝트에 무료로 사용할 수 있나요?", A: "네, 모든 데이터셋은 오픈소스 라이선스로 개인 및 상업 프로젝트에서 무료로 사용할 수 있습니다. 등록이나 API 키가 필요하지 않습니다."},
			{Q: "데이터셋은 얼마나 자주 업데이트되나요?", A: "정적 참조 데이터셋(국가 목록, HTTP 상태 코드 등)은 거의 변경되지 않습니다. 동적 데이터셋은 분기별로 검토 및 업데이트됩니다."},
			{Q: "코드에서 URL을 통해 데이터셋 JSON을 직접 가져올 수 있나요?", A: "물론입니다. 각 데이터셋은 ycjson.top/static/datasets/<slug>.json 에 Raw JSON URL을 가지고 있습니다. CORS가 활성화되어 있어 브라우저 및 서버사이드 fetch에서 사용할 수 있습니다."},
			{Q: "어떤 다운로드 형식이 지원되나요?", A: "현재 모든 데이터셋은 표준 JSON 형식으로 제공됩니다. CSV 및 YAML 내보내기 형식은 곧 지원될 예정입니다."},
			{Q: "내 데이터셋을 기여할 수 있나요?", A: "네! GitHub에서 PR을 제출하세요. 데이터 출처, 라이선스 정보, 필드 문서를 첨부해 주세요. 48시간 이내에 검토합니다."},
		}
	}
	if lang == "spa" {
		return []FAQ{
			{Q: "¿Estos conjuntos de datos JSON son gratuitos para uso comercial?", A: "Sí, todos los conjuntos de datos tienen licencia de código abierto y son gratuitos para proyectos personales y comerciales. No se requiere registro ni clave API."},
			{Q: "¿Con qué frecuencia se actualizan los conjuntos de datos?", A: "Los conjuntos de datos de referencia estática (países, códigos HTTP) rara vez cambian. Los conjuntos de datos dinámicos se revisan y actualizan trimestralmente."},
			{Q: "¿Puedo obtener el JSON del conjunto de datos directamente mediante URL en mi código?", A: "Absolutamente. Cada conjunto de datos tiene una URL JSON Raw en ycjson.top/static/datasets/<slug>.json. CORS está habilitado para fetch en navegador y servidor."},
			{Q: "¿Qué formatos de descarga están soportados?", A: "Actualmente todos los conjuntos de datos están disponibles como JSON estándar. Los formatos de exportación CSV y YAML estarán disponibles próximamente."},
			{Q: "¿Puedo contribuir con mi propio conjunto de datos?", A: "¡Sí! Envía un PR en GitHub con tu fuente de datos, información de licencia y documentación de campos. Revisamos las contribuciones en 48 horas."},
		}
	}
	return []FAQ{
		{Q: "Are these JSON datasets free for commercial use?", A: "Yes, all datasets are open-source licensed and free for personal and commercial use. No registration or API key required."},
		{Q: "How often are the datasets updated?", A: "Static reference datasets (countries, HTTP codes) rarely change. Dynamic datasets are reviewed and updated quarterly."},
		{Q: "Can I fetch dataset JSON directly via URL in my code?", A: "Absolutely. Each dataset has a Raw JSON URL at ycjson.top/static/datasets/<slug>.json. CORS is enabled for browser and server-side fetch."},
		{Q: "What download formats are supported?", A: "All datasets are currently available as standard JSON. CSV and YAML export formats are coming soon."},
		{Q: "Can I contribute my own dataset?", A: "Yes! Submit a PR on GitHub with your data source, license info, and field documentation. We review contributions within 48 hours."},
	}
}
