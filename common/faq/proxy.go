package faq

// ProxyFAQs returns FAQs for proxy page using i18n keys
func ProxyFAQs(t func(string) string) []FAQ {
	return []FAQ{
		{Q: t("proxy.faq.q1"), A: t("proxy.faq.a1")},
		{Q: t("proxy.faq.q2"), A: t("proxy.faq.a2")},
		{Q: t("proxy.faq.q3"), A: t("proxy.faq.a3")},
		{Q: t("proxy.faq.q4"), A: t("proxy.faq.a4")},
		{Q: t("proxy.faq.q5"), A: t("proxy.faq.a5")},
	}
}
