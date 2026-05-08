#!/usr/bin/env python3
"""
seed_proxies.py — 生成免费代理列表测试数据
用法:
  python3 scripts/seed_proxies.py                    # 打印 SQL 到 stdout
  python3 scripts/seed_proxies.py | mysql -u root -p toolboxnova
"""

import random
import sys
from datetime import datetime, timedelta

random.seed(42)

# ── 真实国家数据（按代理丰富度加权） ──────────────────────
# (code, name, weight) — 权重越高该国家生成越多
COUNTRIES = [
    ("US", "United States",        20),
    ("DE", "Germany",              12),
    ("FR", "France",               10),
    ("GB", "United Kingdom",       10),
    ("NL", "Netherlands",          10),
    ("RU", "Russia",               10),
    ("JP", "Japan",                 8),
    ("KR", "South Korea",           8),
    ("CN", "China",                 8),
    ("IN", "India",                 8),
    ("BR", "Brazil",                8),
    ("CA", "Canada",                7),
    ("AU", "Australia",             6),
    ("SG", "Singapore",             5),
    ("HK", "Hong Kong",             5),
    ("TW", "Taiwan",                5),
    ("PL", "Poland",                5),
    ("RO", "Romania",               5),
    ("CZ", "Czech Republic",        4),
    ("ES", "Spain",                 5),
    ("IT", "Italy",                 5),
    ("SE", "Sweden",                4),
    ("FI", "Finland",               3),
    ("NO", "Norway",                3),
    ("DK", "Denmark",               3),
    ("AT", "Austria",               3),
    ("BE", "Belgium",               3),
    ("CH", "Switzerland",           3),
    ("IE", "Ireland",               3),
    ("PT", "Portugal",              3),
    ("TH", "Thailand",              4),
    ("VN", "Vietnam",               4),
    ("ID", "Indonesia",             4),
    ("MY", "Malaysia",              3),
    ("PH", "Philippines",           4),
    ("MX", "Mexico",                5),
    ("AR", "Argentina",             4),
    ("CL", "Chile",                 3),
    ("CO", "Colombia",              3),
    ("ZA", "South Africa",          3),
    ("NG", "Nigeria",               3),
    ("EG", "Egypt",                 3),
    ("IL", "Israel",                3),
    ("TR", "Turkey",                4),
    ("UA", "Ukraine",               5),
    ("NZ", "New Zealand",           2),
    ("PK", "Pakistan",              3),
    ("BD", "Bangladesh",            3),
    ("IR", "Iran",                  3),
    ("SA", "Saudi Arabia",          2),
    ("AE", "United Arab Emirates",  2),
    ("KE", "Kenya",                 2),
    ("MA", "Morocco",               2),
    ("PE", "Peru",                  2),
    ("EC", "Ecuador",               1),
    ("UY", "Uruguay",               1),
    ("CR", "Costa Rica",            1),
    ("PA", "Panama",                1),
    ("DO", "Dominican Republic",    1),
    ("GT", "Guatemala",             1),
    ("KH", "Cambodia",              1),
    ("MM", "Myanmar",               1),
    ("LK", "Sri Lanka",             1),
    ("NP", "Nepal",                 1),
    ("KZ", "Kazakhstan",            2),
    ("UZ", "Uzbekistan",            1),
    ("GE", "Georgia",               1),
    ("AM", "Armenia",               1),
    ("AZ", "Azerbaijan",            1),
    ("MD", "Moldova",               1),
    ("BG", "Bulgaria",              2),
    ("RS", "Serbia",                1),
    ("HR", "Croatia",               1),
    ("HU", "Hungary",               2),
    ("SK", "Slovakia",              1),
    ("SI", "Slovenia",              1),
    ("LT", "Lithuania",             1),
    ("LV", "Latvia",                1),
    ("EE", "Estonia",               1),
    ("GR", "Greece",                2),
    ("IS", "Iceland",               1),
    ("LU", "Luxembourg",            1),
    ("MT", "Malta",                 1),
    ("CY", "Cyprus",                1),
]

COUNTRY_CODES = [c[0] for c in COUNTRIES]
COUNTRY_NAMES = {c[0]: c[1] for c in COUNTRIES}
COUNTRY_WEIGHTS = [c[2] for c in COUNTRIES]

PROTOCOLS = ["http", "https", "socks4", "socks5"]
ANONYMITIES = ["transparent", "anonymous", "elite"]
PORTS = [80, 443, 1080, 3128, 8080, 8443, 8888, 9050, 9090, 10000, 10001,
         10801, 12345, 14433, 20183, 29842, 31280, 39393, 41425, 43210,
         49876, 50100, 53281, 54321, 58362, 60001, 60088, 61234, 65432,
         70001, 70707, 74210, 78901, 8000, 8001, 8008, 8010, 8043, 8081,
         8082, 8085, 8088, 8090, 8118, 8181, 8380, 8444, 8585, 8686,
         8787, 8811, 8909, 9000, 9091, 9191, 9292, 9300, 9443, 9999]

# 权重分布：http/https 更多
PROTOCOL_WEIGHTS = [35, 25, 20, 20]
# 匿名度分布：anonymous 最多
ANONYMITY_WEIGHTS = [15, 55, 30]


def random_ip():
    """生成随机公网 IP（排除私有网段）"""
    while True:
        a = random.randint(1, 223)
        b = random.randint(0, 255)
        c = random.randint(0, 255)
        d = random.randint(1, 254)
        # 排除私有地址和特殊地址
        if a in (10, 127):
            continue
        if a == 172 and 16 <= b <= 31:
            continue
        if a == 192 and b == 168:
            continue
        if a == 169 and b == 254:
            continue
        if a == 0:
            continue
        return f"{a}.{b}.{c}.{d}"


def random_latency(anonymity):
    """根据匿名度生成合理的延迟"""
    if anonymity == "elite":
        base = random.choice([120, 180, 250, 350, 500, 800])
    elif anonymity == "anonymous":
        base = random.choice([80, 150, 220, 400, 600, 1200, 2000])
    else:  # transparent
        base = random.choice([30, 60, 100, 200, 350])
    return base + random.randint(-20, 50)


def random_uptime(latency):
    """根据延迟估算在线率"""
    if latency < 200:
        return round(random.uniform(88, 99.5), 1)
    elif latency < 500:
        return round(random.uniform(75, 95), 1)
    elif latency < 1500:
        return round(random.uniform(60, 88), 1)
    elif latency < 3000:
        return round(random.uniform(45, 75), 1)
    return round(random.uniform(25, 55), 1)


def generate_proxy(idx, used_keys):
    """生成单条代理记录，确保 ip:port:protocol 唯一"""
    while True:
        ip = random_ip()
        port = random.choice(PORTS)
        protocol = random.choices(PROTOCOLS, weights=PROTOCOL_WEIGHTS, k=1)[0]
        key = (ip, port, protocol)
        if key not in used_keys:
            used_keys.add(key)
            break

    cc = random.choices(COUNTRY_CODES, weights=COUNTRY_WEIGHTS, k=1)[0]
    country_name = COUNTRY_NAMES[cc]
    anonymity = random.choices(ANONYMITIES, weights=ANONYMITY_WEIGHTS, k=1)[0]
    latency = random_latency(anonymity)
    if latency < 0:
        latency = abs(latency)
    uptime = random_uptime(latency)

    now = datetime.utcnow()
    last_checked = now - timedelta(
        minutes=random.randint(0, 30),
        seconds=random.randint(0, 59)
    )

    is_alive = random.random() < 0.92

    return {
        "ip": ip,
        "port": port,
        "protocol": protocol,
        "country_code": cc,
        "country_name": country_name,
        "anonymity": anonymity,
        "latency_ms": latency,
        "uptime_pct": uptime,
        "last_checked": last_checked.strftime("%Y-%m-%d %H:%M:%S"),
        "is_alive": 1 if is_alive else 0,
        "source": "seed",
    }


def escape_sql(s):
    return s.replace("'", "\\'")


def main():
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 10000

    print("-- seed_proxies.py 自动生成的测试数据")
    print(f"-- 生成 {count} 条记录 · {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print("USE toolboxnova;")
    print()

    # 先清空旧 seed 数据
    print("DELETE FROM `proxies` WHERE `source` = 'seed';")
    print()

    used_keys = set()
    proxies = []
    for i in range(count):
        proxies.append(generate_proxy(i, used_keys))

    # 分批 INSERT（每批 500 条）
    batch_size = 500
    for start in range(0, len(proxies), batch_size):
        batch = proxies[start:start + batch_size]
        print("INSERT IGNORE INTO `proxies`")
        print("  (`ip`,`port`,`protocol`,`country_code`,`country_name`,`anonymity`,")
        print("   `latency_ms`,`uptime_pct`,`last_checked`,`is_alive`,`source`)")
        print("VALUES")
        values = []
        for p in batch:
            ip = p['ip']
            port = p['port']
            proto = p['protocol']
            cc = p['country_code']
            cn = escape_sql(p['country_name'])
            anon = p['anonymity']
            lat = p['latency_ms']
            up = p['uptime_pct']
            lc = p['last_checked']
            alive = p['is_alive']
            values.append(
                f"  ('{ip}',{port},'{proto}','{cc}','{cn}','{anon}',"
                f"{lat},{up},'{lc}',{alive},'seed')"
            )
        print(",\n".join(values) + ";")
        print()

    # 统计信息
    alive = sum(1 for p in proxies if p["is_alive"])
    countries = len(set(p["country_code"] for p in proxies))
    print(f"-- 插入完成: {len(proxies)} 条, 在线: {alive}, 国家: {countries}")
    print("-- SELECT COUNT(*) AS total, SUM(is_alive) AS alive, "
          "COUNT(DISTINCT country_code) AS countries FROM proxies;")


if __name__ == "__main__":
    main()
