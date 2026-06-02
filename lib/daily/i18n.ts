const dict = {
  // AuthModal
  "auth.subtitle": { ja: "メンバー登録で5回無料生成", en: "Sign up for 5 free generations" },
  "auth.benefit1": { ja: "5回無料で IMPLANT 生成", en: "5 free IMPLANT generations" },
  "auth.benefit2": { ja: "高解像度エクスポート", en: "High-resolution export" },
  "auth.benefit3": { ja: "生成履歴の管理", en: "Generation history" },
  "auth.signInButton": { ja: "GOOGLE でサインイン", en: "SIGN IN WITH GOOGLE" },
  "auth.signingIn": { ja: "サインイン中...", en: "SIGNING IN..." },
  "auth.error": { ja: "サインインに失敗しました", en: "Sign-in failed" },

  // ImplantModal
  "implant.remaining": { ja: "残り {{n}} 回", en: "{{n}} REMAINING" },
  "implant.noRemaining": { ja: "クレジットがありません", en: "NO CREDITS" },
  "implant.signUpMore": { ja: "登録して無料生成", en: "SIGN UP FOR MORE" },
  "implant.connectionError": { ja: "接続エラー。もう一度お試しください。", en: "Connection error. Please try again." },

  // CreditSheet
  "credits.perGeneration": { ja: "/生成", en: "/generation" },

  // Billing
  "billing.noCredits": { ja: "クレジットが不足しています", en: "No credits remaining" },

  // Grid
  "grid.tryOn": { ja: "INJECT", en: "INJECT" },

  // ImplantModal - camera
  "implant.selfie": { ja: "📸 セルフィーを撮る", en: "📸 TAKE A SELFIE" },
  "implant.yourPhoto": { ja: "+ あなたの写真", en: "+ YOUR PHOTO" },
  "implant.photoLoaded": { ja: "写真をセット済み", en: "PHOTO LOADED" },
} as const;

type Key = keyof typeof dict;

function getLocale(): "ja" | "en" {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.startsWith("ja") ? "ja" : "en";
}

export function t(key: Key, vars?: Record<string, string | number>): string {
  const locale = getLocale();
  let text: string = dict[key]?.[locale] || dict[key]?.en || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{{${k}}}`, String(v));
    }
  }
  return text;
}
