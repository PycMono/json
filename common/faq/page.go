package faq

// PageFAQs returns FAQs for various pages using i18n keys
// This covers: home, browser-fingerprint, virtual-address

// HomeFAQs returns FAQs for the homepage
func HomeFAQs(t func(string) string) []FAQ {
	return []FAQ{
		{Q: t("home.faq.q1"), A: t("home.faq.a1")},
		{Q: t("home.faq.q2"), A: t("home.faq.a2")},
		{Q: t("home.faq.q3"), A: t("home.faq.a3")},
		{Q: t("home.faq.q4"), A: t("home.faq.a4")},
		{Q: t("home.faq.q5"), A: t("home.faq.a5")},
		{Q: t("home.faq.q6"), A: t("home.faq.a6")},
		{Q: t("home.faq.q7"), A: t("home.faq.a7")},
		{Q: t("home.faq.q8"), A: t("home.faq.a8")},
		{Q: t("home.faq.q9"), A: t("home.faq.a9")},
		{Q: t("home.faq.q10"), A: t("home.faq.a10")},
	}
}

// BrowserFingerprintFAQs returns FAQs for browser fingerprint detector
func BrowserFingerprintFAQs(t func(string) string) []FAQ {
	return []FAQ{
		{Q: t("fingerprint.faq.q1"), A: t("fingerprint.faq.a1")},
		{Q: t("fingerprint.faq.q2"), A: t("fingerprint.faq.a2")},
		{Q: t("fingerprint.faq.q3"), A: t("fingerprint.faq.a3")},
		{Q: t("fingerprint.faq.q4"), A: t("fingerprint.faq.a4")},
		{Q: t("fingerprint.faq.q5"), A: t("fingerprint.faq.a5")},
	}
}

// VirtualAddressFAQs returns FAQs for virtual address generator
func VirtualAddressFAQs(t func(string) string) []FAQ {
	return []FAQ{
		{Q: t("address.faq.q1"), A: t("address.faq.a1")},
		{Q: t("address.faq.q2"), A: t("address.faq.a2")},
		{Q: t("address.faq.q3"), A: t("address.faq.a3")},
		{Q: t("address.faq.q4"), A: t("address.faq.a4")},
		{Q: t("address.faq.q5"), A: t("address.faq.a5")},
	}
}
