import sys

with open('components/restaurantos/management/MenuManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''  const handleToggleAvailable = async (id: string, currentlyAvailable: boolean) => {
    await toggleMenuItemAvailability(id);
    router.refresh();
  };'''

replacement = '''  const handleToggleAvailable = async (id: string, currentlyAvailable: boolean) => {
    await toggleMenuItemAvailability(id);
    router.refresh();
  };

  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category: '' });

  const handleCreate = async () => {
    if (!newItem.name || !newItem.price || !newItem.category) {
      return toast.error("Name, price, and category are required");
    }
    setLoading(true);
    const res: any = await createMenuItem({
      organizationId: slug,
      name: newItem.name,
      description: newItem.description,
      price: parseFloat(newItem.price),
      category: newItem.category
    });
    setLoading(false);
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Menu item created!");
      setIsCreating(false);
      setNewItem({ name: '', description: '', price: '', category: '' });
      router.refresh();
    }
  };'''

content = content.replace(target, replacement)

with open('components/restaurantos/management/MenuManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
