package faq

// TokenMgrFAQs returns FAQs for token management dashboard
func TokenMgrFAQs(t func(string) string) []FAQ {
	return []FAQ{
		{Q: t("token-mgr.faq.q1"), A: t("token-mgr.faq.a1")},
		{Q: t("token-mgr.faq.q2"), A: t("token-mgr.faq.a2")},
		{Q: t("token-mgr.faq.q3"), A: t("token-mgr.faq.a3")},
		{Q: t("token-mgr.faq.q4"), A: t("token-mgr.faq.a4")},
		{Q: t("token-mgr.faq.q5"), A: t("token-mgr.faq.a5")},
	}
}
