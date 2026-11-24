# 世界史 第1回の図（グラフ・地図）を SVG で作る。できた SVG は web/public/figures/ に置き、コミットする。
#   python3 -I scripts/figures/make_sekaishi_01_figures.py <ne_50m_land.geojson> <AEXJPUS.csv>
# 入力（コミットしない）:
#   - Natural Earth 1:50m Land（パブリックドメイン）
#     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson
#   - 円の対ドル相場の年平均（米連邦準備制度理事会 H.10 / FRED: AEXJPUS、1971年〜）
#     https://fred.stlouisfed.org/series/AEXJPUS
# 1970年以前は公定レート 1ドル=360円（1949年4月設定、1971年12月のスミソニアン協定まで）。
import csv
import json
import pathlib
import sys

OUT = pathlib.Path(__file__).resolve().parents[2] / "web" / "public" / "figures"
FONT = "'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif"


# ---------------- 地図: インド洋（鄭和の艦隊が訪れた港市・島） ----------------
def make_map(geojson_path):
    lon0, lon1, lat0, lat1 = 30.0, 125.0, -15.0, 36.0
    W = 640
    sx = W / (lon1 - lon0)
    H = round((lat1 - lat0) * sx)
    pad = 2.0  # 表示範囲の外側に押し出す余白（度）。押し出した辺は枠の外になり見えない

    def xy(lon, lat):
        lon = min(max(lon, lon0 - pad), lon1 + pad)
        lat = min(max(lat, lat0 - pad), lat1 + pad)
        return (lon - lon0) * sx, (lat1 - lat) * sx

    data = json.loads(pathlib.Path(geojson_path).read_text(encoding="utf-8"))
    paths = []
    for f in data["features"]:
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for poly in polys:
            for ring in poly:
                lons = [p[0] for p in ring]
                lats = [p[1] for p in ring]
                if max(lons) < lon0 or min(lons) > lon1 or max(lats) < lat0 or min(lats) > lat1:
                    continue
                pts, last = [], None
                for lon, lat in ring:
                    x, y = xy(lon, lat)
                    p = (round(x, 1), round(y, 1))
                    if p != last:
                        pts.append(p)
                        last = p
                if len(pts) < 4:
                    continue
                paths.append("M" + "L".join(f"{x},{y}" for x, y in pts) + "Z")

    # 印（経度・緯度は各地の位置。A ホルムズ、B アデン、C マリンディ、D セイロン島）
    marks = [("A", 56.3, 27.1, 8, -8), ("B", 45.0, 12.8, -16, 18), ("C", 40.1, -3.2, -18, 4), ("D", 80.7, 7.9, 10, 4)]
    m = []
    for label, lon, lat, dx, dy in marks:
        x, y = xy(lon, lat)
        m.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="#000"/>')
        m.append(f'<text x="{x + dx:.1f}" y="{y + dy:.1f}" font-size="15" font-weight="700" font-family="{FONT}">{label}</text>')
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="インド洋周辺の地図。A〜Dの4か所に印がある">
<rect x="0" y="0" width="{W}" height="{H}" fill="#fff"/>
<path d="{''.join(paths)}" fill="#d9d9d9" stroke="#555" stroke-width="0.6" fill-rule="evenodd"/>
{''.join(m)}
<rect x="0.5" y="0.5" width="{W - 1}" height="{H - 1}" fill="none" stroke="#000"/>
</svg>
'''
    (OUT / "keio-shogaku-sekaishi-01-map.svg").write_text(svg, encoding="utf-8")
    print(f"地図: {len(paths)} 本の輪郭、{len(svg) // 1024} KB")


# ---------------- グラフ: 円の対ドル相場（1960〜1995年、年平均） ----------------
def make_graph(csv_path):
    rate = {y: 360.0 for y in range(1960, 1971)}  # 公定レート
    with open(csv_path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            y = int(row["observation_date"][:4])
            if 1971 <= y <= 1995:
                rate[y] = float(row["AEXJPUS"])
    years = list(range(1960, 1996))
    assert all(y in rate for y in years), "データが欠けている"
    W, H, L, R, T, B = 600, 330, 60, 20, 20, 50
    x = lambda yr: L + (yr - 1960) / (1995 - 1960) * (W - L - R)
    y = lambda v: T + (400 - v) / 400 * (H - T - B)
    g = []
    for v in range(0, 401, 50):
        g.append(f'<line x1="{L}" y1="{y(v):.1f}" x2="{W - R}" y2="{y(v):.1f}" stroke="#ccc" stroke-width="0.6"/>')
        g.append(f'<text x="{L - 6}" y="{y(v) + 4:.1f}" font-size="11" text-anchor="end" font-family="{FONT}">{v}</text>')
    for yr in range(1960, 1996, 5):
        g.append(f'<line x1="{x(yr):.1f}" y1="{H - B}" x2="{x(yr):.1f}" y2="{H - B + 4}" stroke="#000"/>')
        g.append(f'<text x="{x(yr):.1f}" y="{H - B + 18}" font-size="11" text-anchor="middle" font-family="{FONT}">{yr}</text>')
    line = " ".join(f"{x(yr):.1f},{y(rate[yr]):.1f}" for yr in years)
    # 時期の記号（ア）〜（エ）: ア 固定相場の時期、イ 1971〜73年、ウ 1985〜88年の急激な円高、エ 1990年代前半
    labels = [("（ア）", 1964.5, 360, -14), ("（イ）", 1972.5, rate[1972], -16), ("（ウ）", 1987.2, rate[1987], -22), ("（エ）", 1993.5, rate[1994], 24)]
    lab = "".join(f'<text x="{x(yr):.1f}" y="{y(v) + dy:.1f}" font-size="13" text-anchor="middle" font-family="{FONT}">{t}</text>' for t, yr, v, dy in labels)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="1960年から1995年までの円の対ドル相場の折れ線グラフ。（ア）〜（エ）の時期の記号がある">
<rect x="0" y="0" width="{W}" height="{H}" fill="#fff"/>
{''.join(g)}
<line x1="{L}" y1="{T}" x2="{L}" y2="{H - B}" stroke="#000"/>
<line x1="{L}" y1="{H - B}" x2="{W - R}" y2="{H - B}" stroke="#000"/>
<polyline points="{line}" fill="none" stroke="#000" stroke-width="2"/>
{lab}
<text x="{L - 30}" y="{(T + H - B) / 2:.1f}" font-size="11" text-anchor="middle" font-family="{FONT}" writing-mode="tb">円</text>
<text x="{(W + L) / 2:.1f}" y="{H - 10}" font-size="12" text-anchor="middle" font-family="{FONT}">年</text>
</svg>
'''
    (OUT / "keio-shogaku-sekaishi-01-graph.svg").write_text(svg, encoding="utf-8")
    print("グラフ: " + ", ".join(f"{yr}={rate[yr]:.0f}" for yr in (1970, 1971, 1973, 1985, 1986, 1988, 1995)))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    make_map(sys.argv[1])
    make_graph(sys.argv[2])
