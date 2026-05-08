package faq

// DevFAQs returns FAQs for developer tools by language and tool name.
// Supported tools: hash, base64, url_encode, ip, whois, word_counter, uuid, lorem, user_agent
func DevFAQs(lang, tool string) []FAQ {
	faqs := map[string]map[string][]FAQ{
		"en": {
			"hash": {
				{Q: "What is the difference between MD5 and SHA-256?", A: "MD5 produces a 128-bit hash and is considered cryptographically broken. SHA-256 produces a 256-bit hash and is part of the SHA-2 family, still considered secure for most use cases."},
				{Q: "Can I reverse a hash to get the original text?", A: "No. Hash functions are one-way by design. You cannot mathematically reverse a hash, though weak hashes like MD5 can sometimes be cracked via rainbow tables."},
				{Q: "Is it safe to hash passwords with MD5?", A: "No. MD5 is not suitable for password hashing due to speed and vulnerability to rainbow table attacks. Use bcrypt, scrypt, or Argon2 instead."},
				{Q: "What is HMAC and when should I use it?", A: "HMAC (Hash-based Message Authentication Code) combines a hash function with a secret key to verify both data integrity and authenticity. Use it for API signatures and webhook verification."},
				{Q: "Why does the same text produce different SHA results?", A: "Different SHA algorithms (SHA-1, SHA-256, SHA-512) use different internal structures and produce different output lengths, which is why results differ even for the same input."},
			},
			"base64": {
				{Q: "What is Base64 encoding?", A: "Base64 is a binary-to-text encoding scheme that represents binary data using only 64 ASCII characters. It is commonly used to embed images in HTML, send email attachments, and store binary data in JSON."},
				{Q: "What is the difference between Base64 and Base64URL?", A: "Standard Base64 uses '+' and '/' characters which must be percent-encoded in URLs. Base64URL replaces them with '-' and '_', making it safe for use in URLs and filenames without extra encoding."},
				{Q: "Does Base64 increase file size?", A: "Yes, Base64 encoding increases data size by approximately 33% because every 3 bytes of binary data are represented as 4 ASCII characters."},
				{Q: "Is Base64 a form of encryption?", A: "No. Base64 is an encoding scheme, not encryption. It does not protect your data. Anyone can decode a Base64 string without a key."},
				{Q: "Can I encode an image to Base64 with this tool?", A: "Yes. Use the file upload area to select any image or binary file up to 50MB. The tool will encode it entirely in your browser without uploading to any server."},
			},
			"url_encode": {
				{Q: "What is URL encoding?", A: "URL encoding (percent-encoding) converts characters that are not allowed in URLs into a '%XX' format where XX is the hexadecimal code. For example, a space becomes %20."},
				{Q: "What is the difference between encodeURI and encodeURIComponent?", A: "encodeURI encodes a full URL and leaves characters like '/', '?', '&' intact. encodeURIComponent encodes a URL component (like a query value) and converts those characters too."},
				{Q: "Why does my URL have %20 instead of +?", A: "%20 is the RFC 3986 standard for spaces in URLs. The '+' sign is only valid for encoding spaces in HTML form data (application/x-www-form-urlencoded), not in general URL paths."},
				{Q: "Can I decode multiple URLs at once?", A: "Yes. Paste multiple URLs separated by newlines into the input area and enable batch mode. Each line will be encoded or decoded independently."},
				{Q: "Why are some characters not encoded?", A: "RFC 3986 defines a set of 'unreserved characters' (A-Z, a-z, 0-9, -, _, ., ~) that are safe in URLs and do not need encoding. Our tool follows this standard."},
			},
			"ip": {
				{Q: "What is my public IP address?", A: "Your public IP is the address your Internet Service Provider assigns to your network. It is used to identify your device on the internet and differs from your private (local) IP."},
				{Q: "What is IPv4 vs IPv6?", A: "IPv4 uses 32-bit addresses (e.g., 192.168.1.1) supporting ~4.3 billion addresses. IPv6 uses 128-bit addresses (e.g., 2001:db8::1) supporting virtually unlimited addresses to solve the IPv4 exhaustion problem."},
				{Q: "Can someone find my location from my IP address?", A: "Only approximately. IP geolocation can usually identify your country and city-level area, but not your exact street address. VPNs and proxies can mask your real IP."},
				{Q: "What is an ASN?", A: "An Autonomous System Number (ASN) is a unique identifier assigned to a network of IP addresses operated by an ISP or large organization for routing internet traffic."},
				{Q: "Why does my IP geolocation show the wrong city?", A: "IP databases are not always accurate. They rely on registration data from ISPs, which may not reflect the actual physical location of the end user, especially for mobile or VPN users."},
			},
			"whois": {
				{Q: "What is a Whois lookup?", A: "Whois is a protocol that queries databases storing information about registered domain names, including owner, registrar, registration date, and expiry date."},
				{Q: "Is Whois information always accurate?", A: "Not necessarily. Domain owners can use privacy protection services to mask their personal contact information, showing registrar proxy details instead."},
				{Q: "What is RDAP?", A: "RDAP (Registration Data Access Protocol) is the modern replacement for Whois. It returns structured JSON data instead of plain text and supports better authentication and access control."},
				{Q: "Can I look up IP address ownership with Whois?", A: "Yes. You can enter an IP address to query ARIN, RIPE, APNIC, or other regional internet registries for ownership and network allocation data."},
				{Q: "Why is some Whois data redacted?", A: "GDPR and other privacy regulations have led registrars to redact personal data like owner names and email addresses. You may need to contact the registrar for ownership disputes."},
			},
			"word_counter": {
				{Q: "How is reading time calculated?", A: "Reading time is estimated at 238 words per minute for English text, which is the average adult silent reading speed according to research. For Chinese text, 500 characters per minute is used."},
				{Q: "What is the Flesch-Kincaid readability score?", A: "The Flesch Reading Ease score ranges from 0 to 100. Higher scores indicate easier text. A score of 60-70 is considered standard for the general public, while below 30 indicates academic or technical text."},
				{Q: "Does the word counter support Chinese text?", A: "Yes. Chinese characters are counted individually as words (since Chinese has no spaces between words). The tool also counts total characters separately from word count."},
				{Q: "What is keyword density?", A: "Keyword density is the percentage of times a specific word appears in a text relative to the total word count. It is used in SEO analysis to avoid keyword stuffing (typically keep below 2-3%)."},
				{Q: "How are sentences counted?", A: "Sentences are delimited by periods, exclamation marks, and question marks. Abbreviations like 'Dr.' or 'U.S.' are handled by the parser to avoid false splits."},
			},
			"uuid": {
				{Q: "What is the difference between UUID v4 and v7?", A: "UUID v4 is completely random and has no inherent ordering. UUID v7 includes a Unix timestamp in milliseconds prefix, making it time-sortable - ideal for database primary keys where insertion order matters."},
				{Q: "Is a UUID globally unique?", A: "Practically yes. UUID v4 has a collision probability of approximately 1 in 2^122, which is negligible for any real-world application. UUID v7 further reduces collision risk due to its timestamp prefix."},
				{Q: "When should I use UUID v7 instead of v4?", A: "Use UUID v7 for database primary keys, event IDs, or any scenario where time-ordered identifiers improve performance (e.g., B-Tree index efficiency). Use UUID v4 for session tokens, temporary IDs, or when ordering does not matter."},
				{Q: "Are the generated UUIDs cryptographically secure?", A: "Yes. This tool uses crypto.getRandomValues() in your browser, which provides cryptographically secure randomness. However, UUIDs should not be used directly as encryption keys - use a dedicated key derivation function instead."},
				{Q: "Can I generate multiple UUIDs at once?", A: "Yes. You can generate up to 100 UUIDs in a single batch. Select the desired count and click generate."},
			},
			"lorem": {
				{Q: "What is Lorem Ipsum?", A: "Lorem Ipsum is placeholder text derived from a Latin work by Cicero in 45 BC. It has been used as dummy text in the typesetting and printing industry since the 1500s."},
				{Q: "What is the difference between classic and random mode?", A: "Classic mode starts with the traditional Lorem ipsum dolor sit amet... phrase, which is standard in the publishing industry. Random mode generates text from shuffled word dictionaries without a fixed opening, giving a more varied appearance."},
				{Q: "Why do designers use placeholder text?", A: "Placeholder text allows designers to focus on visual elements like layout, typography, and spacing without being distracted by the meaning of actual content. It is replaced with real content once the design is finalized."},
				{Q: "Can I control the type of text generated?", A: "Yes. This tool supports paragraphs, sentences, or words. Paragraph mode is ideal for filling large content areas, while sentence and word modes suit headings, buttons, and navigation elements."},
			},
			"user_agent": {
				{Q: "What is a User-Agent string?", A: "A User-Agent (UA) string is an HTTP header sent by your browser or application to web servers with every request. It identifies the browser, operating system, rendering engine, and device type, allowing servers to tailor content for your specific client."},
				{Q: "Can websites detect my real browser even if I spoof the UA?", A: "Often yes. While changing the User-Agent string can fool basic checks, modern websites use browser fingerprinting techniques—canvas, WebGL, font enumeration, timing APIs—to identify the real browser environment beyond just the UA string."},
				{Q: "What does 'bot detected' mean?", A: "If the tool flags your UA as a bot, the string contains known crawler or automation identifiers such as Googlebot, HeadlessChrome, Selenium, or common scraper names. Legitimate browsers never include these tokens."},
				{Q: "Why do different browsers report different architectures?", A: "The architecture field (32-bit, 64-bit, ARM) comes from OS and browser compilation flags embedded in the UA. A 64-bit OS may run a 32-bit browser, and some mobile CPUs use ARM architecture, which shows up in the UA string."},
				{Q: "Is my User-Agent string private?", A: "No. The UA string is automatically sent to every website you visit as part of the HTTP request. It is one of many data points websites collect. Using a privacy browser or UA spoofing extension can reduce this exposure."},
			},
		},
		"zh": {
			"hash": {
				{Q: "MD5 和 SHA-256 有什么区别？", A: "MD5 生成 128 位哈希值，已被证明存在碰撞漏洞，不适合安全场景。SHA-256 生成 256 位哈希值，属于 SHA-2 家族，目前仍被认为在大多数场景下安全可靠。"},
				{Q: "能从哈希值反推出原始内容吗？", A: "不能。哈希函数是单向的，在数学上无法逆推原始内容。不过，弱哈希如 MD5 可能通过彩虹表碰撞破解简单密码。"},
				{Q: "可以用 MD5 存储密码吗？", A: "不推荐。MD5 速度极快且容易遭受彩虹表攻击，不适合密码存储。请改用 bcrypt、scrypt 或 Argon2 等专为密码设计的算法。"},
				{Q: "什么是 HMAC？什么时候用它？", A: "HMAC（基于哈希的消息认证码）将哈希函数与密钥结合，用于同时验证数据完整性和来源真实性。常用于 API 请求签名和 Webhook 身份验证。"},
				{Q: "为什么同样的文字在不同算法下结果不同？", A: "不同哈希算法（SHA-1、SHA-256、SHA-512）内部结构不同，输出长度也不同，因此同一输入在不同算法下会产生完全不同的哈希值，这是设计上的正常行为。"},
			},
			"base64": {
				{Q: "什么是 Base64 编码？", A: "Base64 是一种将二进制数据转换为 ASCII 文本的编码方案，使用 64 个可打印字符表示任意二进制数据。常用于在 HTML 中嵌入图片、发送邮件附件、在 JSON 中存储二进制数据。"},
				{Q: "Base64 和 Base64URL 有什么区别？", A: "标准 Base64 使用 '+' 和 '/' 字符，在 URL 中需要额外转义。Base64URL 将它们替换为 '-' 和 '_'，可以直接用在 URL 路径和文件名中，无需再次转义。"},
				{Q: "Base64 编码会增大文件体积吗？", A: "会，增加约 33%。这是因为每 3 字节的二进制数据被表示为 4 个 ASCII 字符，是 Base64 编码的固有特性。"},
				{Q: "Base64 是加密吗？", A: "不是。Base64 只是编码，不提供任何安全性保障。任何人都可以无需密钥直接解码 Base64 字符串。如需保密，请先对数据加密再进行 Base64 编码。"},
				{Q: "这个工具可以把图片转成 Base64 吗？", A: "可以。在文件上传区选择任意图片或二进制文件（最大 50MB），工具将完全在您的浏览器内处理，不会上传到任何服务器。"},
			},
			"url_encode": {
				{Q: "什么是 URL 编码？", A: "URL 编码（百分号编码）将 URL 中不允许出现的字符转换为 '%XX' 格式，其中 XX 是该字符的十六进制码。例如空格变为 %20。"},
				{Q: "encodeURI 和 encodeURIComponent 有什么区别？", A: "encodeURI 对完整 URL 编码，保留 '/'、'?'、'&' 等结构字符不变；encodeURIComponent 对 URL 的某个部分（如查询参数值）编码，会转义这些结构字符。"},
				{Q: "URL 中的空格应该用 %20 还是 +？", A: "%20 是 RFC 3986 的标准写法，适用于所有 URL 路径和参数。'+' 只在 HTML 表单数据（application/x-www-form-urlencoded）中合法代表空格，两者不可混用。"},
				{Q: "可以批量对多个 URL 进行编码吗？", A: "可以。将多个 URL 每行一个粘贴到输入框，开启批量模式后，工具将对每一行独立进行编码或解码处理。"},
				{Q: "为什么有些字符没有被编码？", A: "RFC 3986 定义了一组「非保留字符」（A-Z、a-z、0-9、-、_、.、~），这些字符在 URL 中天然安全，无需编码。本工具严格遵循此标准。"},
			},
			"ip": {
				{Q: "什么是公网 IP 地址？", A: "公网 IP 是您的网络运营商（ISP）分配给您网络的地址，用于在互联网上标识您的设备，与路由器内部使用的私有 IP（如 192.168.x.x）不同。"},
				{Q: "IPv4 和 IPv6 有什么区别？", A: "IPv4 使用 32 位地址（如 192.168.1.1），约 43 亿个地址空间已近耗尽。IPv6 使用 128 位地址（如 2001:db8::1），可提供近乎无限的地址空间来解决这一问题。"},
				{Q: "别人能通过我的 IP 找到我的准确位置吗？", A: "不能精确定位。IP 地理位置数据库通常只能确定您所在的国家和大致城市，无法获知具体街道地址。使用 VPN 可以隐藏您的真实 IP。"},
				{Q: "什么是 ASN？", A: "自治系统编号（ASN）是分配给由运营商或大型组织管理的 IP 地址网络的唯一标识符，用于互联网路由协议中标识不同网络主体。"},
				{Q: "为什么 IP 地理位置显示的城市不正确？", A: "IP 数据库依赖 ISP 的注册信息，更新可能有延迟，移动网络和 VPN 用户的位置尤其不准确。这是 IP 定位技术本身的局限性。"},
			},
			"whois": {
				{Q: "什么是 Whois 查询？", A: "Whois 是一种查询协议，用于获取已注册域名的信息，包括域名所有者、注册商、注册日期和到期日期等数据。"},
				{Q: "Whois 信息准确吗？", A: "不一定。域名注册者可以使用隐私保护服务隐藏个人联系信息，此时查询结果会显示注册商代理机构的信息而非真实所有者。"},
				{Q: "什么是 RDAP？", A: "RDAP（注册数据访问协议）是 Whois 的现代替代方案，返回结构化的 JSON 数据而非纯文本，支持更好的访问控制和国际化。本工具优先使用 RDAP 查询。"},
				{Q: "可以查询 IP 地址的归属吗？", A: "可以。输入 IP 地址可查询 ARIN、RIPE、APNIC 等地区互联网注册机构的数据，获取该 IP 的网段所有者和分配信息。"},
				{Q: "为什么某些 Whois 信息被隐藏了？", A: "GDPR 等隐私法规要求注册商隐去个人数据，如所有者姓名和邮箱。如需进行域名所有权核实，需联系域名注册商通过官方渠道处理。"},
			},
			"word_counter": {
				{Q: "阅读时间是怎么计算的？", A: "英文文本按每分钟 238 词计算（成年人平均默读速度），中文文本按每分钟 500 字计算。这是根据阅读速度研究得出的参考数值。"},
				{Q: "什么是 Flesch-Kincaid 可读性评分？", A: "Flesch 阅读便捷度评分范围 0-100，分数越高表示文章越易读。60-70 分适合普通大众阅读，30 分以下通常为学术或技术性文本。"},
				{Q: "支持中文字数统计吗？", A: "支持。中文字符按单个汉字计为一个单词（因为中文没有空格分隔词语），同时单独提供总字符数统计，满足不同统计需求。"},
				{Q: "什么是关键词密度？", A: "关键词密度是某个词在全文中出现次数占总词数的百分比，用于 SEO 分析。通常建议关键词密度保持在 2-3% 以内，过高会被搜索引擎判定为堆砌关键词。"},
				{Q: "句子数量是怎么统计的？", A: "工具以句号、叹号、问号作为句子分隔符，同时内置了缩写词识别规则（如 Dr.、U.S.），避免因缩写中的句点导致统计错误。"},
			},
			"user_agent": {
				{Q: "什么是 User-Agent 字符串？", A: "User-Agent（UA）字符串是浏览器或应用在每次 HTTP 请求中自动发送给服务器的标识信息，包含浏览器名称、版本、操作系统、渲染引擎及设备类型，让服务器据此返回适配的内容。"},
				{Q: "伪造 UA 后网站还能识别真实浏览器吗？", A: "通常可以。修改 UA 字符串只能欺骗简单检测，现代网站会使用浏览器指纹技术——Canvas 绘图、WebGL 特征、字体枚举、计时 API 等——来识别真实的浏览器环境，而不仅仅依赖 UA。"},
				{Q: "「检测到机器人」是什么意思？", A: "如果工具将您的 UA 标记为机器人，说明字符串中包含已知爬虫或自动化工具的特征标识，例如 Googlebot、HeadlessChrome、Selenium 或常见抓取器名称。正规浏览器不会包含这些标记。"},
				{Q: "为什么不同浏览器显示的架构不同？", A: "架构信息（32 位、64 位、ARM）来自 UA 中嵌入的操作系统和浏览器编译标志。64 位操作系统可能运行 32 位浏览器，移动端 CPU 通常采用 ARM 架构，这些都会体现在 UA 字符串中。"},
				{Q: "我的 User-Agent 是私密的吗？", A: "不是。UA 字符串会随每次 HTTP 请求自动发送给您访问的每个网站，是网站收集的众多数据之一。使用隐私浏览器或 UA 伪装扩展可以降低这种暴露风险。"},
			},
		},
	}
	if langFaqs, ok := faqs[lang]; ok {
		if toolFaqs, ok := langFaqs[tool]; ok {
			return toolFaqs
		}
	}
	// Fallback to English
	if toolFaqs, ok := faqs["en"][tool]; ok {
		return toolFaqs
	}
	return []FAQ{}
}
