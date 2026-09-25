import sys

with open('components/restaurantos/pos/POSWorkspace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        </div>
  
      {/* RIGHT PANEL - CART */}'''
replacement = '''          {/* Mobile Floating Cart Button */}
          {!mobileCartOpen && posLines.length > 0 && (
            <button 
              onClick={() => setMobileCartOpen(true)} 
              className="lg:hidden fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 z-30 animate-in fade-in zoom-in"
            >
              <div className="w-6 h-6 bg-white text-slate-900 rounded-full flex items-center justify-center font-black text-xs">{posLines.length}</div>
              <span className="font-black pr-2">View Cart - {fmt(posTotal)}</span>
            </button>
          )}
        </div>
  
      {/* RIGHT PANEL - CART */}'''

content = content.replace(target, replacement)

with open('components/restaurantos/pos/POSWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
