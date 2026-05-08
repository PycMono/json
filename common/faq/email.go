package faq

// EmailFAQs returns FAQs for temp email page using i18n keys
func EmailFAQs(t func(string) string) []FAQ {
	return []FAQ{
		{Q: t("email.faq.q1"), A: t("email.faq.a1")},
		{Q: t("email.faq.q2"), A: t("email.faq.a2")},
		{Q: t("email.faq.q3"), A: t("email.faq.a3")},
		{Q: t("email.faq.q4"), A: t("email.faq.a4")},
		{Q: t("email.faq.q5"), A: t("email.faq.a5")},
	}
}
