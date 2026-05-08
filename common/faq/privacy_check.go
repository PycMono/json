package faq

// PrivacyCheckFAQs returns FAQs for privacy check page using i18n keys
func PrivacyCheckFAQs(t func(string) string) []FAQ {
	return []FAQ{
		{Q: t("pc.faq.q1"), A: t("pc.faq.a1")},
		{Q: t("pc.faq.q2"), A: t("pc.faq.a2")},
		{Q: t("pc.faq.q3"), A: t("pc.faq.a3")},
		{Q: t("pc.faq.q4"), A: t("pc.faq.a4")},
		{Q: t("pc.faq.q5"), A: t("pc.faq.a5")},
		{Q: t("pc.faq.q6"), A: t("pc.faq.a6")},
		{Q: t("pc.faq.q7"), A: t("pc.faq.a7")},
		{Q: t("pc.faq.q8"), A: t("pc.faq.a8")},
	}
}
