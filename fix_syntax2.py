import re

with open('components/restaurantos/management/GeneralSettings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's just find and replace the button block
content = re.sub(
    r'<button\s+onClick=\{\(\) => setSettings\(\{ \.\.\.settings, acceptsWalkIns: !settings\.acceptsWalkIns \}\)\}\s+className=\{w-12 h-6 rounded-full transition-colors relative \}\s*>\s*<div className=\{w-4 h-4 bg-white rounded-full absolute top-1 transition-transform \}\s*/>\s*</button>',
    '''<button 
              onClick={() => setSettings({ ...settings, acceptsWalkIns: !settings.acceptsWalkIns })}
              className={w-12 h-6 rounded-full transition-colors relative }
            >
              <div className={w-4 h-4 bg-white rounded-full absolute top-1 transition-transform } />
            </button>''',
    content,
    flags=re.DOTALL
)

with open('components/restaurantos/management/GeneralSettings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
