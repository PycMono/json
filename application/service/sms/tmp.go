package sms

import "strings"

// displayNames 已知产品名称到显示名称的映射
var displayNames = map[string]string{
	"whatsapp":  "WhatsApp",
	"telegram":  "Telegram",
	"google":    "Google",
	"facebook":  "Facebook",
	"instagram": "Instagram",
	"twitter":   "Twitter/X",
	"tiktok":    "TikTok",
	"wechat":    "WeChat",
	"amazon":    "Amazon",
	"microsoft": "Microsoft",
	"apple":     "Apple",
	"uber":      "Uber",
	"netflix":   "Netflix",
	"discord":   "Discord",
	"snapchat":  "Snapchat",
	"paypal":    "PayPal",
	"airbnb":    "Airbnb",
	"ebay":      "eBay",
}

// ToDisplayName 服务名转显示名称
func ToDisplayName(name string) string {
	if d, ok := displayNames[name]; ok {
		return d
	}
	// 将下划线替换为空格，首字母大写
	words := strings.Fields(strings.ReplaceAll(name, "_", " "))
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}
	return strings.Join(words, " ")
}

// countryISO2 maps 5SIM country names → ISO 3166-1 alpha-2 code
var countryISO2 = map[string]string{
	// A
	"afghanistan":       "AF",
	"albania":           "AL",
	"algeria":           "DZ",
	"angola":            "AO",
	"antiguaandbarbuda": "AG",
	"argentina":         "AR",
	"armenia":           "AM",
	"aruba":             "AW",
	"australia":         "AU",
	"austria":           "AT",
	"azerbaijan":        "AZ",
	// B
	"bahamas":     "BS",
	"bahrain":     "BH",
	"bangladesh":  "BD",
	"barbados":    "BB",
	"belarus":     "BY",
	"belgium":     "BE",
	"belize":      "BZ",
	"benin":       "BJ",
	"bhutane":     "BT",
	"bih":         "BA",
	"bolivia":     "BO",
	"botswana":    "BW",
	"brazil":      "BR",
	"bulgaria":    "BG",
	"burkinafaso": "BF",
	"burundi":     "BI",
	// C
	"cambodia":  "KH",
	"cameroon":  "CM",
	"canada":    "CA",
	"capeverde": "CV",
	"chad":      "TD",
	"chile":     "CL",
	"china":     "CN",
	"colombia":  "CO",
	"comoros":   "KM",
	"congo":     "CG",
	"costarica": "CR",
	"croatia":   "HR",
	"cyprus":    "CY",
	"czech":     "CZ",
	// D
	"denmark":    "DK",
	"djibouti":   "DJ",
	"dominicana": "DO",
	// E
	"easttimor":        "TL",
	"ecuador":          "EC",
	"egypt":            "EG",
	"england":          "GB",
	"equatorialguinea": "GQ",
	"estonia":          "EE",
	"ethiopia":         "ET",
	// F
	"finland":      "FI",
	"france":       "FR",
	"frenchguiana": "GF",
	// G
	"gabon":        "GA",
	"gambia":       "GM",
	"georgia":      "GE",
	"germany":      "DE",
	"ghana":        "GH",
	"greece":       "GR",
	"guadeloupe":   "GP",
	"guatemala":    "GT",
	"guinea":       "GN",
	"guineabissau": "GW",
	"guyana":       "GY",
	// H
	"haiti":    "HT",
	"honduras": "HN",
	"hongkong": "HK",
	"hungary":  "HU",
	// I
	"india":      "IN",
	"indonesia":  "ID",
	"iran":       "IR",
	"iraq":       "IQ",
	"ireland":    "IE",
	"israel":     "IL",
	"italy":      "IT",
	"ivorycoast": "CI",
	// J
	"jamaica": "JM",
	"japan":   "JP",
	"jordan":  "JO",
	// K
	"kazakhstan": "KZ",
	"kenya":      "KE",
	"kuwait":     "KW",
	"kyrgyzstan": "KG",
	// L
	"laos":       "LA",
	"latvia":     "LV",
	"lesotho":    "LS",
	"liberia":    "LR",
	"lithuania":  "LT",
	"luxembourg": "LU",
	// M
	"macau":      "MO",
	"madagascar": "MG",
	"malawi":     "MW",
	"malaysia":   "MY",
	"maldives":   "MV",
	"mauritania": "MR",
	"mauritius":  "MU",
	"mexico":     "MX",
	"moldova":    "MD",
	"mongolia":   "MN",
	"montenegro": "ME",
	"morocco":    "MA",
	"mozambique": "MZ",
	"myanmar":    "MM",
	// N
	"namibia":        "NA",
	"nepal":          "NP",
	"netherlands":    "NL",
	"newcaledonia":   "NC",
	"nicaragua":      "NI",
	"niger":          "NE",
	"nigeria":        "NG",
	"northmacedonia": "MK",
	"norway":         "NO",
	// O
	"oman": "OM",
	// P
	"pakistan":       "PK",
	"panama":         "PA",
	"papuanewguinea": "PG",
	"paraguay":       "PY",
	"peru":           "PE",
	"philippines":    "PH",
	"poland":         "PL",
	"portugal":       "PT",
	"puertorico":     "PR",
	// R
	"reunion": "RE",
	"romania": "RO",
	"russia":  "RU",
	"rwanda":  "RW",
	// S
	"saintkittsandnevis":        "KN",
	"saintlucia":                "LC",
	"saintvincentandgrenadines": "VC",
	"salvador":                  "SV",
	"samoa":                     "WS",
	"saudiarabia":               "SA",
	"senegal":                   "SN",
	"serbia":                    "RS",
	"seychelles":                "SC",
	"sierraleone":               "SL",
	"singapore":                 "SG",
	"slovakia":                  "SK",
	"slovenia":                  "SI",
	"solomonislands":            "SB",
	"southafrica":               "ZA",
	"southkorea":                "KR",
	"spain":                     "ES",
	"srilanka":                  "LK",
	"suriname":                  "SR",
	"swaziland":                 "SZ",
	"sweden":                    "SE",
	// T
	"taiwan":       "TW",
	"tajikistan":   "TJ",
	"tanzania":     "TZ",
	"thailand":     "TH",
	"togo":         "TG",
	"tunisia":      "TN",
	"turkey":       "TR",
	"turkmenistan": "TM",
	// U
	"uganda":        "UG",
	"uk":            "GB",
	"ukraine":       "UA",
	"unitedkingdom": "GB",
	"uruguay":       "UY",
	"usa":           "US",
	"uzbekistan":    "UZ",
	// V
	"venezuela": "VE",
	"vietnam":   "VN",
	// Z
	"zambia":   "ZM",
	"zimbabwe": "ZW",
}

// countryDisplayNames 5SIM country name → human-readable display name
var countryDisplayNames = map[string]string{
	"afghanistan":               "Afghanistan",
	"albania":                   "Albania",
	"algeria":                   "Algeria",
	"angola":                    "Angola",
	"antiguaandbarbuda":         "Antigua & Barbuda",
	"argentina":                 "Argentina",
	"armenia":                   "Armenia",
	"aruba":                     "Aruba",
	"australia":                 "Australia",
	"austria":                   "Austria",
	"azerbaijan":                "Azerbaijan",
	"bahamas":                   "Bahamas",
	"bahrain":                   "Bahrain",
	"bangladesh":                "Bangladesh",
	"barbados":                  "Barbados",
	"belarus":                   "Belarus",
	"belgium":                   "Belgium",
	"belize":                    "Belize",
	"benin":                     "Benin",
	"bhutane":                   "Bhutan",
	"bih":                       "Bosnia & Herzegovina",
	"bolivia":                   "Bolivia",
	"botswana":                  "Botswana",
	"brazil":                    "Brazil",
	"bulgaria":                  "Bulgaria",
	"burkinafaso":               "Burkina Faso",
	"burundi":                   "Burundi",
	"cambodia":                  "Cambodia",
	"cameroon":                  "Cameroon",
	"canada":                    "Canada",
	"capeverde":                 "Cape Verde",
	"chad":                      "Chad",
	"chile":                     "Chile",
	"china":                     "China",
	"colombia":                  "Colombia",
	"comoros":                   "Comoros",
	"congo":                     "Congo",
	"costarica":                 "Costa Rica",
	"croatia":                   "Croatia",
	"cyprus":                    "Cyprus",
	"czech":                     "Czech Republic",
	"denmark":                   "Denmark",
	"djibouti":                  "Djibouti",
	"dominicana":                "Dominican Republic",
	"easttimor":                 "East Timor",
	"ecuador":                   "Ecuador",
	"egypt":                     "Egypt",
	"england":                   "United Kingdom",
	"equatorialguinea":          "Equatorial Guinea",
	"estonia":                   "Estonia",
	"ethiopia":                  "Ethiopia",
	"finland":                   "Finland",
	"france":                    "France",
	"frenchguiana":              "French Guiana",
	"gabon":                     "Gabon",
	"gambia":                    "Gambia",
	"georgia":                   "Georgia",
	"germany":                   "Germany",
	"ghana":                     "Ghana",
	"greece":                    "Greece",
	"guadeloupe":                "Guadeloupe",
	"guatemala":                 "Guatemala",
	"guinea":                    "Guinea",
	"guineabissau":              "Guinea-Bissau",
	"guyana":                    "Guyana",
	"haiti":                     "Haiti",
	"honduras":                  "Honduras",
	"hongkong":                  "Hong Kong",
	"hungary":                   "Hungary",
	"india":                     "India",
	"indonesia":                 "Indonesia",
	"iran":                      "Iran",
	"iraq":                      "Iraq",
	"ireland":                   "Ireland",
	"israel":                    "Israel",
	"italy":                     "Italy",
	"ivorycoast":                "Ivory Coast",
	"jamaica":                   "Jamaica",
	"japan":                     "Japan",
	"jordan":                    "Jordan",
	"kazakhstan":                "Kazakhstan",
	"kenya":                     "Kenya",
	"kuwait":                    "Kuwait",
	"kyrgyzstan":                "Kyrgyzstan",
	"laos":                      "Laos",
	"latvia":                    "Latvia",
	"lesotho":                   "Lesotho",
	"liberia":                   "Liberia",
	"lithuania":                 "Lithuania",
	"luxembourg":                "Luxembourg",
	"macau":                     "Macau",
	"madagascar":                "Madagascar",
	"malawi":                    "Malawi",
	"malaysia":                  "Malaysia",
	"maldives":                  "Maldives",
	"mauritania":                "Mauritania",
	"mauritius":                 "Mauritius",
	"mexico":                    "Mexico",
	"moldova":                   "Moldova",
	"mongolia":                  "Mongolia",
	"montenegro":                "Montenegro",
	"morocco":                   "Morocco",
	"mozambique":                "Mozambique",
	"myanmar":                   "Myanmar",
	"namibia":                   "Namibia",
	"nepal":                     "Nepal",
	"netherlands":               "Netherlands",
	"newcaledonia":              "New Caledonia",
	"nicaragua":                 "Nicaragua",
	"niger":                     "Niger",
	"nigeria":                   "Nigeria",
	"northmacedonia":            "North Macedonia",
	"norway":                    "Norway",
	"oman":                      "Oman",
	"pakistan":                  "Pakistan",
	"panama":                    "Panama",
	"papuanewguinea":            "Papua New Guinea",
	"paraguay":                  "Paraguay",
	"peru":                      "Peru",
	"philippines":               "Philippines",
	"poland":                    "Poland",
	"portugal":                  "Portugal",
	"puertorico":                "Puerto Rico",
	"reunion":                   "Réunion",
	"romania":                   "Romania",
	"russia":                    "Russia",
	"rwanda":                    "Rwanda",
	"saintkittsandnevis":        "Saint Kitts & Nevis",
	"saintlucia":                "Saint Lucia",
	"saintvincentandgrenadines": "Saint Vincent & Grenadines",
	"salvador":                  "El Salvador",
	"samoa":                     "Samoa",
	"saudiarabia":               "Saudi Arabia",
	"senegal":                   "Senegal",
	"serbia":                    "Serbia",
	"seychelles":                "Seychelles",
	"sierraleone":               "Sierra Leone",
	"singapore":                 "Singapore",
	"slovakia":                  "Slovakia",
	"slovenia":                  "Slovenia",
	"solomonislands":            "Solomon Islands",
	"southafrica":               "South Africa",
	"southkorea":                "South Korea",
	"spain":                     "Spain",
	"srilanka":                  "Sri Lanka",
	"suriname":                  "Suriname",
	"swaziland":                 "Eswatini",
	"sweden":                    "Sweden",
	"taiwan":                    "Taiwan",
	"tajikistan":                "Tajikistan",
	"tanzania":                  "Tanzania",
	"thailand":                  "Thailand",
	"tit":                       "Tit",
	"togo":                      "Togo",
	"tunisia":                   "Tunisia",
	"turkey":                    "Turkey",
	"turkmenistan":              "Turkmenistan",
	"uganda":                    "Uganda",
	"uk":                        "United Kingdom",
	"ukraine":                   "Ukraine",
	"unitedkingdom":             "United Kingdom",
	"uruguay":                   "Uruguay",
	"usa":                       "United States",
	"uzbekistan":                "Uzbekistan",
	"venezuela":                 "Venezuela",
	"vietnam":                   "Vietnam",
	"zambia":                    "Zambia",
	"zimbabwe":                  "Zimbabwe",
}

// ToCountryDisplayName 国家代码转显示名称
func ToCountryDisplayName(name string) string {
	key := strings.ToLower(name)
	if d, ok := countryDisplayNames[key]; ok {
		return d
	}
	// Fallback: capitalize first letter of each word
	words := strings.Fields(strings.ReplaceAll(name, "_", " "))
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}
	return strings.Join(words, " ")
}

// isoToFlag 将 ISO 3166-1 alpha-2 代码转为 emoji 旗帜
func isoToFlag(iso string) string {
	iso = strings.ToUpper(iso)
	if len(iso) != 2 {
		return "🌍"
	}
	r1 := rune(0x1F1E6 + int(iso[0]-'A'))
	r2 := rune(0x1F1E6 + int(iso[1]-'A'))
	return string([]rune{r1, r2})
}

// CountryFlag 获取国家 emoji 旗帜（通过 ISO 2 码生成）
func CountryFlag(name string) string {
	key := strings.ToLower(name)
	if iso, ok := countryISO2[key]; ok {
		return isoToFlag(iso)
	}
	return "🌍"
}
