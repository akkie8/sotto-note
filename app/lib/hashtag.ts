/**
 * テキストからハッシュタグを抽出する関数
 * 例: "今日は#モヤモヤ な気分 #疲れた" → ["モヤモヤ", "疲れた"]
 */
export function extractHashtags(text: string): string[] {
  // ハッシュタグのパターン: # + 日本語文字、英数字、アンダースコア
  const hashtagRegex = /#([^\s\p{P}]+)/gu;
  const matches = text.match(hashtagRegex);

  if (!matches) return [];

  // # を除去して重複を排除
  const tags = matches
    .map((tag) => tag.replace("#", ""))
    .filter((tag) => tag.length > 0)
    .filter((tag, index, array) => array.indexOf(tag) === index); // 重複排除

  return tags;
}

/**
 * タグの配列を文字列に変換（データベース保存用）
 */
export function tagsToString(tags: string[]): string {
  return tags.join(",");
}

/**
 * 文字列をタグの配列に変換（データベースから読み込み用）
 */
export function stringToTags(tagString: string): string[] {
  if (!tagString || tagString.trim() === "") return [];
  return tagString.split(",").filter((tag) => tag.trim() !== "");
}

/**
 * タグが含まれているかチェック
 */
export function containsHashtags(text: string): boolean {
  return /#[^\s\p{P}]+/gu.test(text);
}

/**
 * プリセットタグのリスト
 */
export const PRESET_TAGS = [
  "モヤモヤ",
  "疲れた",
  "うれしい",
  "感謝",
  "不安",
  "楽しい",
  "悲しい",
  "怒り",
  "ストレス",
  "リラックス",
  "仕事",
  "プライベート",
  "家族",
  "友人",
  "健康",
  "成長",
  "挑戦",
  "反省",
  "希望",
  "達成感",
];

/**
 * ユーザーの過去のタグを取得する（重複除去・頻度順）
 */
export function getUserTags(journals: Array<{ tags?: string }>): string[] {
  const tagCounts = new Map<string, number>();

  journals.forEach((journal) => {
    if (journal.tags) {
      const tags = stringToTags(journal.tags);
      tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    }
  });

  // 頻度順にソートして返す
  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}

/**
 * 推奨タグを取得（ベースタグ + ユーザーの過去タグ）
 */
export function getSuggestedTags(
  userTags: string[],
  baseTags?: string[]
): string[] {
  const result: string[] = [];
  const used = new Set<string>();

  // 1. ベースタグを最初に追加
  const defaultTags = baseTags && baseTags.length > 0 ? baseTags : PRESET_TAGS;
  defaultTags.forEach((tag) => {
    if (result.length < 15) {
      result.push(tag);
      used.add(tag);
    }
  });

  // 2. ユーザーの過去タグを追加（ベースタグと重複しないもの）
  userTags.forEach((tag) => {
    if (!used.has(tag) && result.length < 15) {
      result.push(tag);
      used.add(tag);
    }
  });

  return result;
}

/**
 * テキストから自動抽出したタグと手動選択タグを統合
 */
export function mergeTags(content: string, manualTags: string[]): string[] {
  const autoTags = extractHashtags(content);
  const mergedTags = new Set<string>();

  // 自動抽出タグを追加
  autoTags.forEach((tag) => mergedTags.add(tag));

  // 手動選択タグを追加
  manualTags.forEach((tag) => mergedTags.add(tag));

  return Array.from(mergedTags);
}

/**
 * 手動選択タグのみを取得（自動抽出タグを除外）
 */
export function getManualTags(allTags: string[], content: string): string[] {
  const autoTags = extractHashtags(content);
  return allTags.filter((tag) => !autoTags.includes(tag));
}
