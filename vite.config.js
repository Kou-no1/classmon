import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages のサブパス配信に対応するため base を設定。
// リポジトリ名が clasmon なら "/clasmon/"。リポジトリ名を変えたらここも変える。
export default defineConfig({
  plugins: [react()],
  base: "/clasmon/",
});
