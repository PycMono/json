package faq

// WeatherFAQs returns FAQs for weather query page using i18n keys
func WeatherFAQs(t func(string) string) []FAQ {
	return []FAQ{
		{Q: t("wq.faq.q1"), A: t("wq.faq.a1")},
		{Q: t("wq.faq.q2"), A: t("wq.faq.a2")},
		{Q: t("wq.faq.q3"), A: t("wq.faq.a3")},
		{Q: t("wq.faq.q4"), A: t("wq.faq.a4")},
		{Q: t("wq.faq.q5"), A: t("wq.faq.a5")},
		{Q: t("wq.faq.q6"), A: t("wq.faq.a6")},
		{Q: t("wq.faq.q7"), A: t("wq.faq.a7")},
		{Q: t("wq.faq.q8"), A: t("wq.faq.a8")},
		{Q: t("wq.faq.q9"), A: t("wq.faq.a9")},
		{Q: t("wq.faq.q10"), A: t("wq.faq.a10")},
	}
}
