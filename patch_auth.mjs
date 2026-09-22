import fs from "fs";
let s = fs.readFileSync("lib/auth.ts", "utf8");
s = s.replace('async authorize(credentials: Record<string, string> | undefined) { {', 'async authorize(credentials: Record<string, string> | undefined) {');
fs.writeFileSync("lib/auth.ts", s);
