import sys

with open('components/restaurantos/management/MenuManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''<Input label="Description (Optional)" value={newItem.description} onChange={(e: any) => setNewItem({...newItem, description: e.target.value})} />
          </div>'''

replacement = '''<Input label="Description (Optional)" value={newItem.description} onChange={(e: any) => setNewItem({...newItem, description: e.target.value})} />
            <Input label="Image URL (Optional)" value={(newItem as any).imageUrl || ''} onChange={(e: any) => setNewItem({...newItem, imageUrl: e.target.value} as any)} />
          </div>'''

content = content.replace(target, replacement)

target2 = '''      price: parseFloat(newItem.price),
      category: newItem.category
    });'''

replacement2 = '''      price: parseFloat(newItem.price),
      category: newItem.category,
      imageUrl: (newItem as any).imageUrl || undefined
    });'''

content = content.replace(target2, replacement2)

with open('components/restaurantos/management/MenuManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
