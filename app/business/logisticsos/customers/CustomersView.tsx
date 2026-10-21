'use client';

import React, { useState } from 'react';
import { Card, Badge, Button } from '@/components/Shared';
import { UserPlus, PackagePlus, Users, Phone, Mail, MapPin, X, Check, Truck } from 'lucide-react';
import { createLogisticsCustomer, createManualCustomerDelivery } from '@/lib/actions/logistics-customer';

interface CustomersViewProps {
  providerId: string;
  providerName: string;
  initialCustomers: any[];
}

export default function CustomersView({
  providerId,
  providerName,
  initialCustomers,
}: CustomersViewProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Customer State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Booking State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [packageDesc, setPackageDesc] = useState('');
  const [weightKg, setWeightKg] = useState('2.0');
  const [isPriority, setIsPriority] = useState(false);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const newCust = await createLogisticsCustomer({
        providerId,
        firstName,
        lastName,
        phone,
        email: email || undefined,
        notes: notes || undefined,
      });

      setCustomers([{ ...newCust, deliveryCount: 0, createdAt: new Date().toISOString() }, ...customers]);
      setShowAddModal(false);
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setNotes('');
      setMessage({ type: 'success', text: `Customer ${firstName} ${lastName} onboarded successfully!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create customer' });
    } finally {
      setLoading(false);
    }
  };

  const handleBookDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await createManualCustomerDelivery({
        providerId,
        customerDataId: selectedCustomerId || undefined,
        pickup: { address: pickupAddress },
        dropoff: { address: dropoffAddress },
        packageDescription: packageDesc || 'Customer Parcel',
        packageWeightKg: parseFloat(weightKg) || 1.0,
        priority: isPriority,
      });

      setShowBookModal(false);
      setPickupAddress('');
      setDropoffAddress('');
      setPackageDesc('');
      setMessage({
        type: 'success',
        text: `Delivery booked! Tracking Ref: ${res.trackingReference || res.job.id.slice(0, 8)}`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to book delivery' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Management</h1>
          <p className="text-slate-500 mt-1">Provider: <span className="font-semibold text-slate-700">{providerName}</span></p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Add Customer
          </Button>
          <Button variant="primary" onClick={() => setShowBookModal(true)}>
            <PackagePlus className="w-4 h-4 mr-2" /> Book Delivery
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm flex justify-between items-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Customer List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600" />
          Direct Private Customers ({customers.length})
        </h2>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Deliveries</th>
                <th className="px-6 py-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No private customers added yet. Click &quot;Add Customer&quot; to onboard your first client.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {c.phone}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {c.email || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">
                        {c.deliveryCount || 0} shipments
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">
                      {c.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Add Private Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Alice"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="Okon"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+2348000000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="alice@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Internal Notes</label>
                <input
                  type="text"
                  placeholder="Key corporate client or VIP"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Add Customer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Delivery Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Book Shipment for Customer</h3>
              <button onClick={() => setShowBookModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBookDelivery} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="">-- Direct / Guest Booking --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Pickup Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 15 Marian Road, Calabar"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Dropoff Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 42 State Housing Estate, Calabar"
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Package Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Electronics Box"
                    value={packageDesc}
                    onChange={(e) => setPackageDesc(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="2.0"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="priorityCheck"
                  checked={isPriority}
                  onChange={(e) => setIsPriority(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="priorityCheck" className="text-xs font-semibold text-slate-700">
                  Express / Priority Delivery (+ surcharge)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowBookModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Booking...' : 'Create & Price Delivery'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
