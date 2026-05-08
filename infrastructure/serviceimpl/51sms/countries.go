package _1sms

import "strings"

// countryISO2 maps 5SIM country name → ISO 3166-1 alpha-2
var countryISO2 = map[string]string{
	"afghanistan": "AF", "albania": "AL", "algeria": "DZ", "angola": "AO",
	"antiguaandbarbuda": "AG", "argentina": "AR", "armenia": "AM", "aruba": "AW",
	"australia": "AU", "austria": "AT", "azerbaijan": "AZ",
	"bahamas": "BS", "bahrain": "BH", "bangladesh": "BD", "barbados": "BB",
	"belarus": "BY", "belgium": "BE", "belize": "BZ", "benin": "BJ",
	"bhutane": "BT", "bih": "BA", "bolivia": "BO", "botswana": "BW",
	"brazil": "BR", "bulgaria": "BG", "burkinafaso": "BF", "burundi": "BI",
	"cambodia": "KH", "cameroon": "CM", "canada": "CA", "capeverde": "CV",
	"chad": "TD", "chile": "CL", "china": "CN", "colombia": "CO",
	"comoros": "KM", "congo": "CG", "costarica": "CR", "croatia": "HR",
	"cyprus": "CY", "czech": "CZ",
	"denmark": "DK", "djibouti": "DJ", "dominicana": "DO",
	"easttimor": "TL", "ecuador": "EC", "egypt": "EG", "england": "GB",
	"equatorialguinea": "GQ", "estonia": "EE", "ethiopia": "ET",
	"finland": "FI", "france": "FR", "frenchguiana": "GF",
	"gabon": "GA", "gambia": "GM", "georgia": "GE", "germany": "DE",
	"ghana": "GH", "greece": "GR", "guadeloupe": "GP", "guatemala": "GT",
	"guinea": "GN", "guineabissau": "GW", "guyana": "GY",
	"haiti": "HT", "honduras": "HN", "hongkong": "HK", "hungary": "HU",
	"india": "IN", "indonesia": "ID", "iran": "IR", "iraq": "IQ",
	"ireland": "IE", "israel": "IL", "italy": "IT", "ivorycoast": "CI",
	"jamaica": "JM", "japan": "JP", "jordan": "JO",
	"kazakhstan": "KZ", "kenya": "KE", "kuwait": "KW", "kyrgyzstan": "KG",
	"laos": "LA", "latvia": "LV", "lesotho": "LS", "liberia": "LR",
	"lithuania": "LT", "luxembourg": "LU",
	"macau": "MO", "madagascar": "MG", "malawi": "MW", "malaysia": "MY",
	"maldives": "MV", "mauritania": "MR", "mauritius": "MU", "mexico": "MX",
	"moldova": "MD", "mongolia": "MN", "montenegro": "ME", "morocco": "MA",
	"mozambique": "MZ", "myanmar": "MM",
	"namibia": "NA", "nepal": "NP", "netherlands": "NL", "newcaledonia": "NC",
	"nicaragua": "NI", "niger": "NE", "nigeria": "NG", "northmacedonia": "MK",
	"norway":   "NO",
	"oman":     "OM",
	"pakistan": "PK", "panama": "PA", "papuanewguinea": "PG", "paraguay": "PY",
	"peru": "PE", "philippines": "PH", "poland": "PL", "portugal": "PT",
	"puertorico": "PR",
	"reunion":    "RE", "romania": "RO", "russia": "RU", "rwanda": "RW",
	"saintkittsandnevis": "KN", "saintlucia": "LC",
	"saintvincentandgrenadines": "VC", "salvador": "SV", "samoa": "WS",
	"saudiarabia": "SA", "senegal": "SN", "serbia": "RS", "seychelles": "SC",
	"sierraleone": "SL", "singapore": "SG", "slovakia": "SK", "slovenia": "SI",
	"solomonislands": "SB", "southafrica": "ZA", "southkorea": "KR",
	"spain": "ES", "srilanka": "LK", "suriname": "SR", "swaziland": "SZ",
	"sweden": "SE",
	"taiwan": "TW", "tajikistan": "TJ", "tanzania": "TZ", "thailand": "TH",
	"togo": "TG", "tunisia": "TN", "turkey": "TR", "turkmenistan": "TM",
	"uganda": "UG", "uk": "GB", "ukraine": "UA", "unitedkingdom": "GB",
	"uruguay": "UY", "usa": "US", "uzbekistan": "UZ",
	"venezuela": "VE", "vietnam": "VN",
	"zambia": "ZM", "zimbabwe": "ZW",
}

// countryDisplayNames maps 5SIM name → human-readable display name
var countryDisplayNames = map[string]string{
	"afghanistan": "Afghanistan", "albania": "Albania", "algeria": "Algeria",
	"angola": "Angola", "antiguaandbarbuda": "Antigua & Barbuda",
	"argentina": "Argentina", "armenia": "Armenia", "aruba": "Aruba",
	"australia": "Australia", "austria": "Austria", "azerbaijan": "Azerbaijan",
	"bahamas": "Bahamas", "bahrain": "Bahrain", "bangladesh": "Bangladesh",
	"barbados": "Barbados", "belarus": "Belarus", "belgium": "Belgium",
	"belize": "Belize", "benin": "Benin", "bhutane": "Bhutan",
	"bih": "Bosnia & Herzegovina", "bolivia": "Bolivia", "botswana": "Botswana",
	"brazil": "Brazil", "bulgaria": "Bulgaria", "burkinafaso": "Burkina Faso",
	"burundi": "Burundi", "cambodia": "Cambodia", "cameroon": "Cameroon",
	"canada": "Canada", "capeverde": "Cape Verde", "chad": "Chad",
	"chile": "Chile", "china": "China", "colombia": "Colombia",
	"comoros": "Comoros", "congo": "Congo", "costarica": "Costa Rica",
	"croatia": "Croatia", "cyprus": "Cyprus", "czech": "Czech Republic",
	"denmark": "Denmark", "djibouti": "Djibouti", "dominicana": "Dominican Republic",
	"easttimor": "East Timor", "ecuador": "Ecuador", "egypt": "Egypt",
	"england": "United Kingdom", "equatorialguinea": "Equatorial Guinea",
	"estonia": "Estonia", "ethiopia": "Ethiopia", "finland": "Finland",
	"france": "France", "frenchguiana": "French Guiana", "gabon": "Gabon",
	"gambia": "Gambia", "georgia": "Georgia", "germany": "Germany",
	"ghana": "Ghana", "greece": "Greece", "guadeloupe": "Guadeloupe",
	"guatemala": "Guatemala", "guinea": "Guinea", "guineabissau": "Guinea-Bissau",
	"guyana": "Guyana", "haiti": "Haiti", "honduras": "Honduras",
	"hongkong": "Hong Kong", "hungary": "Hungary", "india": "India",
	"indonesia": "Indonesia", "iran": "Iran", "iraq": "Iraq",
	"ireland": "Ireland", "israel": "Israel", "italy": "Italy",
	"ivorycoast": "Ivory Coast", "jamaica": "Jamaica", "japan": "Japan",
	"jordan": "Jordan", "kazakhstan": "Kazakhstan", "kenya": "Kenya",
	"kuwait": "Kuwait", "kyrgyzstan": "Kyrgyzstan", "laos": "Laos",
	"latvia": "Latvia", "lesotho": "Lesotho", "liberia": "Liberia",
	"lithuania": "Lithuania", "luxembourg": "Luxembourg", "macau": "Macau",
	"madagascar": "Madagascar", "malawi": "Malawi", "malaysia": "Malaysia",
	"maldives": "Maldives", "mauritania": "Mauritania", "mauritius": "Mauritius",
	"mexico": "Mexico", "moldova": "Moldova", "mongolia": "Mongolia",
	"montenegro": "Montenegro", "morocco": "Morocco", "mozambique": "Mozambique",
	"myanmar": "Myanmar", "namibia": "Namibia", "nepal": "Nepal",
	"netherlands": "Netherlands", "newcaledonia": "New Caledonia",
	"nicaragua": "Nicaragua", "niger": "Niger", "nigeria": "Nigeria",
	"northmacedonia": "North Macedonia", "norway": "Norway", "oman": "Oman",
	"pakistan": "Pakistan", "panama": "Panama", "papuanewguinea": "Papua New Guinea",
	"paraguay": "Paraguay", "peru": "Peru", "philippines": "Philippines",
	"poland": "Poland", "portugal": "Portugal", "puertorico": "Puerto Rico",
	"reunion": "Réunion", "romania": "Romania", "russia": "Russia",
	"rwanda": "Rwanda", "saintkittsandnevis": "Saint Kitts & Nevis",
	"saintlucia":                "Saint Lucia",
	"saintvincentandgrenadines": "Saint Vincent & Grenadines",
	"salvador":                  "El Salvador", "samoa": "Samoa", "saudiarabia": "Saudi Arabia",
	"senegal": "Senegal", "serbia": "Serbia", "seychelles": "Seychelles",
	"sierraleone": "Sierra Leone", "singapore": "Singapore", "slovakia": "Slovakia",
	"slovenia": "Slovenia", "solomonislands": "Solomon Islands",
	"southafrica": "South Africa", "southkorea": "South Korea", "spain": "Spain",
	"srilanka": "Sri Lanka", "suriname": "Suriname", "swaziland": "Eswatini",
	"sweden": "Sweden", "taiwan": "Taiwan", "tajikistan": "Tajikistan",
	"tanzania": "Tanzania", "thailand": "Thailand", "togo": "Togo",
	"tunisia": "Tunisia", "turkey": "Turkey", "turkmenistan": "Turkmenistan",
	"uganda": "Uganda", "uk": "United Kingdom", "ukraine": "Ukraine",
	"unitedkingdom": "United Kingdom", "uruguay": "Uruguay", "usa": "United States",
	"uzbekistan": "Uzbekistan", "venezuela": "Venezuela", "vietnam": "Vietnam",
	"zambia": "Zambia", "zimbabwe": "Zimbabwe",
}

// IsoToFlag converts ISO 3166-1 alpha-2 code to emoji flag
func IsoToFlag(iso string) string {
	iso = strings.ToUpper(iso)
	if len(iso) != 2 {
		return "🌍"
	}
	r1 := rune(0x1F1E6 + int(iso[0]-'A'))
	r2 := rune(0x1F1E6 + int(iso[1]-'A'))
	return string([]rune{r1, r2})
}

// CountryISO2 returns ISO-2 code for a 5SIM country key.
func CountryISO2(name string) string {
	if iso, ok := countryISO2[strings.ToLower(name)]; ok {
		return iso
	}
	return "XX"
}

// CountryFlag returns emoji flag for a 5SIM country name
func CountryFlag(name string) string {
	key := strings.ToLower(name)
	if iso, ok := countryISO2[key]; ok {
		return IsoToFlag(iso)
	}
	return "🌍"
}

// CountryDisplayName returns the human-readable name for a 5SIM country key
func CountryDisplayName(name string) string {
	key := strings.ToLower(name)
	if d, ok := countryDisplayNames[key]; ok {
		return d
	}
	words := strings.Fields(strings.ReplaceAll(name, "_", " "))
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}
	return strings.Join(words, " ")
}

// CountryISO2Map returns the full ISO2 map (read-only copy for external use)
func CountryISO2Map() map[string]string {
	return countryISO2
}

// CountryDisplayNamesMap returns the full display names map (read-only copy)
func CountryDisplayNamesMap() map[string]string {
	return countryDisplayNames
}
