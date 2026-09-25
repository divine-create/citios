import sys

with open('components/restaurantos/management/MenuManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''<Button leftIcon={<Plus size={16} />}>Create Menu Item</Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">'''

replacement = '''<Button onClick={() => setIsCreating(true)} leftIcon={<Plus size={16} />}>Create Menu Item</Button>
      </div>

      {isCreating && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Create New Item</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Input label="Name" value={newItem.name} onChange={(e: any) => setNewItem({...newItem, name: e.target.value})} />
            <Input label="Category (e.g. Mains, Drinks)" value={newItem.category} onChange={(e: any) => setNewItem({...newItem, category: e.target.value})} list="cat-list" />
            <datalist id="cat-list">
              {categories.map((c: any) => <option key={c} value={c} />)}
            </datalist>
            <Input label="Price (₦)" type="number" value={newItem.price} onChange={(e: any) => setNewItem({...newItem, price: e.target.value})} />
            <Input label="Description (Optional)" value={newItem.description} onChange={(e: any) => setNewItem({...newItem, description: e.target.value})} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={loading}>Save Item</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">'''

content = content.replace(target, replacement)

with open('components/restaurantos/management/MenuManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
