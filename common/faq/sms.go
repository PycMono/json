package faq

// SMSFAQs returns FAQs for SMS landing page using i18n keys
func SMSFAQs(t func(string) string) []FAQ {
	return []FAQ{
		{Q: t("sms.faq.q1"), A: t("sms.faq.a1")},
		{Q: t("sms.faq.q2"), A: t("sms.faq.a2")},
		{Q: t("sms.faq.q3"), A: t("sms.faq.a3")},
		{Q: t("sms.faq.q4"), A: t("sms.faq.a4")},
		{Q: t("sms.faq.q5"), A: t("sms.faq.a5")},
	}
}
