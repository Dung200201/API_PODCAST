export function detectLanguage(profileLanguage: string | undefined, acceptLangHeader: string | undefined): "vi" | "en" {
    if (profileLanguage === "auto") {
      return (acceptLangHeader || "").toLowerCase().startsWith("vi") ? "vi" : "en";
    }
    return profileLanguage === "en" ? "en" : "vi";
}