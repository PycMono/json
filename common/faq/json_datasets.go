package faq

// JSONDatasetsFAQs returns FAQs for JSON datasets page by language.
func JSONDatasetsFAQs(lang string) []FAQ {
	if lang == "zh" {
		return []FAQ{
			{Q: "这些 JSON 数据集可以免费用于商业项目吗？", A: "是的，所有数据集均采用开源授权，可免费用于个人和商业项目，无需注册或 API Key。"},
			{Q: "数据集多久更新一次？", A: "静态参考数据集（国家列表、HTTP 状态码等）几乎不会变动；动态类数据集每季度审核更新一次。"},
			{Q: "如何在代码中直接通过 URL 获取数据集？", A: "每个数据集都提供 Raw JSON URL（格式：toolboxnova.com/static/datasets/<slug>.json），可在 fetch/axios 中直接使用，已启用 CORS。"},
			{Q: "支持哪些下载格式？", A: "目前所有数据集均以标准 JSON 格式提供；CSV 和 YAML 导出格式即将支持。"},
			{Q: "我可以贡献自己的数据集吗？", A: "当然！请在 GitHub 提交 PR，附上数据来源、授权说明和字段文档，我们将在 48 小时内审核。"},
		}
	}
	return []FAQ{
		{Q: "Are these JSON datasets free for commercial use?", A: "Yes, all datasets are open-source licensed and free for personal and commercial use. No registration or API key required."},
		{Q: "How often are the datasets updated?", A: "Static reference datasets (countries, HTTP codes) rarely change. Dynamic datasets are reviewed and updated quarterly."},
		{Q: "Can I fetch dataset JSON directly via URL in my code?", A: "Absolutely. Each dataset has a Raw JSON URL at toolboxnova.com/static/datasets/<slug>.json. CORS is enabled for browser and server-side fetch."},
		{Q: "What download formats are supported?", A: "All datasets are currently available as standard JSON. CSV and YAML export formats are coming soon."},
		{Q: "Can I contribute my own dataset?", A: "Yes! Submit a PR on GitHub with your data source, license info, and field documentation. We review contributions within 48 hours."},
	}
}
