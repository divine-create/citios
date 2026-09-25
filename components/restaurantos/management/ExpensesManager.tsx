'use client';

import React, { useState } from 'react';
import { Button, Input, Badge } from '@/components/ui';
import { Plus, CreditCard, Tag, FileText, Search } from 'lucide-react';
import { addExpense } from '@/lib/actions/restaurantos';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatNaira } from '@/lib/utils';

export function ExpensesManager({
  organizationId,
  locationId,
  initialExpenses
}: {
  organizationId: string;
  locationId?: string;
  initialExpenses: any[];
}) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [isCreating, setIsCreating] = useState(false);
  
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const handleAddExpense = async () => {
    if (amount <= 0) return toast.error('Amount must be greater than zero');
    if (!category.trim()) return toast.error('Category is required');

    setLoading(true);
    const res = await addExpense({
      organizationId,
      locationId,
      amount,
      category,
      note
    });
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Expense recorded successfully');
      setExpenses([res, ...expenses]);
      setIsCreating(false);
      setAmount(0);
      setCategory('');
      setNote('');
      router.refresh();
    }
  };

  const filtered = expenses.filter((e: any) => 
    e.category.toLowerCase().includes(search.toLowerCase()) || 
    (e.note && e.note.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search expenses..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <Button onClick={() => setIsCreating(true)} leftIcon={<Plus size={16} />}>
          Record Expense
        </Button>
      </div>

      {isCreating && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input 
            label="Amount" 
            type="number" 
            min={0} 
            value={amount} 
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            leftIcon={<span className="text-slate-400 font-black">₦</span>}
          />
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
            <input 
              type="text" 
              placeholder="e.g. Supplies, Maintenance" 
              list="expense-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <datalist id="expense-categories">
              <option value="Supplies" />
              <option value="Maintenance" />
              <option value="Marketing" />
              <option value="Payroll" />
              <option value="Utilities" />
              <option value="Logistics" />
              <option value="Miscellaneous" />
            </datalist>
          </div>
          <Input 
            label="Note" 
            placeholder="Details about the expense" 
            value={note} 
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="col-span-full flex gap-2 justify-end mt-2">
            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleAddExpense} isLoading={loading}>Save Expense</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Date & Time</th>
              <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Category</th>
              <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Note</th>
              <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-slate-500 font-medium">
                  {search ? 'No expenses match your search.' : 'No expenses recorded yet.'}
                </td>
              </tr>
            ) : (
              filtered.map(expense => (
                <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-900">
                      {new Date(String(expense.spentAt)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {new Date(String(expense.spentAt)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="teal">{expense.category}</Badge>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {expense.note || <span className="italic text-slate-400">None</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="font-black text-rose-600">
                      -{formatNaira(expense.amount)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
