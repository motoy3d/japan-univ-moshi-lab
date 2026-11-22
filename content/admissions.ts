// 志望校の選択肢と、公式の入試日程・時間割。
// 値はすべて大学・大学入試センターの公表資料から転記している（出典 URL と確認日を各エントリに記載）。
// 年度が変わったら、要項の公開後に必ず差し替えること（npm run validate が年度切れを警告する）。

export interface ExamPeriod {
  /** 教科（例: 外国語） */
  subject: string;
  /** 補足（科目の選択など） */
  note?: string;
  start: string; // "10:00"
  end: string; // "11:30"
  /** 配点（配点のない科目は null） */
  points: number | null;
}

export interface ExamStage {
  /** 第1次試験など（1段階のみなら省略） */
  label?: string;
  date: string; // YYYY-MM-DD（試験日）
  gather: string; // 集合時刻
  periods: ExamPeriod[];
  /** 合格発表（日時） */
  result?: string; // YYYY-MM-DDTHH:mm
}

export interface AdmissionMethod {
  id: string;
  /** 受験方式・学科などの名称（例: A方式） */
  name: string;
  /** 募集人員 */
  capacity: string;
  /** 方式ごとに時間割が違う場合のみ上書き（例: 第3時限が数学か論文テストか） */
  periodsOverride?: Partial<Record<number, ExamPeriod>>;
}

export interface Faculty {
  id: string;
  name: string;
  department: string;
  /** 検索用の別名（よみ・略称） */
  aliases: string[];
  totalPoints: number;
  stages: ExamStage[];
  methods: AdmissionMethod[];
  /** この学部に対応する模試の ID */
  mockExamIds: string[];
  /** 学部の公式ページ */
  url?: string;
}

export interface Admission {
  id: string;
  /** 大学名（共通テストは試験名） */
  name: string;
  shortName: string;
  kind: "university" | "common-test";
  /** 年度（入学年度） */
  year: number;
  aliases: string[];
  /** 出願期間 */
  application?: { label: string; start: string; end: string }[];
  links: { label: string; url: string }[];
  /** 出典と確認日 */
  source: { title: string; url: string; checkedAt: string };
  faculties: Faculty[];
}

const KEIO_GUIDE = "https://www.keio.ac.jp/fixed-files/2027_ippan_youkou.pdf";

/** 外国語（英語）の科目・出題範囲（慶應の各学部共通の表記） */
const EIGO = "英語（英語コミュニケーションⅠ〜Ⅲ、論理・表現Ⅰ〜Ⅲ）";

export const ADMISSIONS: Admission[] = [
  {
    id: "keio",
    name: "慶應義塾大学",
    shortName: "慶應",
    kind: "university",
    year: 2027,
    aliases: ["けいおう", "けいおうぎじゅく", "慶応", "keio"],
    application: [
      { label: "出願登録・入学検定料の支払い（インターネット）", start: "2026-12-24T10:00", end: "2027-01-18T17:00" },
      { label: "出願書類の郵送（締切日消印有効・速達簡易書留）", start: "2027-01-04", end: "2027-01-18" },
    ],
    links: [
      { label: "2027年度 一般選抜（公式）", url: "https://www.keio.ac.jp/ja/admissions/faculty/general-admissions-2027" },
      { label: "一般選抜要項（PDF）", url: KEIO_GUIDE },
      { label: "学部入学案内（公式）", url: "https://www.keio.ac.jp/ja/admissions/faculty/" },
    ],
    source: { title: "慶應義塾大学 2027年度 一般選抜要項（2026年11月6日公開）", url: KEIO_GUIDE, checkedAt: "2026-11-22" },
    faculties: [
      {
        id: "shogaku",
        name: "商学部",
        department: "商学科",
        aliases: ["しょうがくぶ", "商", "しょう"],
        totalPoints: 400,
        mockExamIds: ["keio-shogaku-eigo-01", "keio-shogaku-eigo-02"],
        url: "https://www.keio.ac.jp/ja/fbc/",
        stages: [
          {
            date: "2027-02-14",
            gather: "9:30",
            result: "2027-02-24T10:00",
            periods: [
              { subject: "外国語", note: EIGO, start: "10:00", end: "11:30", points: 200 },
              { subject: "地理歴史", note: "世界史探究・日本史探究・地理探究から1科目", start: "12:55", end: "13:55", points: 100 },
              { subject: "数学", note: "数学Ⅰ・Ⅱ・A・B・C（A方式）", start: "14:50", end: "16:00", points: 100 },
            ],
          },
        ],
        methods: [
          { id: "a", name: "A方式（外国語・地理歴史・数学）", capacity: "480名" },
          {
            id: "b",
            name: "B方式（外国語・地理歴史・論文テスト）",
            capacity: "120名",
            periodsOverride: { 2: { subject: "論文テスト", note: "資料を与えて、論理的理解力と表現力を問う", start: "14:50", end: "16:00", points: 100 } },
          },
        ],
      },
      {
        id: "keizai",
        name: "経済学部",
        department: "経済学科",
        aliases: ["けいざいがくぶ", "経済", "けいざい"],
        totalPoints: 400,
        mockExamIds: [],
        url: "https://www.keio.ac.jp/ja/econ/",
        stages: [
          {
            date: "2027-02-13",
            gather: "9:30",
            result: "2027-02-25T10:00",
            periods: [
              { subject: "外国語", note: EIGO, start: "10:00", end: "11:40", points: 200 },
              { subject: "数学", note: "数学Ⅰ・Ⅱ・A・B（数列）・C（ベクトル）（A方式）", start: "13:05", end: "14:45", points: 200 },
            ],
          },
        ],
        methods: [
          { id: "a", name: "A方式（外国語・数学）", capacity: "400名" },
          {
            id: "b",
            name: "B方式（外国語・地理歴史）",
            capacity: "200名",
            periodsOverride: { 1: { subject: "地理歴史", note: "世界史・日本史から1科目（1500年以降中心）", start: "13:05", end: "14:45", points: 200 } },
          },
        ],
      },
      {
        id: "hogaku",
        name: "法学部",
        department: "法律学科・政治学科",
        aliases: ["ほうがくぶ", "法", "ほう", "法律", "政治"],
        totalPoints: 450,
        mockExamIds: [],
        url: "https://www.keio.ac.jp/ja/law/",
        stages: [
          {
            date: "2027-02-16",
            gather: "9:30",
            result: "2027-02-25T10:00",
            periods: [
              { subject: "外国語", note: EIGO, start: "10:00", end: "11:20", points: 200 },
              { subject: "地理歴史", note: "世界史・日本史から1科目", start: "12:40", end: "14:10", points: 150 },
              { subject: "小論文", start: "15:00", end: "16:00", points: 100 },
            ],
          },
        ],
        methods: [
          { id: "law", name: "法律学科", capacity: "230名" },
          { id: "pol", name: "政治学科", capacity: "230名" },
        ],
      },
      {
        id: "bungaku",
        name: "文学部",
        department: "人文社会学科",
        aliases: ["ぶんがくぶ", "文", "ぶん"],
        totalPoints: 350,
        mockExamIds: [],
        url: "https://www.keio.ac.jp/ja/flet/",
        stages: [
          {
            date: "2027-02-15",
            gather: "9:30",
            result: "2027-02-24T10:00",
            periods: [
              { subject: "小論文", start: "10:00", end: "11:30", points: 100 },
              { subject: "地理歴史", note: "世界史・日本史から1科目", start: "12:45", end: "13:45", points: 100 },
              { subject: "外国語", note: "英語（独自試験・辞書2冊まで持込可）・ドイツ語・フランス語・英語（外部試験利用）から1科目", start: "14:45", end: "16:45", points: 150 },
            ],
          },
        ],
        methods: [{ id: "general", name: "一般選抜", capacity: "580名" }],
      },
      {
        id: "igaku",
        name: "医学部",
        department: "医学科",
        aliases: ["いがくぶ", "医", "い"],
        totalPoints: 500,
        mockExamIds: [],
        url: "https://www.keio.ac.jp/ja/med/",
        stages: [
          {
            label: "第1次試験（三田キャンパス）",
            date: "2027-02-09",
            gather: "9:30",
            result: "2027-02-19T10:00",
            periods: [
              { subject: "理科", note: "物理・化学・生物から2科目", start: "10:00", end: "12:00", points: 200 },
              { subject: "数学", note: "数学Ⅰ・Ⅱ・Ⅲ・A・B・C", start: "13:20", end: "15:00", points: 150 },
              { subject: "外国語", note: EIGO, start: "15:45", end: "17:15", points: 150 },
            ],
          },
          {
            label: "第2次試験（日吉キャンパス）",
            date: "2027-03-01",
            gather: "8:45",
            result: "2027-03-05T10:00",
            periods: [{ subject: "小論文", note: "終了後に調書記入・面接", start: "9:00", end: "10:00", points: null }],
          },
        ],
        methods: [
          { id: "general", name: "一般枠", capacity: "65名" },
          { id: "tochigi", name: "栃木県地域枠", capacity: "1名" },
        ],
      },
      {
        id: "riko",
        name: "理工学部",
        department: "学門A〜E",
        aliases: ["りこうがくぶ", "理工", "りこう"],
        totalPoints: 500,
        mockExamIds: [],
        url: "https://www.keio.ac.jp/ja/st/",
        stages: [
          {
            date: "2027-02-12",
            gather: "9:30",
            result: "2027-02-24T10:00",
            periods: [
              { subject: "理科", note: "物理・化学（各100点）", start: "10:00", end: "12:00", points: 200 },
              { subject: "数学", note: "数学Ⅰ・Ⅱ・Ⅲ・A・B・C", start: "13:20", end: "15:20", points: 150 },
              { subject: "外国語", note: EIGO, start: "16:10", end: "17:40", points: 150 },
            ],
          },
        ],
        methods: [
          { id: "a", name: "学門A（物理・電気・機械分野）", capacity: "130名" },
          { id: "b", name: "学門B（電気・情報分野）", capacity: "110名" },
          { id: "c", name: "学門C（情報・数学・データサイエンス分野）", capacity: "140名" },
          { id: "d", name: "学門D（機械・システム分野）", capacity: "140名" },
          { id: "e", name: "学門E（化学・生命分野）", capacity: "130名" },
        ],
      },
      {
        id: "sougou",
        name: "総合政策学部",
        department: "総合政策学科",
        aliases: ["そうごうせいさく", "総政", "SFC", "えすえふしー"],
        totalPoints: 400,
        mockExamIds: [],
        url: "https://www.keio.ac.jp/ja/sfc/",
        stages: [
          {
            date: "2027-02-17",
            gather: "9:30",
            result: "2027-02-25T10:00",
            periods: [
              { subject: "選択教科", note: "「外国語」「数学」「外国語および数学」「情報および数学」から1つ", start: "10:00", end: "12:00", points: 200 },
              { subject: "小論文", start: "13:20", end: "15:20", points: 200 },
            ],
          },
        ],
        methods: [
          { id: "eng", name: "外国語", capacity: "225名（学部全体）" },
          { id: "math", name: "数学", capacity: "225名（学部全体）" },
          { id: "eng-math", name: "外国語および数学", capacity: "225名（学部全体）" },
          { id: "info-math", name: "情報および数学", capacity: "225名（学部全体）" },
        ],
      },
      {
        id: "kankyo",
        name: "環境情報学部",
        department: "環境情報学科",
        aliases: ["かんきょうじょうほう", "環情", "SFC", "えすえふしー"],
        totalPoints: 400,
        mockExamIds: [],
        url: "https://www.keio.ac.jp/ja/sfc/",
        stages: [
          {
            date: "2027-02-18",
            gather: "9:30",
            result: "2027-02-25T10:00",
            periods: [
              { subject: "選択教科", note: "「外国語」「数学」「外国語および数学」「情報および数学」から1つ", start: "10:00", end: "12:00", points: 200 },
              { subject: "小論文", start: "13:20", end: "15:20", points: 200 },
            ],
          },
        ],
        methods: [
          { id: "eng", name: "外国語", capacity: "225名（学部全体）" },
          { id: "math", name: "数学", capacity: "225名（学部全体）" },
          { id: "eng-math", name: "外国語および数学", capacity: "225名（学部全体）" },
          { id: "info-math", name: "情報および数学", capacity: "225名（学部全体）" },
        ],
      },
      {
        id: "kango",
        name: "看護医療学部",
        department: "看護学科",
        aliases: ["かんごいりょう", "看護", "かんご"],
        totalPoints: 500,
        mockExamIds: [],
        url: "https://www.keio.ac.jp/ja/nmc/",
        stages: [
          {
            label: "第1次試験",
            date: "2027-02-11",
            gather: "9:30",
            result: "2027-02-17T10:00",
            periods: [
              { subject: "外国語", note: EIGO, start: "10:00", end: "11:30", points: 300 },
              { subject: "数学・化学・生物", note: "1つを選択", start: "12:45", end: "14:05", points: 200 },
              { subject: "小論文", note: "第2次試験の選考に使用", start: "14:50", end: "16:00", points: null },
            ],
          },
          {
            label: "第2次試験（面接・午前の部／午後の部）",
            date: "2027-02-20",
            gather: "9:15 または 12:05",
            result: "2027-02-25T10:00",
            periods: [],
          },
        ],
        methods: [{ id: "general", name: "一般選抜", capacity: "70名" }],
      },
      {
        id: "yakugaku",
        name: "薬学部",
        department: "薬学科・薬科学科",
        aliases: ["やくがくぶ", "薬", "やく"],
        totalPoints: 350,
        mockExamIds: [],
        url: "https://www.keio.ac.jp/ja/pha/",
        stages: [
          {
            date: "2027-02-10",
            gather: "9:30",
            result: "2027-02-21T10:00",
            periods: [
              { subject: "理科", note: "化学", start: "10:00", end: "11:40", points: 150 },
              { subject: "外国語", note: EIGO, start: "13:00", end: "14:20", points: 100 },
              { subject: "数学", note: "数学Ⅰ・Ⅱ・Ⅲ・A・B・C", start: "15:20", end: "17:00", points: 100 },
            ],
          },
        ],
        methods: [
          { id: "pharm", name: "薬学科（6年制）", capacity: "100名" },
          { id: "sci", name: "薬科学科（4年制）", capacity: "50名" },
        ],
      },
    ],
  },
  {
    id: "kyotsu",
    name: "大学入学共通テスト",
    shortName: "共通テスト",
    kind: "common-test",
    year: 2027,
    aliases: ["きょうつうてすと", "共テ", "センター"],
    links: [
      { label: "令和9年度 大学入学共通テスト（大学入試センター）", url: "https://www.dnc.ac.jp/kyotsu/shiken_jouhou/r9/index.html" },
    ],
    source: { title: "大学入試センター 令和9年度大学入学共通テスト 試験情報", url: "https://www.dnc.ac.jp/kyotsu/shiken_jouhou/r9/index.html", checkedAt: "2026-11-22" },
    faculties: [
      {
        id: "main",
        name: "本試験",
        department: "",
        aliases: [],
        totalPoints: 0,
        mockExamIds: [],
        stages: [
          { label: "1日目", date: "2027-01-16", gather: "受験票で確認", periods: [] },
          { label: "2日目", date: "2027-01-17", gather: "受験票で確認", periods: [] },
        ],
        methods: [{ id: "general", name: "本試験", capacity: "—" }],
      },
    ],
  },
];

export interface TargetRef {
  admissionId: string;
  facultyId: string;
  methodId: string;
}

export function findTarget(t: TargetRef) {
  const admission = ADMISSIONS.find((a) => a.id === t.admissionId);
  const faculty = admission?.faculties.find((f) => f.id === t.facultyId);
  const method = faculty?.methods.find((m) => m.id === t.methodId);
  return admission && faculty && method ? { admission, faculty, method } : undefined;
}

/** 方式ごとの上書きを反映した時間割 */
export function periodsFor(stage: ExamStage, method: AdmissionMethod, stageIndex: number) {
  if (stageIndex !== 0 || !method.periodsOverride) return stage.periods;
  return stage.periods.map((p, i) => method.periodsOverride?.[i] ?? p);
}

/** 最初の試験日（カウントダウンに使う） */
export function firstExamDate(faculty: Faculty) {
  return faculty.stages[0]?.date;
}
