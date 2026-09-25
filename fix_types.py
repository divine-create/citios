import re

with open("types/next-auth.d.ts", "r", encoding="utf-8") as f:
    c = f.read()

c = re.sub(
    r'(onboardingComplete\?: boolean;)',
    r'\1\n      isSystemAdmin?: boolean;',
    c
)

with open("types/next-auth.d.ts", "w", encoding="utf-8") as f:
    f.write(c)
