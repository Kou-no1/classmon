import React, { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// ★ここを自分のApps ScriptのURLに書き換えてください★
// ============================================================
const SCRIPT_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
// ============================================================

const POLL_INTERVAL = 10000;
const EXP_PER_LEVEL = 100;
const MAX_LEVEL = 99;

// ══════════════════════════════════════════════════════════════
// ★ 成長ステージ（5刻み、Lv1〜99、小→大）
// ══════════════════════════════════════════════════════════════
const GROWTH_STAGES = [
  { minLv:  1, maxLv:  4, char:"🥚",  size: 56, name:"たまご",        title:"うまれたて",          color:"#f9a8d4" },
  { minLv:  5, maxLv:  9, char:"🐣",  size: 64, name:"ひよこの たまご", title:"めざめびと",          color:"#fcd34d" },
  { minLv: 10, maxLv: 14, char:"🐥",  size: 72, name:"ちいさな ひよこ", title:"げんきもの",          color:"#fbbf24" },
  { minLv: 15, maxLv: 19, char:"🐦",  size: 80, name:"ことり",         title:"そらを みあげるもの",  color:"#60a5fa" },
  { minLv: 20, maxLv: 24, char:"🦆",  size: 88, name:"あひる",         title:"かわの ぼうけんか",   color:"#34d399" },
  { minLv: 25, maxLv: 29, char:"🦉",  size: 96, name:"ふくろう",       title:"ちしきの もりびと",   color:"#818cf8" },
  { minLv: 30, maxLv: 34, char:"🦚",  size:104, name:"くじゃく",       title:"いろどりの つわもの", color:"#10b981" },
  { minLv: 35, maxLv: 39, char:"🦋",  size:112, name:"ちょうちょ",     title:"へんしんの しゃ",     color:"#c084fc" },
  { minLv: 40, maxLv: 44, char:"🐬",  size:120, name:"いるか",         title:"うみの きらぼし",     color:"#38bdf8" },
  { minLv: 45, maxLv: 49, char:"🦁",  size:128, name:"らいおん",       title:"だいちの おう",       color:"#f59e0b" },
  { minLv: 50, maxLv: 54, char:"🐯",  size:136, name:"とら",           title:"もりの えいゆう",     color:"#ef4444" },
  { minLv: 55, maxLv: 59, char:"🦄",  size:144, name:"ゆにこーん",     title:"まほうの つかいて",   color:"#ec4899" },
  { minLv: 60, maxLv: 64, char:"🐉",  size:152, name:"りゅう",         title:"でんせつの めざめ",   color:"#7c3aed" },
  { minLv: 65, maxLv: 69, char:"🌟",  size:160, name:"ほしの りゅう",  title:"てんくうの せんし",   color:"#fbbf24" },
  { minLv: 70, maxLv: 74, char:"🔥",  size:168, name:"ほのおの りゅう", title:"えいえんの ほのお",  color:"#f97316" },
  { minLv: 75, maxLv: 79, char:"⚡",  size:176, name:"かみなりの かみ", title:"らいていの しゃ",    color:"#eab308" },
  { minLv: 80, maxLv: 84, char:"🌈",  size:184, name:"にじの かみさま", title:"こうごうしき もの",  color:"#06b6d4" },
  { minLv: 85, maxLv: 89, char:"✨",  size:192, name:"せいなる ひかり", title:"きわみの たっせいしゃ", color:"#8b5cf6" },
  { minLv: 90, maxLv: 94, char:"🌌",  size:200, name:"ほしぞらの かみ", title:"うちゅうの しゃ",   color:"#1d4ed8" },
  { minLv: 95, maxLv: 99, char:"👑",  size:208, name:"クラスもんおう", title:"でんせつの クラス",  color:"#d97706" },
];

function getStage(level) {
  return GROWTH_STAGES.find(s => level >= s.minLv && level <= s.maxLv) || GROWTH_STAGES[0];
}

// ごほうびが発動するレベル（5の倍数 + 99）
const REWARD_LEVELS = [5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,99];

// ── クラス構成 ────────────────────────────────────────────────
const GRADE_CONFIG = [
  { grade: 1, count: 3, color: "#ec4899", emoji: "🌸", type: "normal" },
  { grade: 2, count: 3, color: "#f97316", emoji: "🌼", type: "normal" },
  { grade: 3, count: 3, color: "#10b981", emoji: "🍀", type: "normal" },
  { grade: 4, count: 3, color: "#3b82f6", emoji: "🌊", type: "normal" },
  { grade: 5, count: 3, color: "#8b5cf6", emoji: "⭐", type: "normal" },
  { grade: 6, count: 3, color: "#d97706", emoji: "🏆", type: "normal" },
  { grade: "keyaki", count: 5, color: "#16a34a", emoji: "🌳", type: "special", label: "けやき" },
];

// ── クエストプール（エビデンスベース）────────────────────────
// 設計の根拠:
//   ・CASEL 5領域（自己理解/自己コントロール/思いやり/関わり/きめる力）
//   ・成長的マインドセット（Dweck）= 「やり抜く」チャレンジ課題
//   ・自己決定理論（自律性・有能感・関係性）
//   ・所属感／居場所づくり（school belonging）= 「いばしょ」
// 構造: QUEST_POOL[学年帯][カテゴリ][難易度] = [{t:本文, aim:ねらい}, ...]
//   学年帯: low(1-2年) / mid(3-4年) / high(5-6年) / keyaki(特別支援)
//   難易度: 1=かんたん(成功体験) / 2=チャレンジ / 3=リーダー(発信・継続)
const QUEST_POOL = {
  // ════════ 低学年（1〜2年）すべてひらがな・具体・短時間 ════════
  low: {
    personal: {
      1: [
        { t:"ともだちに じぶんから「おはよう」と いう", aim:"関わり" },
        { t:"つかった ものを もとの ばしょに もどす", aim:"自己コントロール" },
        { t:"きょう うれしかったことを 1つ おもいだす", aim:"自己理解" },
        { t:"せんせいの はなしを さいごまで きく", aim:"自己コントロール" },
      ],
      2: [
        { t:"だれかに「ありがとう」を つたえる", aim:"思いやり" },
        { t:"いつもより 1かい おおく てを あげる", aim:"やり抜く" },
        { t:"きょうの めあてを じぶんで 1つ きめる", aim:"きめる力" },
        { t:"こまっている ともだちに こえを かける", aim:"思いやり" },
      ],
      3: [
        { t:"はじめて はなす ともだちと 1つ おはなしする", aim:"関わり" },
        { t:"むずかしいことに「もう1かい やってみる」と いう", aim:"やり抜く" },
        { t:"じぶんの きもちを ことばで つたえる", aim:"自己理解" },
        { t:"クラスの だれかの いいところを みんなの まえで いう", aim:"いばしょ" },
      ],
    },
    group: {
      1: [
        { t:"グループで すきな いろを じゅんばんに いう", aim:"関わり" },
        { t:"みんなで すきな たべものを はなす", aim:"関わり" },
        { t:"となりの ひとの なまえを よんで あいさつ", aim:"関わり" },
        { t:"グループで おなじ ポーズを する", aim:"いばしょ" },
      ],
      2: [
        { t:"なかまの いいところを 1つずつ いう", aim:"思いやり" },
        { t:"グループで すきな あそびを 1つ きめる", aim:"きめる力" },
        { t:"みんなで「がんばろう」と こえを あわせる", aim:"いばしょ" },
        { t:"すきな どうぶつと そのわけを はなす", aim:"自己理解" },
      ],
      3: [
        { t:"グループだけの あいことばを かんがえる", aim:"関わり" },
        { t:"こまった ともだちを グループで たすける", aim:"思いやり" },
        { t:"みんなの いけんを きいて 1つに きめる", aim:"きめる力" },
        { t:"グループで ちいさな おうえんを かんがえる", aim:"いばしょ" },
      ],
    },
    class: {
      1: [
        { t:"チャイムの まえに せきに つく", aim:"自己コントロール" },
        { t:"みんなで げんきに あいさつを する", aim:"いばしょ" },
        { t:"ごみを 1つ ひろう", aim:"きめる力" },
        { t:"なまえを よばれたら げんきに へんじ", aim:"自己コントロール" },
      ],
      2: [
        { t:"クラスで「ありがとう」を 10かい あつめる", aim:"思いやり" },
        { t:"そうじの じかん さいごまで がんばる", aim:"やり抜く" },
        { t:"ろうかを しずかに あるく", aim:"自己コントロール" },
        { t:"きゅうしょくを のこさず たべる", aim:"やり抜く" },
      ],
      3: [
        { t:"クラスぜんいんが 1かいずつ てを あげる", aim:"いばしょ" },
        { t:"みんなで きょうしつを ぴかぴかに する", aim:"やり抜く" },
        { t:"クラスの めあてを こえを あわせて よむ", aim:"いばしょ" },
        { t:"だれも ひとりに ならないように こえかけ", aim:"思いやり" },
      ],
    },
  },

  // ════════ 中学年（3〜4年）視点取得・ふりかえり・協力 ════════
  mid: {
    personal: {
      1: [
        { t:"友だちの いいところを 1つ 見つける", aim:"思いやり" },
        { t:"自分の つくえの 中を 1分 かたづける", aim:"自己コントロール" },
        { t:"今日 学んだことを 1つ ふりかえる", aim:"自己理解" },
        { t:"朝、自分から あいさつを する", aim:"関わり" },
      ],
      2: [
        { t:"「ありがとう」を 相手の目を見て 伝える", aim:"関わり" },
        { t:"今日の めあてを 決めて、夜に ふりかえる", aim:"きめる力" },
        { t:"こまっている人に 自分から 声をかける", aim:"思いやり" },
        { t:"うまくいかなくても「次は こうしよう」と 考える", aim:"やり抜く" },
      ],
      3: [
        { t:"苦手なことに 1回 ちょうせんしてみる", aim:"やり抜く" },
        { t:"自分の気もちを 落ちついて ことばで 伝える", aim:"自己コントロール" },
        { t:"クラスの役わりを 進んで 引きうける", aim:"きめる力" },
        { t:"あまり 話さない友だちに 話しかける", aim:"いばしょ" },
      ],
    },
    group: {
      1: [
        { t:"グループで 好きな季節と わけを 話す", aim:"自己理解" },
        { t:"なかまの名前の いいところを 言い合う", aim:"思いやり" },
        { t:"グループの あいことばを 決める", aim:"関わり" },
        { t:"順番に 最近 楽しかったことを 話す", aim:"関わり" },
      ],
      2: [
        { t:"全員が 1回は 話せるように 順番を 回す", aim:"いばしょ" },
        { t:"グループの めあてを 話し合って 決める", aim:"きめる力" },
        { t:"意見が ちがっても さいごまで 聞く", aim:"思いやり" },
        { t:"なかまを 1人ずつ ほめる時間を つくる", aim:"いばしょ" },
      ],
      3: [
        { t:"こまった なかまを グループで 助ける", aim:"思いやり" },
        { t:"みんなの考えを まとめて 1つの答えにする", aim:"きめる力" },
        { t:"役わりを 分けて 協力して やりとげる", aim:"関わり" },
        { t:"けんかを 話し合いで 解決してみる", aim:"自己コントロール" },
      ],
    },
    class: {
      1: [
        { t:"チャイムの前に 全員 席につく", aim:"自己コントロール" },
        { t:"話している人の 方を見て 聞く", aim:"思いやり" },
        { t:"朝の あいさつを 元気に そろえる", aim:"いばしょ" },
        { t:"落ちている ごみを 進んで ひろう", aim:"きめる力" },
      ],
      2: [
        { t:"クラスで「ありがとう」を 30回 あつめる", aim:"思いやり" },
        { t:"そうじを だれも さぼらず やりきる", aim:"やり抜く" },
        { t:"授業の さいごまで しっかり 聞く", aim:"自己コントロール" },
        { t:"給食を 残さず みんなで 食べきる", aim:"やり抜く" },
      ],
      3: [
        { t:"班会ぎを 自分たちで 進める", aim:"きめる力" },
        { t:"クラスの目ひょうを 全員で 声に出す", aim:"いばしょ" },
        { t:"一人に なっている子に みんなで 声かけ", aim:"いばしょ" },
        { t:"先生に 感しゃの気もちを 伝える時間を つくる", aim:"関わり" },
      ],
    },
  },

  // ════════ 高学年（5〜6年）リーダーシップ・メタ認知・貢献 ════════
  high: {
    personal: {
      1: [
        { t:"今日 がんばったことを 1つ 書きとめる", aim:"自己理解" },
        { t:"使った場所を 自分から 整える", aim:"自己コントロール" },
        { t:"クラスの誰かの良さを 一言 伝える", aim:"思いやり" },
        { t:"自分から 進んで あいさつする", aim:"関わり" },
      ],
      2: [
        { t:"今日の目標を 決め、夜に ふり返る", aim:"きめる力" },
        { t:"失敗を「学びのチャンス」と とらえ直す", aim:"やり抜く" },
        { t:"自分の感情に気づき、落ちついて 対応する", aim:"自己コントロール" },
        { t:"困っている人に 自分から 手を さしのべる", aim:"思いやり" },
      ],
      3: [
        { t:"苦手なことに あえて挑戦し、最後までやる", aim:"やり抜く" },
        { t:"自分の意見を 理由をつけて 堂々と 伝える", aim:"きめる力" },
        { t:"クラスのために できる役割を 自分で見つけて動く", aim:"いばしょ" },
        { t:"立場のちがう人の 気持ちを 想像してみる", aim:"思いやり" },
      ],
    },
    group: {
      1: [
        { t:"最近の出来事を 順番に 共有する", aim:"関わり" },
        { t:"なかまの強みを 1人ずつ 伝える", aim:"思いやり" },
        { t:"グループの ルールを 1つ 決める", aim:"きめる力" },
        { t:"全員の名前を 呼んで 始める", aim:"いばしょ" },
      ],
      2: [
        { t:"全員が発言できるよう 進行を 工夫する", aim:"いばしょ" },
        { t:"異なる意見を まとめて 合意をつくる", aim:"きめる力" },
        { t:"なかまの良い行動を 具体的に ほめる", aim:"思いやり" },
        { t:"役割を分担して 1つのことを やりとげる", aim:"関わり" },
      ],
      3: [
        { t:"意見の対立を 話し合いで 解決する", aim:"自己コントロール" },
        { t:"苦手な子の強みを 活かせる役割を 提案する", aim:"思いやり" },
        { t:"グループの目標と計画を 立てて 実行する", aim:"きめる力" },
        { t:"難しい課題に みんなで あきらめず 取り組む", aim:"やり抜く" },
      ],
    },
    class: {
      1: [
        { t:"切りかえの合図で すぐ 行動する", aim:"自己コントロール" },
        { t:"発言する人を 全員で しっかり 聞く", aim:"思いやり" },
        { t:"教室の気になる場所を 進んで 整える", aim:"きめる力" },
        { t:"朝の あいさつを クラスで そろえる", aim:"いばしょ" },
      ],
      2: [
        { t:"クラスで 感謝の言葉を 30回 集める", aim:"思いやり" },
        { t:"当番や そうじを 全員で やりきる", aim:"やり抜く" },
        { t:"授業に 全員が 1回は 参加・発言する", aim:"いばしょ" },
        { t:"目標を 全員で 声に出して 確認する", aim:"いばしょ" },
      ],
      3: [
        { t:"学級会を 子どもたちだけで 運営する", aim:"きめる力" },
        { t:"クラスの課題を 話し合いで 解決する", aim:"自己コントロール" },
        { t:"一人ぼっちを つくらない工夫を 全員で 実行", aim:"いばしょ" },
        { t:"下級生や先生に 感謝を 行動で 表す", aim:"関わり" },
      ],
    },
  },

  // ════════ けやき（特別支援）具体・予測可能・成功体験・選択 ════════
  // 難易度は「学年」ではなく、一人ひとりの実態に合わせて先生が選ぶ目安
  keyaki: {
    personal: {
      1: [
        { t:"すきな いろの シールを 1つ えらぶ", aim:"きめる力" },
        { t:"せんせいと「おはよう」の あいさつ", aim:"関わり" },
        { t:"つかった ものを かごに もどす", aim:"自己コントロール" },
        { t:"きょうの きぶんを かおマークで えらぶ", aim:"自己理解" },
      ],
      2: [
        { t:"すきな あそびを じぶんで えらんで つたえる", aim:"きめる力" },
        { t:"「ありがとう」か「どうぞ」を 1かい いう", aim:"関わり" },
        { t:"ふか呼吸を 3かい して おちつく", aim:"自己コントロール" },
        { t:"がんばったことを 1つ せんせいに はなす", aim:"自己理解" },
      ],
      3: [
        { t:"はじめてのことに 1かい チャレンジ", aim:"やり抜く" },
        { t:"こまったとき「てつだって」と いえる", aim:"きめる力" },
        { t:"ともだちに じぶんから かかわる", aim:"関わり" },
        { t:"さいごまで おちついて とりくむ", aim:"やり抜く" },
      ],
    },
    group: {
      1: [
        { t:"なかまと おなじ どうさを まねする", aim:"関わり" },
        { t:"じゅんばんを まって こうたいする", aim:"自己コントロール" },
        { t:"なかまに「どうぞ」を する", aim:"思いやり" },
        { t:"みんなで おなじ うたを うたう", aim:"いばしょ" },
      ],
      2: [
        { t:"すきな ものを なかまに 1つ つたえる", aim:"関わり" },
        { t:"なかまの いいところを 1つ いう", aim:"思いやり" },
        { t:"2人で 1つの ことを きょうりょくする", aim:"関わり" },
        { t:"グループの あいことばを いっしょに いう", aim:"いばしょ" },
      ],
      3: [
        { t:"なかまを さそって いっしょに あそぶ", aim:"関わり" },
        { t:"こまった なかまを てつだう", aim:"思いやり" },
        { t:"みんなで 1つの ことを きめる", aim:"きめる力" },
        { t:"やくわりを もって さいごまで やる", aim:"やり抜く" },
      ],
    },
    class: {
      1: [
        { t:"なまえを よばれたら へんじを する", aim:"自己コントロール" },
        { t:"あいさつを みんなで する", aim:"いばしょ" },
        { t:"じぶんの せきに つく", aim:"自己コントロール" },
        { t:"ごみを 1つ かごに いれる", aim:"きめる力" },
      ],
      2: [
        { t:"みんなで「ありがとう」を つたえる", aim:"思いやり" },
        { t:"かたづけを さいごまで がんばる", aim:"やり抜く" },
        { t:"しずかに ならんで あるく", aim:"自己コントロール" },
        { t:"きゅうしょくを じぶんの ぶん たべる", aim:"やり抜く" },
      ],
      3: [
        { t:"クラスの おてつだいを 1つ やる", aim:"きめる力" },
        { t:"みんなで めあてを こえに だす", aim:"いばしょ" },
        { t:"ひとりの ともだちに こえを かける", aim:"思いやり" },
        { t:"クラスぜんいんで 1つの ことを やりとげる", aim:"いばしょ" },
      ],
    },
  },
};

// 学年帯の判定（classId → low / mid / high / keyaki）
function bandOf(classId) {
  if (!classId) return "low";
  if (classId.indexOf("keyaki") === 0) return "keyaki";
  const g = Number(classId.split("-")[0]);
  if (g <= 2) return "low";
  if (g <= 4) return "mid";
  return "high";
}
const BAND_LABEL = { low:"ていがくねん", mid:"ちゅうがくねん", high:"こうがくねん", keyaki:"けやきがっきゅう" };

// ── API ───────────────────────────────────────────────────────
async function apiGet(classId) {
  const res = await fetch(`${SCRIPT_URL}?class=${classId}`);
  return res.json();
}
async function apiPost(payload) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // GASのCORSプリフライト回避（GAS側はe.postData.contentsで読むので問題なし）
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ══════════════════════════════════════════════════════════════
// UI コンポーネント
// ══════════════════════════════════════════════════════════════

function Confetti({ active, big = false }) {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    if (!active) return;
    const colors = ["#FFD700","#FF6B9D","#7EC8E3","#A8E6CF","#FFB347","#DDA0DD","#ff4757","#2ed573"];
    const count = big ? 80 : 40;
    setParticles(Array.from({ length: count }, (_, i) => ({
      id: i, x: Math.random() * 100,
      size: (big ? 8 : 6) + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.5 ? "circle" : "rect",
      delay: big ? Math.random() * 0.5 : 0,
    })));
    setTimeout(() => setParticles([]), big ? 3500 : 2400);
  }, [active]);
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9999, overflow:"hidden" }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position:"absolute", left:`${p.x}%`, top:"-10%",
          width:p.size, height:p.size,
          borderRadius:p.shape==="circle"?"50%":"2px",
          background:p.color,
          animation:`fall ${big?3:2.2}s ${p.delay||0}s ease-in forwards`,
        }}/>
      ))}
      <style>{`@keyframes fall{to{transform:translateY(115vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}

function LevelUpModal({ level, onClose }) {
  const stage = getStage(level);
  const prevStage = getStage(level - 1);
  const evolved = stage.char !== prevStage.char;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:10000, background:"rgba(15,10,40,0.8)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81)", borderRadius:28, padding:"36px 28px", textAlign:"center", maxWidth:340, width:"100%", border:"2px solid #818cf8", boxShadow:"0 0 60px rgba(129,140,248,0.4)", animation:"popIn 0.4s cubic-bezier(.34,1.56,.64,1) both" }}>
        <div style={{ fontSize:13, color:"#a5b4fc", fontWeight:700, letterSpacing:2, marginBottom:12 }}>✨ レベルアップ！ ✨</div>
        <div style={{ fontSize:stage.size * 0.9, lineHeight:1, marginBottom:10, animation:"spinPop 0.6s ease both" }}>{stage.char}</div>
        {evolved && (
          <div style={{ display:"inline-block", background:"linear-gradient(135deg,#f59e0b,#ef4444)", color:"#fff", fontSize:13, fontWeight:800, padding:"4px 16px", borderRadius:999, marginBottom:10 }}>
            🎊 しんか した！
          </div>
        )}
        <div style={{ fontSize:30, fontWeight:900, color:"#fff", marginBottom:4 }}>Lv.{level}</div>
        <div style={{ fontSize:19, color:"#c7d2fe", fontWeight:700, marginBottom:6 }}>{stage.name}</div>
        <div style={{ display:"inline-block", background:"rgba(129,140,248,0.2)", border:"1px solid #6366f1", borderRadius:999, padding:"4px 16px", fontSize:13, color:"#a5b4fc", marginBottom:24 }}>
          称号：{stage.title}
        </div>
        <button onClick={onClose} style={{ display:"block", width:"100%", padding:"13px", borderRadius:14, border:"none", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:17, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 20px rgba(99,102,241,0.5)" }}>
          やったー！ 🎉
        </button>
      </div>
      <style>{`@keyframes popIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}} @keyframes spinPop{0%{transform:scale(0) rotate(-180deg)}100%{transform:scale(1) rotate(0deg)}}`}</style>
    </div>
  );
}

function RewardModal({ level, rewardText, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:10001, background:"rgba(30,10,10,0.85)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"linear-gradient(135deg,#7c2d12,#dc2626)", borderRadius:28, padding:"36px 28px", textAlign:"center", maxWidth:340, width:"100%", border:"2px solid #fca5a5", boxShadow:"0 0 60px rgba(239,68,68,0.5)", animation:"popIn 0.4s cubic-bezier(.34,1.56,.64,1) both" }}>
        <div style={{ fontSize:56, marginBottom:10 }}>🎁</div>
        <div style={{ fontSize:13, color:"#fca5a5", fontWeight:700, letterSpacing:2, marginBottom:8 }}>ごほうび かいほう！</div>
        <div style={{ fontSize:24, fontWeight:900, color:"#fff", marginBottom:16 }}>Lv.{level} たっせい！</div>
        <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:16, padding:"16px", fontSize:16, color:"#fff", fontWeight:700, lineHeight:1.7, marginBottom:24 }}>
          {rewardText || "せんせいから すてきな ごほうびが あるよ！"}
        </div>
        <button onClick={onClose} style={{ display:"block", width:"100%", padding:"13px", borderRadius:14, border:"none", background:"linear-gradient(135deg,#f59e0b,#ef4444)", color:"#fff", fontSize:17, fontWeight:800, cursor:"pointer" }}>
          わーい！ 🎊
        </button>
      </div>
    </div>
  );
}

function FloatingChar({ level }) {
  const stage = getStage(level);
  return (
    <div style={{ textAlign:"center", animation:"float 2.4s ease-in-out infinite" }}>
      <div style={{ fontSize:stage.size, lineHeight:1, filter:`drop-shadow(0 8px 24px ${stage.color}88)` }}>{stage.char}</div>
      <div style={{ marginTop:10, fontSize:15, fontWeight:800, color:stage.color }}>{stage.name}</div>
      <div style={{ display:"inline-block", marginTop:5, background:`${stage.color}22`, border:`1.5px solid ${stage.color}66`, borderRadius:999, padding:"3px 14px", fontSize:12, color:stage.color, fontWeight:700 }}>
        称号：{stage.title}
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}`}</style>
    </div>
  );
}

function StreakBadge({ streak }) {
  if (!streak || streak < 2) return null;
  const fire = streak >= 7 ? "🔥🔥🔥" : streak >= 3 ? "🔥🔥" : "🔥";
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"linear-gradient(135deg,#fef3c7,#fde68a)", border:"2px solid #f59e0b", borderRadius:999, padding:"4px 14px", fontSize:13, fontWeight:800, color:"#92400e", marginTop:8 }}>
      {fire} {streak}にち れんぞく クリア！
    </div>
  );
}

function QuestDropdown({ pool, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position:"relative", display:"inline-block" }}>
      <button onClick={() => setOpen(!open)} style={{ fontSize:11, padding:"3px 8px", borderRadius:6, border:"1px solid #c4b5fd", background:"#f5f3ff", color:"#7c3aed", cursor:"pointer", whiteSpace:"nowrap" }}>▼ リストから えらぶ</button>
      {open && (
        <div style={{ position:"absolute", right:0, top:"110%", zIndex:100, minWidth:260, background:"#fff", border:"1.5px solid #ddd6fe", borderRadius:12, boxShadow:"0 8px 24px rgba(139,92,246,0.13)", padding:6 }}>
          {pool.map((q,i) => (
            <button key={i} onClick={() => { onSelect(q.t); setOpen(false); }} style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"center", width:"100%", textAlign:"left", background:"none", border:"none", borderRadius:8, padding:"7px 10px", fontSize:12, cursor:"pointer", color:"#4c1d95", lineHeight:1.5 }}
              onMouseEnter={e=>e.currentTarget.style.background="#f5f3ff"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <span style={{ flex:1 }}>{q.t}</span>
              <span style={{ flexShrink:0, fontSize:9, fontWeight:700, color:"#7c3aed", background:"#ede9fe", borderRadius:6, padding:"2px 6px" }}>{q.aim}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Bubbles() {
  const colors = ["#ddd6fe","#fbcfe8","#bfdbfe","#a7f3d0","#fde68a","#fed7aa"];
  const bubbles = useRef(Array.from({ length: 14 }, (_, i) => ({ id:i, size:40+Math.random()*90, left:Math.random()*100, color:colors[Math.floor(Math.random()*colors.length)], duration:8+Math.random()*12, delay:-Math.random()*15 }))).current;
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
      {bubbles.map(b => <div key={b.id} style={{ position:"absolute", width:b.size, height:b.size, left:`${b.left}%`, bottom:"-20%", borderRadius:"50%", background:b.color, opacity:0.18, animation:`bubble ${b.duration}s ${b.delay}s linear infinite` }}/>)}
      <style>{`@keyframes bubble{0%{transform:translateY(0) scale(0.8);opacity:0}10%{opacity:0.18}90%{opacity:0.18}100%{transform:translateY(-120vh) scale(1.1);opacity:0}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TOP PAGE
// ══════════════════════════════════════════════════════════════
function TopPage({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  const S = {
    page: { minHeight:"100vh", background:"linear-gradient(160deg,#fdf4ff 0%,#fef9ee 50%,#f0fdf4 100%)", fontFamily:"'Zen Maru Gothic','M PLUS Rounded 1c','Noto Sans JP',sans-serif", position:"relative" },
    section: { maxWidth:900, margin:"0 auto", padding:"0 16px 60px", position:"relative", zIndex:1 },
    gradeLabel: { display:"inline-flex", alignItems:"center", gap:8, fontSize:18, fontWeight:900, color:"#1e1b4b", marginBottom:14, marginTop:32 },
    dot: { width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:"#fff" },
    grid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 },
  };
  return (
    <div style={S.page}>
      <Bubbles/>
      <style>{`@keyframes mascotFloat{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-14px) rotate(2deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ textAlign:"center", padding:"48px 20px 36px", position:"relative", zIndex:1 }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#fff", border:"2px solid #ddd6fe", borderRadius:999, padding:"6px 18px", fontSize:13, color:"#8b5cf6", fontWeight:700, marginBottom:20, animation:"fadeUp 0.5s ease both" }}>🌱 まいにちの がんばりで クラスが そだつ！</div>
        <div style={{ fontSize:80, lineHeight:1, display:"inline-block", animation:"mascotFloat 3s ease-in-out infinite", filter:"drop-shadow(0 8px 20px rgba(139,92,246,0.25))", marginBottom:8 }}>🥚</div>
        <h1 style={{ fontSize:"clamp(32px,7vw,64px)", fontWeight:900, margin:"12px 0 8px", background:"linear-gradient(135deg,#7c3aed 0%,#db2777 50%,#f59e0b 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", fontFamily:"serif" }}>そだて！クラスモン</h1>
        <p style={{ fontSize:"clamp(13px,2.5vw,16px)", color:"#7c6fac", lineHeight:1.7 }}>クラスみんなで クエストに ちょうせんして<br/>いっしょに キャラクターを そだてよう！</p>
      </div>
      <div style={S.section}>
        <div style={{ textAlign:"center", fontSize:"clamp(18px,4vw,28px)", fontWeight:900, color:"#1e1b4b", marginBottom:8 }}>🏫 じぶんの <span style={{ color:"#8b5cf6" }}>クラス</span>を えらぼう</div>
        {GRADE_CONFIG.map(({ grade, count, color, emoji, type, label }) => (
          <div key={grade}>
            {type === "special" && (
              <div style={{ display:"flex", alignItems:"center", gap:12, margin:"32px 0 16px" }}>
                <div style={{ flex:1, height:2, background:"linear-gradient(90deg,#bbf7d0,transparent)", borderRadius:999 }}/>
                <div style={{ fontSize:13, color:"#16a34a", fontWeight:700, whiteSpace:"nowrap" }}>🌳 とくべつしえんがっきゅう</div>
                <div style={{ flex:1, height:2, background:"linear-gradient(90deg,transparent,#bbf7d0)", borderRadius:999 }}/>
              </div>
            )}
            <div style={S.gradeLabel}>
              <div style={{ ...S.dot, background:color }}>{emoji}</div>
              {type === "special" ? label : `${grade}ねん`}
            </div>
            <div style={S.grid}>
              {Array.from({ length: count }, (_, i) => i + 1).map(cls => {
                const id = type === "special" ? `keyaki-${cls}` : `${grade}-${cls}`;
                const isHov = hovered === id;
                return (
                  <div key={cls} style={{ background:"#fff", borderRadius:20, border:`2px solid ${isHov?color:"#ede9fe"}`, padding:"16px 12px", textAlign:"center", transform:isHov?"translateY(-4px)":"none", boxShadow:isHov?`0 8px 24px ${color}33`:"0 2px 8px rgba(139,92,246,0.06)", transition:"all 0.2s" }}
                    onMouseEnter={()=>setHovered(id)} onMouseLeave={()=>setHovered(null)}>
                    <div style={{ fontSize:15, fontWeight:900, color:"#1e1b4b", marginBottom:12 }}>
                      {type==="special"?`けやき ${cls}くみ`:`${grade}ねん ${cls}くみ`}
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>onSelect(id,"student")} style={{ flex:1, padding:"8px 4px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#8b5cf6,#ec4899)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:"0 3px 10px rgba(139,92,246,0.3)" }}>😊 せいと</button>
                      <button onClick={()=>onSelect(id,"teacher")} style={{ flex:1, padding:"8px 4px", borderRadius:10, border:"1.5px solid #bae6fd", background:"#f0f9ff", color:"#0369a1", fontSize:12, fontWeight:700, cursor:"pointer" }}>📋 せんせい</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ position:"relative", zIndex:1, textAlign:"center", padding:"20px", color:"#9ca3af", fontSize:12, borderTop:"1px solid #f3f4f6" }}>🥚 そだて！クラスモン &nbsp;|&nbsp; みんなで たのしく がんばろう！</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView]     = useState("top");
  const [classId, setClassId] = useState(null);
  const [serverData, setServerData]     = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [nextQuests, setNextQuests]     = useState({ personal:"", group:"", class:"" });
  const [reward, setReward]             = useState("");
  const [teacherSaved, setTeacherSaved] = useState(false);
  const [confetti, setConfetti]         = useState(false);
  const [bigConfetti, setBigConfetti]   = useState(false);
  const [levelUpModal, setLevelUpModal] = useState(null);
  const [rewardModal, setRewardModal]   = useState(null);
  const [difficulty, setDifficulty]     = useState({ personal:1, group:1, class:1 });

  const fetchData = useCallback(async () => {
    if (!classId) return;
    try {
      const data = await apiGet(classId);
      setServerData(prev => {
        if (prev) {
          const oldLv = Math.min(Math.floor(prev.exp/EXP_PER_LEVEL)+1, MAX_LEVEL);
          const newLv = Math.min(Math.floor(data.exp/EXP_PER_LEVEL)+1, MAX_LEVEL);
          if (newLv > oldLv) {
            setBigConfetti(true); setTimeout(()=>setBigConfetti(false),100);
            setLevelUpModal(newLv);
            if (REWARD_LEVELS.includes(newLv)) setTimeout(()=>setRewardModal(newLv), 2200);
          }
        }
        return data;
      });
      setNextQuests({ personal:data.quest_personal, group:data.quest_group, class:data.quest_class });
      setReward(data.reward||"");
      setError(null);
    } catch { setError("データを よみこめませんでした。"); }
  }, [classId]);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    fetchData().finally(()=>setLoading(false));
    const t = setInterval(fetchData, POLL_INTERVAL);
    return ()=>clearInterval(t);
  }, [classId, fetchData]);

  function handleSelect(id, mode) { setClassId(id); setView(mode); }

  async function completeQuest(questKey) {
    if (!serverData || serverData[`done_${questKey}`]) return;
    const newExp = serverData.exp + 20;
    const oldLv  = Math.min(Math.floor(serverData.exp/EXP_PER_LEVEL)+1, MAX_LEVEL);
    const newLv  = Math.min(Math.floor(newExp/EXP_PER_LEVEL)+1, MAX_LEVEL);
    setServerData(d => ({ ...d, [`done_${questKey}`]:true, exp:newExp }));
    setConfetti(true); setTimeout(()=>setConfetti(false),100);
    if (newLv > oldLv) {
      setBigConfetti(true); setTimeout(()=>setBigConfetti(false),100);
      setTimeout(()=>{
        setLevelUpModal(newLv);
        if (REWARD_LEVELS.includes(newLv)) setTimeout(()=>setRewardModal(newLv),2200);
      }, 900);
    }
    await apiPost({ action:"completeQuest", class:classId, questKey });
  }

  async function saveNextQuests() {
    await apiPost({ action:"saveQuests", class:classId, quests:nextQuests });
    setTeacherSaved(true); setTimeout(()=>setTeacherSaved(false),2000);
    await fetchData();
  }
  async function saveReward() { await apiPost({ action:"saveReward", class:classId, reward }); }
  async function resetDay() {
    if (!window.confirm("きょうの クエストを リセットしますか？")) return;
    await apiPost({ action:"resetDay", class:classId }); await fetchData();
  }
  function randomize() {
    const b = bandOf(classId);
    const pick = cat => {
      const arr = (QUEST_POOL[b] && QUEST_POOL[b][cat] && QUEST_POOL[b][cat][difficulty[cat]]) || [];
      return arr.length ? arr[Math.floor(Math.random()*arr.length)].t : "";
    };
    setNextQuests({ personal:pick("personal"), group:pick("group"), class:pick("class") });
  }

  const level      = serverData ? Math.min(Math.floor(serverData.exp/EXP_PER_LEVEL)+1, MAX_LEVEL) : 1;
  const expInLevel = serverData ? serverData.exp % EXP_PER_LEVEL : 0;
  const doneCount  = serverData ? ["personal","group","class"].filter(k=>serverData[`done_${k}`]).length : 0;
  const streak     = serverData?.streak || 0;
  const stage      = getStage(level);
  const nextRewardLv = REWARD_LEVELS.find(lv=>lv>level);

  const questConfig = [
    { key:"personal", label:"じぶんの クエスト",   icon:"⭐", color:"#fde68a", accent:"#f59e0b" },
    { key:"group",    label:"グループの クエスト", icon:"👫", color:"#bfdbfe", accent:"#3b82f6" },
    { key:"class",    label:"クラスの クエスト",   icon:"🏫", color:"#bbf7d0", accent:"#10b981" },
  ];
  const S = {
    app:  { minHeight:"100vh", background:"linear-gradient(135deg,#fdf4ff 0%,#fef9ee 50%,#f0fdf4 100%)", fontFamily:"'Zen Maru Gothic','M PLUS Rounded 1c','Noto Sans JP',sans-serif" },
    card: { background:"#fff", borderRadius:20, padding:"16px 20px", boxShadow:"0 2px 12px rgba(139,92,246,0.08)", border:"1.5px solid #ede9fe" },
  };

  if (view==="top") return <TopPage onSelect={handleSelect}/>;

  // ── STUDENT ───────────────────────────────────────────────────
  if (view==="student") {
    const gradeNum   = classId?.split("-")[0];
    const clsNum     = classId?.split("-")[1];
    const isKeyaki   = gradeNum==="keyaki";
    const cfg        = isKeyaki ? GRADE_CONFIG.find(g=>g.grade==="keyaki") : GRADE_CONFIG.find(g=>g.grade===Number(gradeNum))||GRADE_CONFIG[0];
    const classLabel = isKeyaki ? `けやき ${clsNum}くみ` : `${gradeNum}ねん${clsNum}くみ`;

    return (
      <div style={S.app}>
        <Confetti active={confetti}/>
        <Confetti active={bigConfetti} big/>
        {levelUpModal && <LevelUpModal level={levelUpModal} onClose={()=>setLevelUpModal(null)}/>}
        {rewardModal  && <RewardModal  level={rewardModal}  rewardText={reward} onClose={()=>setRewardModal(null)}/>}

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${stage.color} 0%,#7c3aed 100%)`, padding:"16px 20px", color:"#fff" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", maxWidth:480, margin:"0 auto" }}>
            <button onClick={()=>setView("top")} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", borderRadius:10, padding:"4px 12px", cursor:"pointer", fontSize:13 }}>← クラス</button>
            <div style={{ textAlign:"center", flex:1 }}>
              <div style={{ fontSize:11, opacity:0.85 }}>{classLabel}　クラスの レベル</div>
              <div style={{ fontSize:32, fontWeight:900, lineHeight:1 }}>{loading&&!serverData?"...":`Lv.${level}`}</div>
              <div style={{ fontSize:11, opacity:0.8 }}>{stage.name}　{stage.title}</div>
            </div>
            <div style={{ fontSize:22 }}>✨</div>
          </div>
          <div style={{ maxWidth:480, margin:"8px auto 0" }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, opacity:0.8, marginBottom:4 }}>
              <span>EXP {expInLevel}/{EXP_PER_LEVEL}</span>
              {nextRewardLv && <span>🎁 つぎの ごほうび Lv.{nextRewardLv}</span>}
            </div>
            <div style={{ background:"rgba(255,255,255,0.25)", borderRadius:999, height:13, overflow:"hidden" }}>
              <div style={{ width:`${(expInLevel/EXP_PER_LEVEL)*100}%`, height:"100%", background:"linear-gradient(90deg,#fde68a,#fbbf24)", borderRadius:999, transition:"width 0.7s", boxShadow:"0 0 8px rgba(251,191,36,0.7)" }}/>
            </div>
          </div>
        </div>

        <div style={{ maxWidth:480, margin:"0 auto", padding:"20px 16px" }}>
          {error && <div style={{ ...S.card, marginBottom:16, textAlign:"center", color:"#dc2626", fontSize:13 }}>⚠️ {error}</div>}

          {/* Character */}
          <div style={{ ...S.card, textAlign:"center", marginBottom:20, padding:"28px 20px", border:`2px solid ${stage.color}44` }}>
            <FloatingChar level={level}/>
            <div style={{ marginTop:14, fontSize:13, color:"#8b5cf6" }}>きょうの クリア: <strong>{doneCount}/3</strong> 🎯</div>
            <StreakBadge streak={streak}/>
          </div>

          {/* Quests */}
          <div style={{ fontSize:15, fontWeight:800, color:"#6d28d9", marginBottom:12 }}>📜 きょうの クエスト</div>
          {loading&&!serverData ? (
            <div style={{ ...S.card, textAlign:"center", color:"#8b5cf6", padding:"32px" }}>よみこんでいます… 🌀</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {questConfig.map(({ key, label, icon, color, accent }) => {
                const isDone = serverData?.[`done_${key}`];
                return (
                  <div key={key} style={{ ...S.card, borderColor:isDone?"#a7f3d0":"#ede9fe", background:isDone?"#f0fdf4":"#fff", transition:"all 0.3s" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                      <div style={{ width:44, height:44, borderRadius:14, background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:accent, marginBottom:3 }}>{label}</div>
                        <div style={{ fontSize:14, color:"#374151", lineHeight:1.5, fontWeight:600 }}>{serverData?.[`quest_${key}`]||""}</div>
                      </div>
                    </div>
                    <div style={{ marginTop:12, textAlign:"right" }}>
                      <button onClick={()=>completeQuest(key)} disabled={isDone} style={{ padding:"8px 22px", borderRadius:12, border:"none", background:isDone?"#d1fae5":`linear-gradient(135deg,${accent},#8b5cf6)`, color:isDone?"#065f46":"#fff", fontWeight:800, fontSize:14, cursor:isDone?"default":"pointer", boxShadow:isDone?"none":`0 3px 12px ${accent}55`, transition:"all 0.3s" }}>
                        {isDone?"✅ クリア！":"できた！ ✨"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {doneCount===3 && (
            <div style={{ ...S.card, marginTop:20, textAlign:"center", background:"linear-gradient(135deg,#fef9ee,#fdf4ff)", borderColor:"#fbbf24" }}>
              <div style={{ fontSize:36, marginBottom:6 }}>🎉</div>
              <div style={{ fontSize:16, fontWeight:800, color:"#7c3aed" }}>ぜんぶ クリア！</div>
              <div style={{ fontSize:13, color:"#a78bfa", marginTop:4 }}>すごい！ きょうも よくがんばった！</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── TEACHER ───────────────────────────────────────────────────
  if (view==="teacher") {
    const gradeNum   = classId?.split("-")[0];
    const clsNum     = classId?.split("-")[1];
    const isKeyaki   = gradeNum==="keyaki";
    const classLabel = isKeyaki ? `けやき ${clsNum}くみ` : `${gradeNum}ねん${clsNum}くみ`;

    return (
      <div style={S.app}>
        <div style={{ background:"linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%)", padding:"16px 20px", color:"#fff" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", maxWidth:560, margin:"0 auto" }}>
            <button onClick={()=>setView("top")} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", borderRadius:10, padding:"4px 12px", cursor:"pointer", fontSize:13 }}>← クラス</button>
            <div style={{ fontWeight:900, fontSize:17 }}>📋 {classLabel}　せんせい</div>
            <div style={{ fontSize:22 }}>🏫</div>
          </div>
        </div>
        <div style={{ maxWidth:560, margin:"0 auto", padding:"20px 16px" }}>
          {error && <div style={{ ...S.card, marginBottom:16, textAlign:"center", color:"#dc2626", fontSize:13 }}>⚠️ {error}</div>}

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
            {[
              { label:"クラスレベル", value:loading&&!serverData?"...":`Lv.${level}`, icon:"⭐" },
              { label:"そうEXP",      value:loading&&!serverData?"...":serverData?.exp??0, icon:"✨" },
              { label:"クリア（本日）", value:`${doneCount}/3`, icon:"🎯" },
            ].map((s,i) => (
              <div key={i} style={{ ...S.card, textAlign:"center", padding:"14px 10px" }}>
                <div style={{ fontSize:24, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:18, fontWeight:900, color:"#1e1b4b" }}>{s.value}</div>
                <div style={{ fontSize:10, color:"#6b7280", marginTop:2, lineHeight:1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Stage info */}
          <div style={{ ...S.card, marginBottom:16, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:48 }}>{stage.char}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#1e1b4b" }}>{stage.name}</div>
              <div style={{ fontSize:12, color:stage.color, fontWeight:700 }}>称号：{stage.title}</div>
              <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>
                EXP {expInLevel}/{EXP_PER_LEVEL}　{nextRewardLv?`🎁 次のごほうび Lv.${nextRewardLv}`:"🏆 さいこうレベル！"}
              </div>
              <div style={{ background:"#e9d5ff", borderRadius:999, height:8, overflow:"hidden", marginTop:6 }}>
                <div style={{ width:`${(expInLevel/EXP_PER_LEVEL)*100}%`, height:"100%", background:`linear-gradient(90deg,${stage.color},#8b5cf6)`, borderRadius:999, transition:"width 0.7s" }}/>
              </div>
            </div>
          </div>

          {/* Quest management */}
          <div style={{ ...S.card, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:800, color:"#1e1b4b" }}>📝 あしたの クエストせってい</div>
              <button onClick={resetDay} style={{ fontSize:11, padding:"4px 10px", borderRadius:8, border:"1px solid #fca5a5", background:"#fef2f2", color:"#dc2626", cursor:"pointer" }}>🔄 リセット</button>
            </div>
            <button onClick={randomize} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"12px 18px", marginBottom:18, borderRadius:14, border:"2px dashed #f59e0b", background:"linear-gradient(135deg,#fef9ee,#fff7ed)", color:"#b45309", fontWeight:800, fontSize:14, cursor:"pointer", justifyContent:"center" }}>
              <span style={{ fontSize:22 }}>🎲</span>ランダムで せってい する
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14, fontSize:11, color:"#92400e", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"8px 11px", lineHeight:1.6 }}>
              📚 {BAND_LABEL[bandOf(classId)]}むけ　★1 かんたん・★2 チャレンジ・★3 リーダー（むずかしさを えらんで リストから せってい）
            </div>
            {[
              { key:"personal", label:"⭐ じぶんの クエスト" },
              { key:"group",    label:"👫 グループの クエスト" },
              { key:"class",    label:"🏫 クラスの クエスト" },
            ].map(({ key, label }) => {
              const b = bandOf(classId);
              const pool = (QUEST_POOL[b] && QUEST_POOL[b][key] && QUEST_POOL[b][key][difficulty[key]]) || [];
              return (
              <div key={key} style={{ marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, flexWrap:"wrap", gap:8 }}>
                  <label style={{ fontSize:12, fontWeight:700, color:"#4b5563" }}>{label}</label>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ display:"flex", gap:3 }}>
                      {[1,2,3].map(d => (
                        <button key={d} onClick={()=>setDifficulty(s=>({...s,[key]:d}))} title={d===1?"かんたん":d===2?"チャレンジ":"リーダー"}
                          style={{ fontSize:11, padding:"3px 7px", borderRadius:8, cursor:"pointer", border:`1px solid ${difficulty[key]===d?"#f59e0b":"#e5e7eb"}`, background:difficulty[key]===d?"#fff7ed":"#fff", color:difficulty[key]===d?"#b45309":"#9ca3af", fontWeight:700 }}>
                          {"★".repeat(d)}
                        </button>
                      ))}
                    </div>
                    <QuestDropdown pool={pool} onSelect={v=>setNextQuests(q=>({...q,[key]:v}))}/>
                  </div>
                </div>
                <textarea value={nextQuests[key]} onChange={e=>setNextQuests(q=>({...q,[key]:e.target.value}))} rows={2}
                  style={{ width:"100%", borderRadius:10, border:"1.5px solid #e5e7eb", padding:"8px 12px", fontSize:13, resize:"none", fontFamily:"inherit", lineHeight:1.5, boxSizing:"border-box", outline:"none" }}
                  onFocus={e=>e.target.style.borderColor="#8b5cf6"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
              </div>
              );
            })}
            <button onClick={saveNextQuests} style={{ width:"100%", padding:"12px", borderRadius:14, border:"none", background:teacherSaved?"#d1fae5":"linear-gradient(135deg,#6366f1,#8b5cf6)", color:teacherSaved?"#065f46":"#fff", fontWeight:800, fontSize:15, cursor:"pointer", transition:"all 0.3s" }}>
              {teacherSaved?"✅ ほぞんしました！":"💾 あしたの クエストを ほぞんする"}
            </button>
          </div>

          {/* Reward */}
          <div style={S.card}>
            <div style={{ fontSize:14, fontWeight:800, color:"#1e1b4b", marginBottom:4 }}>🏆 ごほうびせってい</div>
            <div style={{ fontSize:11, color:"#9ca3af", marginBottom:10 }}>Lv.5・10・15…と 5のばいすうで じどう ひょうじされます</div>
            <textarea value={reward} onChange={e=>setReward(e.target.value)} onBlur={saveReward} rows={3}
              style={{ width:"100%", borderRadius:10, border:"1.5px solid #e5e7eb", padding:"8px 12px", fontSize:13, resize:"none", fontFamily:"inherit", lineHeight:1.5, boxSizing:"border-box" }}/>
            <div style={{ marginTop:10, padding:"10px 14px", borderRadius:12, background:"#fef9ee", border:"1px solid #fde68a", fontSize:12, color:"#92400e" }}>
              🎁 いまの ごほうび: {reward}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
